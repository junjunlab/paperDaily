/**
 * 中文翻译。三条通道，优先级从高到低：
 *   1) 用户自己配的 OpenAI 兼容接口 —— 质量最好
 *   2) 腾讯交互翻译（transmart.qq.com）—— 免密钥、一次请求可批量、国内可直连
 *   3) MyMemory —— 免密钥兜底，有每日字符配额
 * 独立 App 没有小程序那套云端模型，所以必须有一条「什么都不用配」的默认路径。
 */
import { Platform } from 'react-native'
import { mapLimit } from './http'
import type { Prefs } from '../types'

export const hasOwnKey = (p: Prefs) => !!(p.translateBaseUrl.trim() && p.translateKey.trim())
/** 永远可用：没配 Key 也走内置通道 */
export const translateReady = (_p?: Prefs) => true
export const providerLabel = (p: Prefs) => (hasOwnKey(p) ? 'llm' : 'builtin')

/** 列表自动翻译的条数上限：腾讯通道一次能翻一批，40 条约两次请求 */
export const LIST_TRANSLATE_LIMIT = 40

type Progress = (partial: string[]) => void

// ---------------------------------------------------------------- LLM 通道

const endpoint = (base: string) => {
  const b = base.trim().replace(/\/+$/, '')
  return /\/chat\/completions$/.test(b) ? b : b + '/chat/completions'
}

const PROMPT =
  '你是学术论文翻译。把用户给的英文内容翻译成简体中文，要求：' +
  '术语准确、保留基因名/蛋白名/单位/数字原样、不加解释、不扩写、不总结。只输出译文。'

async function chat(prefs: Prefs, content: string, maxTokens = 1200): Promise<string> {
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), 45000)
  try {
    const res = await fetch(endpoint(prefs.translateBaseUrl), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer ' + prefs.translateKey.trim(),
      },
      body: JSON.stringify({
        model: prefs.translateModel.trim() || 'gpt-4o-mini',
        temperature: 0.2,
        max_tokens: maxTokens,
        messages: [
          { role: 'system', content: PROMPT },
          { role: 'user', content },
        ],
      }),
      signal: ctrl.signal,
    })
    if (!res.ok) throw new Error('HTTP ' + res.status)
    const data = await res.json()
    const text = data?.choices?.[0]?.message?.content
    return String(text || '').trim()
  } finally {
    clearTimeout(timer)
  }
}

/** LLM 批量：编号回填，避免模型把顺序打乱 */
async function llmBatch(prefs: Prefs, texts: string[], onProgress?: Progress): Promise<string[]> {
  const out = new Array(texts.length).fill('')
  const CHUNK = 12
  for (let i = 0; i < texts.length; i += CHUNK) {
    const slice = texts.slice(i, i + CHUNK)
    const payload = slice.map((t, idx) => `${idx + 1}. ${t.replace(/\n/g, ' ')}`).join('\n')
    try {
      const text = await chat(
        prefs,
        '逐条翻译下面的内容，按「序号. 译文」一行一条输出，序号与原文一致，不要合并或拆分条目：\n' + payload,
      )
      text.split('\n').forEach((line) => {
        const m = line.match(/^\s*(\d+)[.、)]\s*(.+)$/)
        if (!m) return
        const idx = Number(m[1]) - 1
        if (idx >= 0 && idx < slice.length) out[i + idx] = m[2].trim()
      })
      onProgress?.([...out])
    } catch {
      /* 这一批失败就留空，界面保持英文 */
    }
  }
  return out
}

// ------------------------------------------------- 腾讯交互翻译（首选内置）

/**
 * 原生 App 直连腾讯；Web 预览走 Metro 中间件代理（/__tx），
 * 因为 transmart 不给 CORS 头，浏览器直连会被拦。代理只在开发环境存在，
 * 打包后的原生 App 走直连，不受影响。
 */
const TRANSMART = Platform.OS === 'web' ? '/__tx' : 'https://transmart.qq.com/api/imt'
/** 网页端使用的客户端指纹，固定即可 */
const CLIENT_KEY = 'browser-chrome-141.0.0-Windows-10-4f3a1c2e-9b7d-4c1e-8f2a-1d3e5b7c9a2f-1700000000000'
const TX_MAX_ITEMS = 20
const TX_MAX_CHARS = 2600

/**
 * 腾讯交互翻译：一次请求提交多条 text_list，按原序返回。
 * 免密钥、实测连发不限流，但接口未公开承诺稳定性，所以后面留了兜底。
 */
async function transmartBatch(texts: string[], onProgress?: Progress): Promise<string[]> {
  const out = new Array(texts.length).fill('')
  if (!texts.length) return out

  const chunks: { start: number; items: string[] }[] = []
  let i = 0
  while (i < texts.length) {
    let j = i
    let chars = 0
    while (j < texts.length && j - i < TX_MAX_ITEMS && chars + texts[j].length <= TX_MAX_CHARS) {
      chars += texts[j].length
      j += 1
    }
    if (j === i) j = i + 1
    chunks.push({ start: i, items: texts.slice(i, j) })
    i = j
  }

  await mapLimit(chunks, 2, async ({ start, items }) => {
    const ctrl = new AbortController()
    const timer = setTimeout(() => ctrl.abort(), 20000)
    try {
      const res = await fetch(TRANSMART, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          header: { fn: 'auto_translation', client_key: CLIENT_KEY },
          type: 'plain',
          model_category: 'normal',
          source: { lang: 'en', text_list: items },
          target: { lang: 'zh' },
        }),
        signal: ctrl.signal,
      })
      const data = await res.json()
      const list: string[] = (data && data.auto_translation) || []
      if (list.length === items.length) {
        list.forEach((t, k) => {
          out[start + k] = String(t || '').trim()
        })
      }
      // 条数对不上就留空，交给后面的兜底通道
    } catch {
      /* 网络失败：留空走兜底 */
    } finally {
      clearTimeout(timer)
    }
    onProgress?.([...out])
  })

  return out
}

// ------------------------------------------- MyMemory（兜底，有每日配额）

const FREE = 'https://api.mymemory.translated.net/get'
const FREE_MAX_ITEMS = 8
const FREE_MAX_CHARS = 460
const FREE_CONCURRENCY = 3

let myMemoryQuotaHit = false
export const freeQuotaExhausted = () => myMemoryQuotaHit

async function myMemoryBatch(texts: string[], onProgress?: Progress): Promise<string[]> {
  const out = new Array(texts.length).fill('')
  if (!texts.length || myMemoryQuotaHit) return out

  const chunks: { start: number; items: string[] }[] = []
  let i = 0
  while (i < texts.length) {
    let j = i
    let chars = 0
    while (j < texts.length && j - i < FREE_MAX_ITEMS && chars + texts[j].length <= FREE_MAX_CHARS) {
      chars += texts[j].length + 1
      j += 1
    }
    if (j === i) j = i + 1
    chunks.push({ start: i, items: texts.slice(i, j) })
    i = j
  }

  await mapLimit(chunks, FREE_CONCURRENCY, async ({ start, items }) => {
    if (myMemoryQuotaHit) return
    try {
      const url = `${FREE}?q=${encodeURIComponent(items.join('\n'))}&langpair=${encodeURIComponent('en|zh-CN')}`
      const data = await (await fetch(url)).json()
      const status = Number(data?.responseStatus)
      const raw = String(data?.responseData?.translatedText || '')
      const lines = raw.split('\n')

      if (status === 200 && lines.length === items.length) {
        lines.forEach((line, k) => {
          out[start + k] = line.trim()
        })
      } else if (status === 200 && items.length === 1) {
        out[start] = raw.trim()
      } else if (status === 200) {
        for (let k = 0; k < items.length; k += 1) {
          const one = await myMemoryOne(items[k])
          if (!one) break
          out[start + k] = one
        }
      }
      // 超额：403/429，或返回体里塞了 WARNING 文案
      if (status === 403 || status === 429 || /USED ALL AVAILABLE FREE TRANSLATIONS/i.test(raw)) {
        myMemoryQuotaHit = true
      }
      if (data?.quotaFinished) myMemoryQuotaHit = true
    } catch {
      /* 抖动：留空 */
    }
    onProgress?.([...out])
  })

  return out
}

async function myMemoryOne(text: string): Promise<string> {
  if (!text.trim() || myMemoryQuotaHit) return ''
  try {
    const url = `${FREE}?q=${encodeURIComponent(text)}&langpair=${encodeURIComponent('en|zh-CN')}`
    const data = await (await fetch(url)).json()
    if (Number(data?.responseStatus) === 200) return String(data?.responseData?.translatedText || '').trim()
    return ''
  } catch {
    return ''
  }
}

// ------------------------------------------------------------------ 对外

/** 批量翻译（标题用）。返回与入参等长数组，翻不出来的位置是空串 */
export async function translateTitles(prefs: Prefs, texts: string[], onProgress?: Progress): Promise<string[]> {
  if (!texts.length) return []
  const clean = texts.map((t) => String(t || '').replace(/\s+/g, ' ').trim())
  if (hasOwnKey(prefs)) return llmBatch(prefs, clean, onProgress)

  const out = await transmartBatch(clean, onProgress)
  const holes = out.map((t, i) => (t ? -1 : i)).filter((i) => i >= 0) as number[]
  if (holes.length) {
    const filled = await myMemoryBatch(holes.map((i) => clean[i]))
    filled.forEach((t, k) => {
      if (t) out[holes[k]] = t
    })
    onProgress?.([...out])
  }
  return out
}

/** 单条翻译（摘要用） */
export async function translateOne(prefs: Prefs, text: string): Promise<string> {
  const src = String(text || '').trim()
  if (!src) return ''
  if (hasOwnKey(prefs)) {
    try {
      return await chat(prefs, src, 1600)
    } catch {
      return ''
    }
  }

  const parts = splitByLength(src, 2400)
  const zh = await transmartBatch(parts)
  if (zh.some(Boolean)) return zh.join(' ')

  const fallback = await myMemoryBatch(splitByLength(src, 400))
  return fallback.filter(Boolean).join(' ')
}

function splitByLength(text: string, max: number): string[] {
  if (text.length <= max) return [text]
  const sentences = text.split(/(?<=[.!?。！？])\s+/)
  const out: string[] = []
  let buf = ''
  for (const s of sentences) {
    if ((buf + ' ' + s).trim().length > max && buf) {
      out.push(buf.trim())
      buf = s
    } else {
      buf = (buf + ' ' + s).trim()
    }
  }
  if (buf) out.push(buf.trim())
  return out
}

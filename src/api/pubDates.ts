/**
 * 真实「上线日期」补全。
 *
 * 背景：Cell / Cell Reports 等刊在 Crossref 里 published 只到年月（2026-11），
 * 而 created 是元数据入库日（往往晚 1 天，如官网 Published online 11-13、created 11-14）。
 *
 * 数据源可信度（实测）：
 *   1) PubMed ArticleDate —— 最准，与官网 Published online 一致；
 *   2) Semantic Scholar publicationDate —— 部分准，但常返回月初占位(11-01)或未来日期，需严格校验；
 *   3) 都不行就保留 Crossref created（至少是真实入库日，不会是月初占位/未来）。
 */
import { loadPubDates, savePubDates } from '../store/storage'
import { fetchPubmedArticleDate } from './pubmed'

const S2 = 'https://api.semanticscholar.org/graph/v1/paper/DOI:'
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

export type DateMeta = { doi: string; pubYm: string; created: string }
let memory: Record<string, string> | null = null

async function ensureMemory() {
  if (memory) return memory
  memory = await loadPubDates()
  return memory!
}

const today = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
/** 日期差（天） */
const diffDays = (a: string, b: string) =>
  Math.abs(new Date(a + 'T00:00:00Z').getTime() - new Date(b + 'T00:00:00Z').getTime()) / 86400000

/** S2 日期可信度校验：月初占位、未来、跨月、与 created 差太远都拒收 */
function credibleS2(date: string, meta: DateMeta): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return false
  if (date > today()) return false // 未来日期（S2 偶发）
  if (date.endsWith('-01')) return false // 月初占位：S2 只有年月时补 01
  if (meta.pubYm && !date.startsWith(meta.pubYm)) return false // 必须落在 published 的年月内
  if (meta.created && diffDays(date, meta.created) > 10) return false // 与入库日差太远
  return true
}

async function queryOne(meta: DateMeta, retry = 2): Promise<string> {
  // 首选 PubMed（准确）
  const pm = await fetchPubmedArticleDate(meta.doi)
  if (pm) return pm

  // 兜底 S2（带校验）
  for (let i = 0; i < retry; i += 1) {
    try {
      const ctrl = new AbortController()
      const timer = setTimeout(() => ctrl.abort(), 6000)
      let res: Response
      try {
        // DOI 里的斜杠在 URL path 合法，不能 encode（%2F 会被拒）
        res = await fetch(S2 + meta.doi + '?fields=publicationDate', { signal: ctrl.signal })
      } finally {
        clearTimeout(timer)
      }
      if (res.status === 429 || res.status === 504) {
        await sleep(1200 * (i + 1))
        continue
      }
      if (!res.ok) return ''
      const data = await res.json()
      const d = String((data && data.publicationDate) || '')
      return credibleS2(d, meta) ? d : ''
    } catch {
      await sleep(800 * (i + 1))
    }
  }
  return ''
}

/** 批量补全。只查缓存里没有的，并发 2。返回本次拿到的映射。 */
export async function fillPubDates(items: DateMeta[]): Promise<Record<string, string>> {
  const cache = await ensureMemory()
  const queue = items.filter((m) => m.doi && !cache[m.doi])
  const got: Record<string, string> = {}
  if (!queue.length) return got

  let idx = 0
  const worker = async () => {
    while (idx < queue.length) {
      const meta = queue[idx++]
      const date = await queryOne(meta)
      if (date) {
        cache[meta.doi] = date
        got[meta.doi] = date
      }
      await sleep(300)
    }
  }
  await Promise.all([worker(), worker()])

  if (Object.keys(got).length) {
    const latest = await loadPubDates()
    await savePubDates({ ...latest, ...got })
  }
  return got
}

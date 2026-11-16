/**
 * Graphical Abstract（图形摘要）取 URL。
 *
 * 现实：只有 Elsevier 系（Cell / Cell Reports / Lancet…）在 ars.els-cdn.com 放了规范图摘，
 * URL 规则 `1-s2.0-<PII>-ga1.jpg`；Nature / Science 没有对应规则，直接跳过。
 * PII 要查 Crossref 单条记录的 link / alternative-id 才能拿到。
 *
 * 是否真的有图摘不由这里判断 —— 交给 <Image onError>：加载失败就隐藏，
 * 零额外 HEAD 请求，也自然满足「有就加、没有就算了」。
 */
import { getJson } from './http'

const cache = new Map<string, string>() // doi -> url（空串表示查过但没有）

/** 从 Crossref 记录里挖 Elsevier PII */
function extractPii(m: any): string {
  const links = Array.isArray(m && m.link) ? m.link : []
  for (const l of links) {
    const u = String((l && l.URL) || '')
    const hit = u.match(/PII[:/=]([A-Z0-9]{17,18})/i)
    if (hit) return hit[1].toUpperCase()
  }
  const alts = Array.isArray(m && m['alternative-id']) ? m['alternative-id'] : []
  for (const a of alts) {
    const s = String(a || '').toUpperCase()
    if (/^[A-Z0-9]{17,18}$/.test(s)) return s
  }
  return ''
}

/**
 * 返回图形摘要图片 URL；不是 Elsevier 刊或取不到 PII 时返回空串。
 * 不去探测图片是否真的存在（交给 Image onError）。
 */
export async function graphicalAbstractUrl(doi: string): Promise<string> {
  const key = String(doi || '').toLowerCase()
  if (!/^10\.1016\//.test(key)) return ''
  if (cache.has(key)) return cache.get(key) || ''

  let url = ''
  try {
    const m = (await getJson('https://api.crossref.org/works/' + encodeURIComponent(key) + '?mailto=paperdaily@example.com'))?.message
    const pii = extractPii(m)
    if (pii) url = `https://ars.els-cdn.com/content/image/1-s2.0-${pii}-ga1.jpg`
  } catch {
    /* 取不到就算了 */
  }
  cache.set(key, url)
  return url
}

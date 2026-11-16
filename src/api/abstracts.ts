/**
 * 摘要补全链：Crossref 没有时依次找 Europe PMC → OpenAlex → Semantic Scholar。
 * 刚上线的论文往往三个源都没有（索引有 1~3 天滞后），这时返回空，由界面引导去原文。
 */
import { getJson } from './http'
import { fetchAbstract } from './europepmc'
import { fetchPubmedAbstract } from './pubmed'

export type AbstractSource = 'europepmc' | 'pubmed' | 'openalex' | 'semanticscholar' | 'publisher' | ''

export type AbstractResult = { text: string; source: AbstractSource }

/** OpenAlex 的摘要是倒排索引 {word: [位置...]}，按位置还原成句子 */
function fromInvertedIndex(idx: Record<string, number[]> | null | undefined): string {
  if (!idx) return ''
  const slots: string[] = []
  Object.keys(idx).forEach((word) => {
    ;(idx[word] || []).forEach((pos) => {
      slots[pos] = word
    })
  })
  return slots.filter(Boolean).join(' ')
}

const clean = (text: string) =>
  String(text || '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

export async function resolveAbstract(doi: string): Promise<AbstractResult> {
  if (!doi) return { text: '', source: '' }

  const epmc = await fetchAbstract(doi).catch(() => '')
  if (epmc) return { text: epmc, source: 'europepmc' }

  // 生物医学刊通常当天就进 PubMed，比 OpenAlex / S2 快
  const pm = await fetchPubmedAbstract(doi).catch(() => '')
  if (pm) return { text: pm, source: 'pubmed' }

  try {
    const data = await getJson('https://api.openalex.org/works/doi:' + encodeURIComponent(doi))
    const text = clean(fromInvertedIndex(data && data.abstract_inverted_index))
    if (text) return { text, source: 'openalex' }
  } catch {
    /* 这家没有就往下走 */
  }

  try {
    const data = await getJson(
      'https://api.semanticscholar.org/graph/v1/paper/DOI:' + encodeURIComponent(doi) + '?fields=abstract',
    )
    const text = clean(data && data.abstract)
    if (text) return { text, source: 'semanticscholar' }
  } catch {
    /* 同上 */
  }

  const fromPublisher = await publisherAbstract(doi).catch(() => '')
  if (fromPublisher) return { text: fromPublisher, source: 'publisher' }

  return { text: '', source: '' }
}

/**
 * 最后一级兜底：直接读出版社页面里的摘要。
 * 只对 Nature 系（10.1038）开启 —— nature.com 不拦服务端请求，
 * 且页面 <meta name="dc.description"> 就是干净摘要。
 * Science / Cell 那边有 Cloudflare 或整页渲染，不在此列。
 * 注意：Web 端会被 CORS 挡住，真机（React Native）正常。
 */
async function publisherAbstract(doi: string): Promise<string> {
  if (!/^10\.1038\//.test(doi)) return ''
  const suffix = doi.replace(/^10\.1038\//, '')
  if (!suffix) return ''

  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), 12000)
  try {
    const res = await fetch('https://www.nature.com/articles/' + encodeURIComponent(suffix), {
      headers: { 'User-Agent': 'paperdaily/1.0 (academic reader)' },
      signal: ctrl.signal,
    })
    if (!res.ok) return ''
    const html = await res.text()
    const meta =
      html.match(/<meta[^>]+name="dc\.description"[^>]+content="([^"]{60,})"/i) ||
      html.match(/<div[^>]+id="Abs1-content"[^>]*>([\s\S]{80,4000}?)<\/div>/i)
    return meta ? clean(meta[1].replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))) : ''
  } finally {
    clearTimeout(timer)
  }
}

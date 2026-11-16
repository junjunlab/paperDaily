/**
 * PubMed（NCBI eutils）补摘要。
 * 生物医学类期刊当天基本都会进 PubMed，比 Europe PMC 快一步；
 * 观点/评论类文章 PubMed 里也不会有 AbstractText，返回空是正常结果。
 * 接口无需 key，且带 Access-Control-Allow-Origin，浏览器端也能用。
 */
import { HttpError } from './http'

const BASE = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils'
const TIMEOUT = 12000

async function text(url: string): Promise<string> {
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT)
  try {
    const res = await fetch(url, { signal: ctrl.signal })
    if (!res.ok) throw new HttpError('HTTP ' + res.status, res.status)
    return await res.text()
  } finally {
    clearTimeout(timer)
  }
}

async function textJson(url: string): Promise<any> {
  const raw = await text(url)
  try {
    return JSON.parse(raw)
  } catch {
    return null
  }
}

const decode = (s: string) =>
  String(s || '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#x?[0-9a-f]+;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim()

/**
 * PubMed 的 ArticleDate（电子发表日），比 Crossref created（元数据入库日）准，
 * 也比 Semantic Scholar 的 publicationDate 可靠（后者常返回月初占位或未来日期）。
 * 返回 yyyy-mm-dd，没有就空串。
 */
export async function fetchPubmedArticleDate(doi: string): Promise<string> {
  if (!doi) return ''
  try {
    const search = await textJson(
      `${BASE}/esearch.fcgi?db=pubmed&term=${encodeURIComponent(doi + '[doi]')}&retmode=json`,
    )
    const ids: string[] = (search && search.esearchresult && search.esearchresult.idlist) || []
    if (!ids.length) return ''

    const xml = await text(`${BASE}/efetch.fcgi?db=pubmed&id=${ids[0]}&retmode=xml`)
    // ArticleDate 是电子发表日，Month 是两位数字
    const ad = xml.match(
      /<ArticleDate[^>]*>[\s\S]*?<Year>(\d{4})<\/Year>[\s\S]*?<Month>(\d{1,2})<\/Month>[\s\S]*?<Day>(\d{1,2})<\/Day>/,
    )
    if (ad) {
      const d = `${ad[1]}-${String(ad[2]).padStart(2, '0')}-${String(ad[3]).padStart(2, '0')}`
      if (/^\d{4}-\d{2}-\d{2}$/.test(d)) return d
    }
    // 没有 ArticleDate 时退回 PubDate（月份是英文缩写）
    const pd = xml.match(
      /<PubDate>[\s\S]*?<Year>(\d{4})<\/Year>[\s\S]*?<Month>([A-Za-z]{3})<\/Month>[\s\S]*?<Day>(\d{1,2})<\/Day>/,
    )
    if (pd) {
      const months: Record<string, string> = {
        Jan: '01', Feb: '02', Mar: '03', Apr: '04', May: '05', Jun: '06',
        Jul: '07', Aug: '08', Sep: '09', Oct: '10', Nov: '11', Dec: '12',
      }
      const mm = months[pd[2]]
      if (mm) return `${pd[1]}-${mm}-${String(pd[3]).padStart(2, '0')}`
    }
    return ''
  } catch {
    return ''
  }
}

export async function fetchPubmedAbstract(doi: string): Promise<string> {
  if (!doi) return ''
  try {
    const search = await textJson(
      `${BASE}/esearch.fcgi?db=pubmed&term=${encodeURIComponent(doi + '[doi]')}&retmode=json`,
    )
    const ids: string[] = (search && search.esearchresult && search.esearchresult.idlist) || []
    if (!ids.length) return ''

    const xml = await text(`${BASE}/efetch.fcgi?db=pubmed&id=${ids[0]}&retmode=xml`)
    const parts = [...xml.matchAll(/<AbstractText[^>]*>([\s\S]*?)<\/AbstractText>/g)].map((m) => decode(m[1]))
    const merged = parts.filter(Boolean).join(' ').trim()
    return merged.length > 40 ? merged : ''
  } catch {
    return ''
  }
}

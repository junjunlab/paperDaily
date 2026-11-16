/** Europe PMC 补摘要：Crossref 没有 abstract 的刊，这里大多能补上 */
import { getJson, mapLimit } from './http'

type EpResult = { abstractText?: string; title?: string }

const BASE = 'https://www.ebi.ac.uk/europepmc/webservices/rest/search'

export async function fetchAbstract(doi: string): Promise<string> {
  if (!doi) return ''
  const url =
    `${BASE}?query=${encodeURIComponent('DOI:"' + doi + '"')}&resultType=core&format=json&pageSize=1`
  const data = await getJson(url)
  const list = (data && data.resultList && data.resultList.result) || []
  const hit: EpResult = list[0] || {}
  const raw = String(hit.abstractText || '')
  return raw
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/** 批量补摘要：并发 3，单条失败不影响其它（缺摘要不是错误） */
export async function fetchAbstracts(dois: string[]): Promise<Record<string, string>> {
  const uniq = Array.from(new Set(dois.filter(Boolean)))
  const out: Record<string, string> = {}
  await mapLimit(uniq, 3, async (doi) => {
    try {
      out[doi] = await fetchAbstract(doi)
    } catch {
      out[doi] = ''
    }
  })
  return out
}

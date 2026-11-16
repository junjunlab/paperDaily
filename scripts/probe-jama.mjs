/** 查一篇 JAMA 文章的摘要到底在哪：Crossref / EPMC / OpenAlex / S2 / 出版社页面 */
const TITLE = 'Tale of Two Estimands'
const MAILTO = 'paperdaily@example.com'

const j = async (u, opt) => {
  const r = await fetch(u, opt)
  return { status: r.status, data: await r.json().catch(() => null) }
}

const main = async () => {
  const q = await j(
    'https://api.crossref.org/works?query.bibliographic=' + encodeURIComponent(TITLE) +
      '&rows=3&select=DOI,title,type,abstract,container-title,published&mailto=' + MAILTO,
  )
  const items = (q.data && q.data.message && q.data.message.items) || []
  console.log('Crossref 命中', items.length)
  let target = null
  items.forEach((it) => {
    const t = (it.title || [])[0] || ''
    console.log('  -', it.DOI, '|', it.type, '| abstract:', it.abstract ? it.abstract.length : '无', '|', t.slice(0, 60))
    if (!target && new RegExp(TITLE, 'i').test(t)) target = it
  })
  if (!target) target = items[0]
  if (!target) return
  const doi = target.DOI
  console.log('\n目标 DOI:', doi, '| 类型:', target.type)

  const ep = await j(
    'https://www.ebi.ac.uk/europepmc/webservices/rest/search?query=' +
      encodeURIComponent('DOI:"' + doi + '"') + '&resultType=core&format=json&pageSize=1',
  )
  const er = ep.data && ep.data.resultList && ep.data.resultList.result && ep.data.resultList.result[0]
  console.log('Europe PMC:', ep.data && ep.data.hitCount, '| abstract:', er && er.abstractText ? er.abstractText.length : '无')

  const oa = await j('https://api.openalex.org/works/doi:' + doi)
  console.log('OpenAlex:', oa.status, '| abstract_inverted:', oa.data && oa.data.abstract_inverted_index ? '有' : '无')

  const s2 = await j('https://api.semanticscholar.org/graph/v1/paper/DOI:' + doi + '?fields=abstract,publicationTypes')
  console.log('SemanticScholar:', s2.status, '| abstract:', s2.data && s2.data.abstract ? s2.data.abstract.length : '无')

  // 出版社页面
  const pageUrl = 'https://doi.org/' + doi
  const res = await fetch(pageUrl, { redirect: 'follow', headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/141.0.0.0' } })
  const html = await res.text()
  console.log('\n出版社页面:', res.status, '| 最终 URL:', res.url, '| bytes:', html.length)
  const meta =
    html.match(/<meta[^>]+name="dc\.description"[^>]+content="([^"]{40,})"/i) ||
    html.match(/<meta[^>]+name="description"[^>]+content="([^"]{40,})"/i) ||
    html.match(/<meta[^>]+property="og:description"[^>]+content="([^"]{40,})"/i)
  console.log('meta 摘要:', meta ? meta[1].slice(0, 180) : '无')
  const absBlock = html.match(/class="[^"]*abstract[^"]*"[^>]*>([\s\S]{40,1200}?)<\/(div|section)>/i)
  console.log('abstract 区块:', absBlock ? absBlock[1].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').slice(0, 160) : '无')
  console.log('页面是否含 Abstract 字样:', /Abstract/i.test(html))
}

main().catch((e) => console.error('FAIL', e.message))

/**
 * 数据源连通性自检：验证 Crossref / Europe PMC 的查询参数在 Node 侧可用。
 * 用法：node scripts/check-api.mjs
 */
const MAILTO = 'paperdaily@example.com'
const SELECT =
  'title,author,published,published-print,created,volume,issue,DOI,abstract,type,page,ISSN,container-title,short-container-title'

const pad = (n) => (n < 10 ? '0' + n : String(n))
const ymd = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`

async function main() {
  const now = new Date()
  const start = new Date(now.getTime() - 6 * 86400000)
  const filter = [`from-created-date:${ymd(start)}`, `until-created-date:${ymd(now)}`, 'type:journal-article'].join(',')
  const url =
    `https://api.crossref.org/works?filter=${encodeURIComponent(filter)}` +
    `&sort=created&order=desc&rows=100&select=${SELECT}&mailto=${encodeURIComponent(MAILTO)}`

  const t0 = Date.now()
  const res = await fetch(url)
  console.log('works status:', res.status, '| ms:', Date.now() - t0)
  const json = await res.json()
  const items = (json.message && json.message.items) || []
  console.log('近7天 items:', items.length, '| total-results:', json.message && json.message['total-results'])

  const withIssn = items.filter((it) => Array.isArray(it.ISSN) && it.ISSN.length).length
  console.log('带 ISSN 的比例:', withIssn + '/' + items.length)
  const first = items[0] || {}
  console.log(
    '首条:',
    JSON.stringify({
      title: (first.title || [])[0],
      issn: (first.ISSN || [])[0],
      journal: (first['container-title'] || [])[0],
      created: (first.created || {})['date-time'],
      hasAbstract: !!first.abstract,
    }),
  )

  // 期刊当期（Cell）
  const issueUrl =
    `https://api.crossref.org/journals/0092-8674/works?rows=40&sort=created&order=desc` +
    `&select=volume,issue,type,published,published-print,created,title,DOI&mailto=${encodeURIComponent(MAILTO)}`
  const cell = await (await fetch(issueUrl)).json()
  const ci = (cell.message.items || []).find((x) => x.volume && x.issue && !/^10\.1038\/d\d/.test(x.DOI || ''))
  console.log('Cell 当期:', ci ? `Vol ${ci.volume} · No.${ci.issue}` : '未找到')

  // Europe PMC 摘要
  if (first.DOI) {
    const epmc =
      `https://www.ebi.ac.uk/europepmc/webservices/rest/search?query=${encodeURIComponent('DOI:"' + first.DOI + '"')}` +
      `&resultType=core&format=json&pageSize=1`
    const ep = await (await fetch(epmc)).json()
    const hit = (ep.resultList && ep.resultList.result && ep.resultList.result[0]) || {}
    console.log('Europe PMC 摘要长度:', String(hit.abstractText || '').length)
  }
}

main().catch((e) => {
  console.error('FAIL', e && e.message)
  process.exit(1)
})

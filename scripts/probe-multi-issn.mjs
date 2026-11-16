/** 验证多 ISSN 过滤能带多少本刊（60 / 160）以及时间窗是否真的生效 */
import fs from 'node:fs'

const src = fs.readFileSync('src/data/catalog.ts', 'utf8')
const block = src.slice(src.indexOf('export const JOURNALS'))
const issns = [...block.matchAll(/"issn": "([^"]+)"/g)].map((m) => m[1])
console.log('catalog 期刊数:', issns.length)

const run = async (n, days) => {
  const list = issns.slice(0, n)
  const filter = [
    ...list.map((i) => 'issn:' + i),
    'from-created-date:2026-11-10',
    'until-created-date:2026-11-16',
    'type:journal-article',
  ].join(',')
  const url =
    'https://api.crossref.org/works?rows=200&select=DOI,ISSN,created&sort=created&order=desc' +
    '&filter=' + encodeURIComponent(filter) + '&mailto=paperdaily@example.com'
  const t0 = Date.now()
  try {
    const res = await fetch(url)
    const j = await res.json()
    const items = (j && j.message && j.message.items) || []
    const dist = {}
    items.forEach((x) => {
      const k = (x.ISSN || [])[0] || '?'
      dist[k] = (dist[k] || 0) + 1
    })
    console.log(
      `n=${n} uri=${url.length} status=${res.status} ms=${Date.now() - t0} 条=${items.length} 覆盖刊=${Object.keys(dist).length}` +
        (items.length ? ` 跨度=${items[items.length - 1].created['date-time'].slice(0, 10)}~${items[0].created['date-time'].slice(0, 10)}` : ''),
    )
  } catch (e) {
    console.log(`n=${n} 失败:`, e.message)
  }
}

await run(60)
await run(160)

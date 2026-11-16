/** 对比：按 created 取 vs 按 pub-date 取，返回的 published 日期分布是否合理 */
import fs from 'node:fs'

const src = fs.readFileSync('src/data/catalog.ts', 'utf8')
const block = src.slice(src.indexOf('export const JOURNALS'))
const issns = [...block.matchAll(/"issn": "([^"]+)"/g)].map((m) => m[1]).slice(0, 30)
const f = (arr, a, b) =>
  encodeURIComponent([...arr.map((i) => 'issn:' + i), 'from-' + a, 'until-' + b, 'type:journal-article'].join(','))

const run = async (label, filter) => {
  const url =
    'https://api.crossref.org/works?rows=100&select=DOI,ISSN,created,published,published-print&sort=published&order=desc' +
    `&filter=${filter}&mailto=paperdaily@example.com`
  const j = await (await fetch(url)).json()
  const items = (j && j.message && j.message.items) || []
  const dist = {}
  items.forEach((it) => {
    const p = (it.published && it.published['date-parts'] && it.published['date-parts'][0]) || []
    const k = p.length >= 3 ? p.slice(0, 3).join('-') : p.length === 2 ? p.join('-') : '?'
    dist[k] = (dist[k] || 0) + 1
  })
  console.log(`${label}: ${items.length} 条 | published 分布:`, JSON.stringify(dist).slice(0, 260))
}

await run('created 11-14~11-16', f(issns, 'created-date:2026-11-14', 'created-date:2026-11-16'))
await run('pub     11-14~11-16', f(issns, 'pub-date:2026-11-14', 'pub-date:2026-11-16'))

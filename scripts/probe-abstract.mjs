/** 排查「有摘要却说没有」：同一篇论文在 Crossref / Europe PMC 各返回什么 */
import { writeFileSync } from 'node:fs'

const TITLE = 'Plasma proteomic signatures of Parkinson'
const MAILTO = 'paperdaily@example.com'

const get = async (u) => (await fetch(u)).json()

async function main() {
  // 1) Crossref 按标题找到这篇，看有没有 abstract
  const cu =
    `https://api.crossref.org/works?query.bibliographic=${encodeURIComponent(TITLE)}` +
    `&rows=3&select=DOI,title,abstract,container-title,ISSN&mailto=${MAILTO}`
  const cj = await get(cu)
  const items = cj.message.items || []
  console.log('Crossref 命中', items.length)
  let doi = ''
  for (const it of items) {
    const t = (it.title || [])[0] || ''
    console.log('  -', it.DOI, '| abstract:', it.abstract ? it.abstract.length + ' 字符' : '无', '|', t.slice(0, 60))
    if (!doi && /Parkinson/i.test(t)) doi = it.DOI
  }
  if (!doi) doi = items[0]?.DOI || ''
  console.log('选定 DOI:', doi)

  // 2) Europe PMC 按 DOI
  const e1 = await get(
    `https://www.ebi.ac.uk/europepmc/webservices/rest/search?query=${encodeURIComponent('DOI:"' + doi + '"')}` +
      `&resultType=core&format=json&pageSize=1`,
  )
  const h1 = e1?.resultList?.result?.[0]
  console.log('EPMC by DOI 命中:', e1.hitCount, '| abstract:', h1?.abstractText ? h1.abstractText.length : '无')

  // 3) Europe PMC 按标题
  const e2 = await get(
    `https://www.ebi.ac.uk/europepmc/webservices/rest/search?query=${encodeURIComponent('TITLE:"' + TITLE + '"')}` +
      `&resultType=core&format=json&pageSize=3`,
  )
  const list2 = e2?.resultList?.result || []
  console.log('EPMC by TITLE 命中:', e2.hitCount)
  list2.forEach((r) => console.log('  -', r.doi, '| abstract:', r.abstractText ? r.abstractText.length : '无'))

  // 4) Europe PMC 不带引号
  const e3 = await get(
    `https://www.ebi.ac.uk/europepmc/webservices/rest/search?query=${encodeURIComponent('DOI:' + doi)}` +
      `&resultType=core&format=json&pageSize=1`,
  )
  console.log('EPMC 不带引号:', e3.hitCount, '| abstract:', e3?.resultList?.result?.[0]?.abstractText ? 'yes' : '无')

  // 5) 直接看出版社页面 meta（Nature 系 journal.abstract 在 meta 里）
  const page = await fetch('https://doi.org/' + doi, { redirect: 'follow', headers: { 'User-Agent': 'Mozilla/5.0' } })
  const html = await page.text()
  const m = html.match(/<meta[^>]+name="dc.description"[^>]+content="([^"]{80,})"/i) ||
    html.match(/<meta[^>]+name="description"[^>]+content="([^"]{80,})"/i)
  console.log('出版社页面 meta 摘要:', m ? m[1].slice(0, 160) + '…' : '未取到')
  writeFileSync('C:/Users/JunJun/Desktop/agent_devop_pkgs/paperread/_data/abs-probe.html', html.slice(0, 4000))
}

main().catch((e) => console.error('FAIL', e.message))

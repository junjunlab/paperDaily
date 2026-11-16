/** 按 ISSN 定位目标论文，看摘要到底在哪一层缺失 */
const MAILTO = 'paperdaily@example.com'
const get = async (u) => (await fetch(u)).json()

const main = async () => {
  const u =
    'https://api.crossref.org/journals/2373-8057/works?rows=20&sort=created&order=desc' +
    '&select=DOI,title,abstract,published,created&mailto=' + MAILTO
  const j = await get(u)
  const items = j.message.items || []
  console.log('npj Parkinson 最近', items.length, '条')

  const hit = items.find((x) => /Plasma proteomic/i.test(((x.title || [])[0] || '')))
  console.log('目标:', hit ? hit.DOI : '未找到')
  if (hit) {
    console.log('标题:', (hit.title || [])[0])
    console.log('Crossref abstract:', hit.abstract ? hit.abstract.length + ' 字符' : '无')
    if (hit.abstract) console.log('前 220:', hit.abstract.slice(0, 220))

    const q = 'DOI:"' + hit.DOI + '"'
    const e = await get(
      'https://www.ebi.ac.uk/europepmc/webservices/rest/search?query=' + encodeURIComponent(q) +
        '&resultType=core&format=json&pageSize=1',
    )
    const r = e && e.resultList && e.resultList.result && e.resultList.result[0]
    console.log('EPMC hitCount:', e.hitCount, '| abstract:', r && r.abstractText ? r.abstractText.length : '无')
  }

  const withAbs = items.filter((x) => x.abstract).length
  console.log('该刊近期 abstract 覆盖:', withAbs + '/' + items.length)
}

main().catch((e) => console.error('FAIL', e.message))

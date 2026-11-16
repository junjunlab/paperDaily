/** 测试 PubMed (NCBI eutils) 能否补摘要：先按 DOI 找 PMID，再取摘要 */
const DOI = process.argv[2] || '10.1001/jama.2026.24386'
const BASE = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils'

const main = async () => {
  const es = await (
    await fetch(`${BASE}/esearch.fcgi?db=pubmed&term=${encodeURIComponent(DOI + '[doi]')}&retmode=json`)
  ).json()
  const ids = (es && es.esearchresult && es.esearchresult.idlist) || []
  console.log('PMID 命中:', ids.length, ids.slice(0, 3).join(','))

  if (ids.length) {
    const abs = await (
      await fetch(`${BASE}/efetch.fcgi?db=pubmed&id=${ids[0]}&rettype=abstract&retmode=text`)
    ).text()
    console.log('摘要文本长度:', abs.length)
    console.log('前 260 字:', abs.replace(/\s+/g, ' ').slice(0, 260))
  }

  // 顺手验证 CORS 头（浏览器端能否直接调）
  const r = await fetch(`${BASE}/esearch.fcgi?db=pubmed&term=crispr&retmode=json`)
  console.log('CORS:', r.headers.get('access-control-allow-origin') || '(无)')
}

main().catch((e) => console.error('FAIL', e.message))

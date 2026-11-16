/** 验证 PubMed 摘要解析：能否只取到真正的 Abstract 段，而非引用信息 */
const BASE = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils'

const extract = (text) => {
  const lines = String(text || '').split('\n')
  const start = lines.findIndex((l) => /^\s*Abstract\s*$/i.test(l))
  if (start < 0) return ''
  const buf = []
  for (let i = start + 1; i < lines.length; i += 1) {
    const l = lines[i]
    if (/^\s*(DOI|PMID|PMCID|Conflict of Interest|©|Copyright)\b/i.test(l)) break
    buf.push(l.trim())
  }
  return buf.join(' ').replace(/\s+/g, ' ').trim()
}

const run = async (doi) => {
  const es = await (await fetch(`${BASE}/esearch.fcgi?db=pubmed&term=${encodeURIComponent(doi + '[doi]')}&retmode=json`)).json()
  const ids = (es && es.esearchresult && es.esearchresult.idlist) || []
  if (!ids.length) {
    console.log(doi, '→ 无 PMID')
    return
  }
  const txt = await (await fetch(`${BASE}/efetch.fcgi?db=pubmed&id=${ids[0]}&rettype=abstract&retmode=text`)).text()
  const abs = extract(txt)
  console.log(doi, '| PMID', ids[0], '| 摘要', abs ? abs.length + ' 字符' : '无')
  if (abs) console.log('   ', abs.slice(0, 160))
}

await run('10.1001/jama.2026.24386')
await run('10.1038/s41531-026-01612-4')
await run('10.1126/science.adx1234')

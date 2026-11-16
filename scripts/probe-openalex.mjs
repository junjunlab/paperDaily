/** 测试 OpenAlex 与 Semantic Scholar 能不能补上摘要 */
const DOI = process.argv[2] || '10.1038/s41531-026-01612-4'
const get = async (u) => {
  const r = await fetch(u, { headers: { 'User-Agent': 'paperdaily/1.0 (mailto:paperdaily@example.com)' } })
  return { status: r.status, json: await r.json().catch(() => null) }
}

/** OpenAlex 的摘要是倒排索引：{word: [pos,...]}，按位置还原 */
function fromInverted(idx) {
  if (!idx) return ''
  const slots = []
  for (const [word, poses] of Object.entries(idx)) for (const p of poses) slots[p] = word
  return slots.filter(Boolean).join(' ')
}

const main = async () => {
  const a = await get('https://api.openalex.org/works/doi:' + DOI)
  const abs = a.json ? fromInverted(a.json.abstract_inverted_index) : ''
  console.log('OpenAlex:', a.status, '| abstract:', abs ? abs.length + ' 字符' : '无')
  if (abs) console.log('  前 200:', abs.slice(0, 200))

  const b = await get('https://api.semanticscholar.org/graph/v1/paper/DOI:' + DOI + '?fields=title,abstract')
  console.log('SemanticScholar:', b.status, '| abstract:', b.json && b.json.abstract ? b.json.abstract.length + ' 字符' : '无')
  if (b.json && b.json.abstract) console.log('  前 200:', b.json.abstract.slice(0, 200))
}

main().catch((e) => console.error('FAIL', e.message))

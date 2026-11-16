/**
 * 二级方向质量抽检：拉几本刊的最新文章，看细分结果是否合理。
 * 运行：node --experimental-strip-types scripts/check-subs.mjs
 */
import { SUBDOMAINS } from '../src/data/subdomains.ts'
import { DOMAIN_BY_ISSN } from '../src/data/catalog.ts'

const MAILTO = 'paperdaily@example.com'
const JOURNALS = [
  ['0092-8674', 'Cell'],
  ['0028-0836', 'Nature'],
  ['1078-8956', 'Nat Med'],
  ['1074-7613', 'Immunity'],
  ['0896-6273', 'Neuron'],
  ['0002-7863', 'JACS'],
  ['0031-9007', 'PRL'],
  ['0935-9648', 'Adv Mater'],
  ['0162-8828', 'TPAMI'],
  ['1752-0894', 'Nat Geosci'],
  ['0025-5718', 'Math Comp'],
]

const PHRASE = (k) => (k.includes(' ') || k.includes('-') ? 2 : 1)

function classifySub(domainKey, title, abstract) {
  const subs = SUBDOMAINS[domainKey]
  if (!subs) return ''
  const t = String(title || '').toLowerCase()
  const a = String(abstract || '').toLowerCase()
  let best = ''
  let bestScore = 0
  for (const sub of subs) {
    let s = 0
    for (const kw of sub.keywords) {
      const k = kw.toLowerCase()
      const w = PHRASE(k)
      if (t.includes(k)) s += w * 2
      else if (a.includes(k)) s += w * 1
    }
    if (s > bestScore) {
      bestScore = s
      best = sub.key
    }
  }
  return bestScore >= 2 ? best : ''
}

const get = async (url) => {
  for (let i = 0; i < 3; i++) {
    const r = await fetch(url)
    if (r.ok) return r.json()
    await new Promise((res) => setTimeout(res, 1200))
  }
  return null
}

const stats = {}
for (const [issn, name] of JOURNALS) {
  const domain = DOMAIN_BY_ISSN[issn] || '?'
  const url = `https://api.crossref.org/journals/${issn}/works?rows=25&sort=created&order=desc&select=DOI,title,abstract&mailto=${encodeURIComponent(MAILTO)}`
  const d = await get(url)
  const items = d?.message?.items || []
  stats[domain] = stats[domain] || { n: 0, subs: {}, samples: {} }
  for (const it of items) {
    const title = (it.title || [''])[0]
    if (!title) continue
    const sub = classifySub(domain, title, it.abstract || '')
    const bucket = stats[domain]
    bucket.n++
    const key = sub || '(未分)'
    bucket.subs[key] = (bucket.subs[key] || 0) + 1
    bucket.samples[key] = bucket.samples[key] || []
    if (bucket.samples[key].length < 2) bucket.samples[key].push(`[${name}] ${title.slice(0, 78)}`)
  }
  await new Promise((r) => setTimeout(r, 400))
}

for (const [domain, v] of Object.entries(stats)) {
  const total = SUBDOMAINS[domain]?.length || 0
  console.log(`\n=== ${domain}（表内 ${total} 个方向，样本 ${v.n} 篇）===`)
  const rows = Object.entries(v.subs).sort((a, b) => b[1] - a[1])
  for (const [k, c] of rows) {
    console.log(`  ${k.padEnd(18)} ${String(c).padStart(3)}`)
    for (const s of v.samples[k]) console.log(`      · ${s}`)
  }
  const unused = (SUBDOMAINS[domain] || []).map((s) => s.key).filter((k) => !v.subs[k])
  if (unused.length) console.log(`  样本中未出现：${unused.join(', ')}`)
}

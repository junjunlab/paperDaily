/**
 * 把 JCR2024 影响因子表（2025 年 6 月发布）合并进 App 的期刊数据。
 *
 * 输入：
 *   scripts/out/jcr/JCR2024.csv  —— 完整 JCR2024（22249 本），来自
 *     https://github.com/yuzhounh/Authoritative-Journal-Classification (master/JCR2024-UTF8.csv)
 *     CSV 列：Journal, ISSN, eISSN, Category, IF(2024), IF Quartile(2024), IF Rank(2024)
 *   scripts/out/journals-full.raw.json —— Crossref 全库期刊 {i:ISSN, n:name}
 *
 * 输出：
 *   src/data/journals-if.ts —— 紧凑 IF 映射（每行 "ISSN\tIF"），供全库期刊显示影响因子
 *
 * 匹配策略（优先级）：ISSN → eISSN → 刊名规范化。 ISSN 最可靠（跨库唯一），
 * 刊名兜底用于 Crossref 与 JCR 的 ISSN 记录方式不同的情况。
 */
import fs from 'node:fs'
import path from 'node:path'

const CSV = path.resolve('scripts/out/jcr/JCR2024.csv')
const RAW = path.resolve('scripts/out/journals-full.raw.json')
const OUT = path.resolve('src/data/journals-if.ts')
const CATALOG = path.resolve('src/data/catalog.ts')

if (!fs.existsSync(CSV) || !fs.existsSync(RAW)) {
  console.error('缺少输入文件，请先下载 JCR2024.csv 和 journals-full.raw.json')
  process.exit(1)
}

/** 正确的 CSV 行解析（处理引号包裹的逗号与双引号转义） */
function parseCsvLine(line) {
  const out = []
  let cur = ''
  let inQuotes = false
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i]
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        cur += '"'
        i += 1
      } else {
        inQuotes = !inQuotes
      }
    } else if (ch === ',' && !inQuotes) {
      out.push(cur)
      cur = ''
    } else {
      cur += ch
    }
  }
  out.push(cur)
  return out
}

const nameKey = (s) =>
  String(s || '')
    .toLowerCase()
    .replace(/^the\s+/, '')
    .replace(/[^a-z0-9]/g, '')
    .trim()

// 1) 读 JCR：建 ISSN / eISSN / 刊名 → IF 索引
const byIssn = new Map()
const byName = new Map()
const lines = fs.readFileSync(CSV, 'utf8').split(/\r?\n/).filter(Boolean)
let jcrCount = 0
for (let i = 1; i < lines.length; i += 1) {
  const c = parseCsvLine(lines[i])
  const name = c[0] || ''
  const issn = String(c[1] || '').toUpperCase().trim()
  const eissn = String(c[2] || '').toUpperCase().trim()
  const iff = String(c[4] || '').trim()
  const val = parseFloat(iff)
  if (!name || !Number.isFinite(val) || val <= 0) continue
  jcrCount += 1
  if (/^\d{4}-\d{4}$/.test(issn)) byIssn.set(issn, iff)
  if (/^\d{4}-\d{4}$/.test(eissn)) byIssn.set(eissn, iff)
  const nk = nameKey(name)
  if (nk) byName.set(nk, iff)
}
console.log('JCR 有效期刊:', jcrCount, '| ISSN 索引:', byIssn.size, '| 刊名索引:', byName.size)

// 2) 读 Crossref 全库期刊，逐一匹配 IF
const journals = JSON.parse(fs.readFileSync(RAW, 'utf8'))
const matched = new Map() // issn -> { name, iff }
let mIssn = 0
let mName = 0
for (const j of journals) {
  const issn = String(j.i || '').toUpperCase()
  let iff = byIssn.get(issn)
  if (iff) mIssn += 1
  else {
    iff = byName.get(nameKey(j.n))
    if (iff) mName += 1
  }
  if (iff) matched.set(issn, { name: j.n, iff })
}
console.log('全库期刊:', journals.length, '| 命中 IF:', matched.size, `(ISSN ${mIssn} / 刊名 ${mName})`)

// 3) 生成紧凑数据：每行 "ISSN\tIF"
const rows = []
for (const [issn, v] of matched) rows.push(`${issn}\t${v.iff}`)
const literal = JSON.stringify(rows.join('\n'))
const body = `/**
 * JCR2024 影响因子（2025 年 6 月发布，约 ${matched.size} 本），由 scripts/build-if.mjs 生成，勿手改。
 * 紧凑格式：每行 "ISSN\\tIF"。覆盖 Crossref 全库中能在 JCR 匹配到的期刊。
 */
export const JOURNAL_IF_RAW: string = ${literal}
`
fs.writeFileSync(OUT, body, 'utf8')
console.log('写出', OUT, (fs.statSync(OUT).size / 1024).toFixed(1) + ' KB')

// 4) 顺带输出「Top 期刊」样例，便于人工核对
const top = [...matched.entries()]
  .map(([issn, v]) => ({ issn, name: v.name, iff: parseFloat(v.iff) }))
  .sort((a, b) => b.iff - a.iff)
  .slice(0, 12)
console.log('IF Top12:')
top.forEach((x) => console.log(`  ${x.iff.toFixed(1).padStart(6)}  ${x.name} (${x.issn})`))

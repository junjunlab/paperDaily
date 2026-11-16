/**
 * 拉取 Crossref 全库期刊（约 17 万本），精简为 {issn, name} 后写盘。
 *
 * 关键点：
 *   - /journals 的 offset 深分页 >10000 会 400，但 cursor 可任意构造：
 *     cursor = base64("1.0,<offset>")，据此按 offset 分段并发拉取，速度快很多。
 *   - 单页原始 4MB（含 counts/breakdowns 等无用字段），这里只留 issn + title。
 *   - 每段结果先落盘到 segments/，全部完成后合并去重，支持断点续传。
 *
 * 用法：node scripts/fetch-all-journals.mjs
 */
import fs from 'node:fs'
import path from 'node:path'

const BASE = 'https://api.crossref.org/journals'
const MAILTO = 'paperdaily@example.com'
const OUT_DIR = path.resolve('scripts/out')
const SEG_DIR = path.join(OUT_DIR, 'segments')
const RAW = path.join(OUT_DIR, 'journals-full.raw.json')
const TOTAL = 173636 // Crossref /journals total-results，用于判断结束（不依赖空段）

fs.mkdirSync(SEG_DIR, { recursive: true })
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const cursorFor = (offset) => Buffer.from(`1.0,${offset}`).toString('base64')

const cleanTitle = (s) =>
  String(s || '')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim()

async function getSegment(offset, retry = 6) {
  const segFile = path.join(SEG_DIR, `${offset}.json`)
  if (fs.existsSync(segFile)) {
    try {
      return JSON.parse(fs.readFileSync(segFile, 'utf8'))
    } catch {
      /* 损坏则重拉 */
    }
  }
  const url =
    `${BASE}?rows=1000&cursor=${encodeURIComponent(cursorFor(offset))}` +
    `&mailto=${encodeURIComponent(MAILTO)}`
  for (let i = 0; i < retry; i += 1) {
    try {
      const r = await fetch(url)
      if (!r.ok) throw new Error('HTTP ' + r.status)
      const d = await r.json()
      const raw = Array.isArray(d.message && d.message.items) ? d.message.items : []
      const items = []
      for (const it of raw) {
        const name = cleanTitle(it.title)
        const issn = String((it.ISSN && it.ISSN[0]) || '').toUpperCase()
        if (!issn || !name || name.length < 2 || /^\d+$/.test(name)) continue
        items.push({ i: issn, n: name })
      }
      fs.writeFileSync(segFile, JSON.stringify(items))
      return items
    } catch (e) {
      console.log(`  offset ${offset} 重试 ${i + 1}/${retry}:`, e.message)
      // 429 限流退避更长，避免并发互相顶
      const wait = e.message.includes('429') ? 3000 * (i + 1) : 1200 * (i + 1)
      await sleep(wait)
    }
  }
  // 失败不写段文件，下轮续传会重拉；返回 null 与「正常空段」区分
  console.log(`  offset ${offset} 最终失败，留待续传`)
  return null
}

// 并发拉取：4 路，offset 0,1000,2000,... 直到覆盖 TOTAL
const CONCURRENCY = 4
const STEP = 1000
let nextOffset = 0
let okSegments = 0

async function worker(id) {
  while (true) {
    const offset = nextOffset
    nextOffset += STEP
    if (offset >= TOTAL) return
    const items = await getSegment(offset)
    if (items === null) continue // 失败，跳过（不写段，下轮重拉）
    okSegments += 1
    if (okSegments % 10 === 0) console.log(`  已拉 ${okSegments} 段（offset ${offset}）`)
  }
}

console.log('开始并发拉取，并发数', CONCURRENCY)
await Promise.all(Array.from({ length: CONCURRENCY }, (_, i) => worker(i)))

// 合并所有段文件；检查缺段（失败的段没落盘）
const haveSegs = new Set(
  fs.readdirSync(SEG_DIR)
    .filter((x) => /^\d+\.json$/.test(x))
    .map((x) => parseInt(x)),
)
const missing = []
for (let off = 0; off < TOTAL; off += STEP) if (!haveSegs.has(off)) missing.push(off)
if (missing.length) {
  console.log(`缺少 ${missing.length} 段，重跑本脚本可续传补齐：`, missing.slice(0, 20).join(','))
}

const seen = new Set()
const uniq = []
for (const f of fs.readdirSync(SEG_DIR).filter((x) => /^\d+\.json$/.test(x)).sort((a, b) => parseInt(a) - parseInt(b))) {
  const items = JSON.parse(fs.readFileSync(path.join(SEG_DIR, f), 'utf8'))
  for (const j of items) {
    if (seen.has(j.i)) continue
    seen.add(j.i)
    uniq.push(j)
  }
}
console.log('去重后:', uniq.length, '本')
fs.writeFileSync(RAW, JSON.stringify(uniq))
console.log('写出', RAW, (fs.statSync(RAW).size / 1024 / 1024).toFixed(2) + ' MB')
console.log('完成')

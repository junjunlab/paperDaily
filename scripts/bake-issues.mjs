/**
 * 烘焙顶刊当期快照：把 Cell / Nature / Science 的最新一期写进 src/data/cns-issues.json。
 *
 * 为什么需要：国内访问 Crossref 抖动很大（单请求 2–11 秒都见过），冷启动必等一轮网络。
 * 内置一份快照后，页面可以 0 毫秒先把三张卡铺出来，再在后台静默替换成最新数据。
 *
 * 用法：node scripts/bake-issues.mjs（建议每周跑一次）
 */
import { writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const HERE = dirname(fileURLToPath(import.meta.url))
const OUT = resolve(HERE, '../src/data/cns-issues.json')

const BASE = 'https://api.crossref.org'
const MAILTO = 'paperdaily@example.com'

const CNS = [
  { key: 'cell', name: 'Cell', cn: '细胞', issn: '0092-8674', color: '#0e7490', site: 'https://www.cell.com/cell/current' },
  { key: 'nature', name: 'Nature', cn: '自然', issn: '0028-0836', color: '#b91c1c', site: 'https://www.nature.com/nature/current-issue' },
  { key: 'science', name: 'Science', cn: '科学', issn: '0036-8075', color: '#1d4ed8', site: 'https://www.science.org/toc/science/current' },
]

const pad2 = (n) => (n < 10 ? '0' + n : String(n))

function cleanTitle(text) {
  return String(text || '')
    .replace(/<[^>]+>/g, '')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#x[0-9a-f]+;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function pickIssue(items, meta) {
  let hit = null
  for (const it of items) {
    if (/^10\.1038\/d\d/.test(String(it.DOI || ''))) continue
    if (!it.volume || !it.issue) continue
    hit = it
    break
  }
  if (!hit) return null

  const print =
    (hit['published-print'] && hit['published-print']['date-parts'] && hit['published-print']['date-parts'][0]) ||
    (hit.published && hit.published['date-parts'] && hit.published['date-parts'][0]) ||
    []
  const year = print[0] || new Date().getFullYear()

  let dateParts = print.length >= 3 ? print : null
  let dateKind = 'print'
  if (!dateParts && hit.created && hit.created['date-time']) {
    const d = new Date(hit.created['date-time'])
    if (!isNaN(d.getTime())) {
      dateParts = [d.getFullYear(), d.getMonth() + 1, d.getDate()]
      dateKind = 'online'
    }
  }
  if (!dateParts) dateParts = print.length >= 2 ? print : null

  return {
    key: meta.key,
    volume: String(hit.volume),
    issue: String(hit.issue),
    year,
    label: `Vol ${hit.volume} · No.${hit.issue}`,
    dateText: dateParts
      ? dateParts.length >= 3
        ? `${dateParts[0]}-${pad2(dateParts[1])}-${pad2(dateParts[2])}`
        : `${dateParts[0]}-${pad2(dateParts[1])}`
      : '',
    dateKind,
    leadTitle: cleanTitle((hit.title && hit.title[0]) || ''),
    leadDoi: String(hit.DOI || ''),
  }
}

const daysAgo = (n) => {
  const d = new Date(Date.now() - n * 86400000)
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`
}

async function one(meta) {
  const filter = `issn:${meta.issn},from-created-date:${daysAgo(200)},type:journal-article`
  const url =
    `${BASE}/works?filter=${encodeURIComponent(filter)}&rows=40&sort=created&order=desc` +
    `&select=volume,issue,type,published,published-print,created,title,DOI&mailto=${encodeURIComponent(MAILTO)}`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`${meta.key} HTTP ${res.status}`)
  const json = await res.json()
  const items = (json.message && json.message.items) || []
  const issue = pickIssue(items, meta)
  if (!issue) throw new Error(`${meta.key} 没找到当期`)
  return { ...meta, ...issue }
}

const list = []
for (const meta of CNS) {
  const issue = await one(meta)
  console.log(`${meta.name}: ${issue.label} · ${issue.dateText} · ${issue.leadTitle.slice(0, 46)}`)
  list.push(issue)
}

await writeFile(OUT, JSON.stringify({ at: new Date().toISOString().slice(0, 10), list }, null, 2) + '\n', 'utf8')
console.log('已写入', OUT)

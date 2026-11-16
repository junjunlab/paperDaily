/**
 * Crossref 全库期刊检索。
 *
 * 设计要点：
 *   1. 数据在 journals-full.ts 里是一个大字符串（每行 "ISSN\t刊名"），避免在 bundle 里放 17 万个对象。
 *   2. 首次搜索时才解析并建索引，解析一次后常驻内存；不在 App 启动路径上，不影响冷启动。
 *   3. 用「缩写表 / ISSN / 刊名」三层匹配，按相关度排序，最多返回 limit 条，防止列表过长。
 */
import { FULL_JOURNALS_RAW } from '../data/journals-full'
import { JOURNAL_IF_RAW } from '../data/journals-if'
import { ABBR_ISSN } from '../data/abbr'
import { JOURNAL_IF, type JournalMeta } from '../data/catalog'

type FullJournal = { issn: string; name: string; nameLower: string }

let parsed: FullJournal[] | null = null
/** ISSN → 该刊的所有别名（来自简称表），用于让全库条目也能被缩写命中 */
let aliasByIssn: Map<string, string[]> | null = null
/** ISSN → JCR2024 影响因子（约 1.3 万本），独立懒加载（只解析 204KB，不碰全库大字符串） */
let ifByIssn: Map<string, string> | null = null

function ensureIf() {
  if (ifByIssn) return
  const im = new Map<string, string>()
  for (const line of JOURNAL_IF_RAW.split('\n')) {
    const tab = line.indexOf('\t')
    if (tab < 0) continue
    im.set(line.slice(0, tab).toUpperCase(), line.slice(tab + 1))
  }
  ifByIssn = im
}

/** 影响因子：优先 JCR2024 全量表，回退到精选表的旧 IF */
function impactOf(issn: string, nameLower: string): string {
  ensureIf()
  const fromJcr = ifByIssn!.get(issn.toUpperCase())
  if (fromJcr) return fromJcr
  return JOURNAL_IF[nameLower.replace(/^the\s+/, '')] || ''
}

const norm = (s: string) => String(s || '').toLowerCase().replace(/[^a-z0-9]/g, '')

function ensureParsed() {
  if (parsed) return
  const list: FullJournal[] = []
  for (const line of FULL_JOURNALS_RAW.split('\n')) {
    const tab = line.indexOf('\t')
    if (tab < 0) continue
    const issn = line.slice(0, tab).toUpperCase()
    const name = line.slice(tab + 1)
    if (issn && name) list.push({ issn, name, nameLower: name.toLowerCase() })
  }
  parsed = list

  const m = new Map<string, string[]>()
  Object.entries(ABBR_ISSN).forEach(([abbr, entry]) => {
    const key = entry.issn.toUpperCase()
    const arr = m.get(key) || []
    arr.push(abbr.toLowerCase())
    m.set(key, arr)
  })
  aliasByIssn = m
  ensureIf()
}

export const fullJournalCount = () => {
  ensureParsed()
  return parsed!.length
}

/** 按 ISSN 取 JCR2024 影响因子（供简称表/精选表补全用），没有则返回空 */
export function ifOfIssn(issn: string): string {
  ensureIf()
  return ifByIssn!.get(String(issn || '').toUpperCase()) || ''
}

/** 全库期刊里按 ISSN 精确取一本（用于简称表里的 ISSN 补全名字/领域） */
export function fullByIssn(issn: string): JournalMeta | null {
  ensureParsed()
  const key = String(issn || '').toUpperCase()
  const hit = parsed!.find((j) => j.issn === key)
  if (!hit) return null
  return {
    issn: hit.issn,
    name: hit.name,
    abbr: '',
    impact: impactOf(hit.issn, hit.nameLower),
    domain: '',
  }
}

/**
 * 全库检索：名字 / 别名 / ISSN 命中，返回带 score 的 JournalMeta。
 * 注意这里不做领域过滤（全库本就跨领域），领域过滤交给调用方对本地精选做。
 */
export function searchFullJournals(keyword: string, limit = 40): JournalMeta[] {
  const q = String(keyword || '').trim().toLowerCase()
  if (q.length < 2) return []
  ensureParsed()
  const qn = norm(q)
  const scored: { j: JournalMeta; score: number }[] = []

  for (const item of parsed!) {
    let score = 0
    // ISSN
    if (q.length >= 4 && item.issn.replace(/-/g, '').toLowerCase().includes(q.replace(/-/g, ''))) score = 55
    // 刊名
    if (item.nameLower.startsWith(q)) score = Math.max(score, 60)
    else if (item.nameLower.includes(q)) score = Math.max(score, 30)
    // 别名（简称表）
    const aliases = aliasByIssn!.get(item.issn)
    if (aliases) {
      for (const a of aliases) {
        const an = norm(a)
        if (an === qn) score = Math.max(score, 95)
        else if (an.startsWith(qn) && qn.length >= 2) score = Math.max(score, 70)
        else if (an.includes(qn) && qn.length >= 3) score = Math.max(score, 35)
      }
    }
    if (!score) continue
    const impact = impactOf(item.issn, item.nameLower)
    scored.push({
      j: { issn: item.issn, name: item.name, abbr: '', impact, domain: '' },
      score,
    })
  }

  scored.sort((a, b) => b.score - a.score || Number(b.j.impact || 0) - Number(a.j.impact || 0))
  return scored.slice(0, limit).map((x) => x.j)
}

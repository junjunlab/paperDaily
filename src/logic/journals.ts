/** 期刊清单的检索与排序：期刊面板、「搜期刊名直接看该刊」都走这里 */
import { JOURNALS, JOURNAL_IF, type JournalMeta } from '../data/catalog'
import { ABBR_ISSN } from '../data/abbr'
import { ifOfIssn } from './fullJournals'

export type { JournalMeta }

export const impactNum = (s: string) => {
  const n = Number(s)
  return Number.isFinite(n) ? n : 0
}

/** 某个领域下的期刊；all 返回全部。影响因子用 JCR2024 最新值覆盖旧的精选表数值 */
export function journalsOf(domain: string): JournalMeta[] {
  const list = domain === 'all' ? JOURNALS.slice() : JOURNALS.filter((j) => j.domain === domain)
  const withIf = list.map((j) => {
    const latest = ifOfIssn(j.issn)
    return latest ? { ...j, impact: latest } : j
  })
  return withIf.sort((a, b) => impactNum(b.impact) - impactNum(a.impact))
}

/** 全部收录刊的 ISSN：选「全部领域」时用它做过滤，避免被全平台灌水刊挤满 */
export const allIssns = () => journalsOf('all').map((j) => j.issn)

/** 常见简称（gpb / ne jm / jacs…）走静态表，Crossref 不支持按缩写检索 */
export function fromAbbreviation(keyword: string): JournalMeta | null {
  const key = norm(keyword)
  if (!key) return null
  const entry = ABBR_ISSN[key]
  if (!entry) return null
  const local = JOURNALS.find((j) => j.issn === entry.issn)
  if (local) return local
  const impact = ifOfIssn(entry.issn) || JOURNAL_IF[entry.name.toLowerCase().replace(/^the\s+/, '')] || ''
  return { issn: entry.issn, name: entry.name, abbr: keyword.toUpperCase(), impact, domain: '' }
}

const norm = (s: string) => String(s || '').toLowerCase().replace(/[^a-z0-9]/g, '')

/**
 * 简称表里的刊不一定在精选 160 本里（如 gpb = Genomics Proteomics & Bioinformatics）。
 * Crossref 的 /journals 接口不支持按缩写检索，所以这些只能靠本地表兜住。
 * 已在精选表里的用精选那份（带影响因子/领域），这里只补缺的，并按 ISSN 去重。
 */
const abbrJournals = (): JournalMeta[] => {
  const seen = new Set<string>()
  const out: JournalMeta[] = []
  Object.entries(ABBR_ISSN).forEach(([abbr, entry]) => {
    if (seen.has(entry.issn)) return
    seen.add(entry.issn)
    if (JOURNALS.some((j) => j.issn === entry.issn)) return
    const impact = ifOfIssn(entry.issn) || JOURNAL_IF[entry.name.toLowerCase().replace(/^the\s+/, '')] || ''
    out.push({ issn: entry.issn, name: entry.name, abbr: abbr.toUpperCase(), impact, domain: '' })
  })
  return out
}

/** 一本刊可能有很多别名（Nature Communications: ncomms / natcomm / nc），按 ISSN 聚合 */
const aliasByIssn: Record<string, string[]> = (() => {
  const m: Record<string, string[]> = {}
  Object.entries(ABBR_ISSN).forEach(([abbr, entry]) => {
    ;(m[entry.issn] || (m[entry.issn] = [])).push(abbr)
  })
  return m
})()

/** 面板搜索：全名 / 简称 / ISSN 都能命中，简称精确匹配排最前 */
export function searchJournals(keyword: string, domain = 'all'): JournalMeta[] {
  const q = String(keyword || '').trim().toLowerCase()
  const base = journalsOf(domain)
  if (!q) return base
  const qn = norm(q)

  // 补进简称表里「精选表没有」的刊，保证 gpb 这类缩写能命中
  const extra = abbrJournals().filter((j) => !base.some((b) => b.issn === j.issn))
  const source = base.concat(extra)

  const scored = source
    .map((j) => {
      const name = j.name.toLowerCase()
      // 把官方缩写 + 简称表里的所有别名一起匹配（nejm、nc 这类才能命中）
      const abbrs = [j.abbr, ...(aliasByIssn[j.issn] || [])]
      let score = 0
      for (const a of abbrs) {
        const an = norm(a)
        const al = a.toLowerCase()
        if (an === qn || al === q) score = Math.max(score, 100)
        else if (al.startsWith(q) && q.length >= 2) score = Math.max(score, 70)
        else if (an.startsWith(qn) && qn.length >= 2) score = Math.max(score, 70)
        else if (an.includes(qn) && qn.length >= 3) score = Math.max(score, 30)
      }
      if (name.startsWith(q)) score = Math.max(score, 60)
      if (j.issn.toLowerCase().replace(/-/g, '').includes(q.replace(/-/g, '')) && q.length >= 4) score = Math.max(score, 55)
      if (name.includes(q)) score = Math.max(score, 40)
      return { j, score }
    })
    .filter((x) => x.score > 0)

  scored.sort((a, b) => b.score - a.score || impactNum(b.j.impact) - impactNum(a.j.impact))
  return scored.map((x) => x.j)
}

/**
 * 搜索框里输入期刊名/简称时，先给出「查看该刊最新论文」的捷径。
 * 只在确认命中（简称精确、全名前缀、ISSN）时返回，避免把普通关键词误判成期刊。
 */
export function journalFromKeyword(keyword: string): JournalMeta | null {
  const q = String(keyword || '').trim()
  if (q.length < 2) return null
  const qn = norm(q)
  const byAbbrTable = fromAbbreviation(q)
  if (byAbbrTable) return byAbbrTable
  const exact = JOURNALS.find((j) => norm(j.abbr) === qn)
  if (exact) return exact
  const asIssn = JOURNALS.find((j) => j.issn.replace(/-/g, '') === q.replace(/-/g, ''))
  if (asIssn) return asIssn
  if (q.length >= 4) {
    const byName = JOURNALS.find((j) => j.name.toLowerCase().startsWith(q.toLowerCase()))
    if (byName) return byName
  }
  return null
}

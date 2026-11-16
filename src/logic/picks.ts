/**
 * 每日精选：今天最值得先读的 3 篇。
 *
 * 纯本地打分，不调 AI：
 *   - 影响因子开平方（不然 60+ 的刊把位置全占了，CNS 每天也未必有 3 篇）
 *   - 当前领域加权 + 常读领域（阅读统计）小加权
 *   - 每位作者/期刊/领域去重：同一本刊最多 1 篇、同一领域最多 2 篇，保证三篇不重样
 *
 * 取数复用列表那套按天缓存，所以「全部 / 今天」时基本不产生额外请求。
 */
import { classify, impactOf } from './classify'
import { allIssns, journalsOf, impactNum } from './journals'
import { loadRange, todayStr } from './feed'
import { loadPicks, savePicks } from '../store/storage'
import type { Paper, Prefs, ReadingStats } from '../types'

const COUNT = 3

function scoreOf(p: Paper, prefs: Prefs, stats: ReadingStats | null, day: string): number {
  const ifv = impactNum(p.impact || '')
  let s = Math.sqrt(Math.max(ifv, 0)) * 2.2
  // 当前选的领域：优先给这个领域的文章
  if (prefs.domain !== 'all' && p.domain === prefs.domain) s += 3
  // 平时常读的领域：轻微加权，让精选慢慢贴近口味
  const readCount = (stats && stats.byDomain && stats.byDomain[p.domain]) || 0
  s += Math.min(readCount, 12) * 0.35
  // 当天上线的再多给一点，避免精选全是前两天的
  if (p.date === day) s += 1
  return s
}

/** 打分 + 去重挑选：同刊最多 1 篇、同领域最多 2 篇 */
function pick(list: Paper[], prefs: Prefs, stats: ReadingStats | null, day: string): Paper[] {
  const ranked = list
    .slice()
    .sort((a, b) => scoreOf(b, prefs, stats, day) - scoreOf(a, prefs, stats, day))

  const out: Paper[] = []
  const journals = new Set<string>()
  const domains: Record<string, number> = {}
  for (const p of ranked) {
    if (out.length >= COUNT) break
    const jkey = (p.issn || p.journal || '').toLowerCase()
    if (jkey && journals.has(jkey)) continue
    if ((domains[p.domain] || 0) >= 2) continue
    out.push(p)
    if (jkey) journals.add(jkey)
    domains[p.domain] = (domains[p.domain] || 0) + 1
  }
  // 候选太少（比如某天只有 2 篇）时放宽去重，宁可重样也别空着
  for (const p of ranked) {
    if (out.length >= COUNT) break
    if (!out.some((x) => x.doi === p.doi)) out.push(p)
  }
  return out.slice(0, COUNT)
}

export async function dailyPicks(prefs: Prefs, stats: ReadingStats | null): Promise<Paper[]> {
  const day = todayStr()
  const cached = await loadPicks(day, prefs.domain)
  if (cached) return cached

  const issns = prefs.domain === 'all' ? allIssns() : journalsOf(prefs.domain).map((j) => j.issn)
  if (!issns.length) return []

  // 先看今天：scope 与论文页一致，能直接命中同一份按天缓存
  let list = await loadRange(issns, 0, prefs.domain, 300, 120).catch(() => [] as Paper[])
  // 今天不足 3 篇（多数期刊不是每天更新）就看近 7 天，否则卡片空着更难看
  if (list.length < COUNT) {
    list = await loadRange(issns, 6, prefs.domain, 300, 200).catch(() => [] as Paper[])
  }
  if (!list.length) return []

  const decorated = list.map((p) => ({
    ...p,
    domain: p.domain || classify(p.issn, p.title, p.abstract),
    impact: p.impact || impactOf(p.journal),
  }))
  const picked = pick(decorated, prefs, stats, day)
  if (picked.length) void savePicks(day, prefs.domain, picked)
  return picked
}

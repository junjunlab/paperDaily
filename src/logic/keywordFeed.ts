/**
 * 关键词订阅：把用户指定的关键词，变成「今天可以读的相关新文」。
 *
 * 不是系统推送（纯本地 App 没有 APNs/FCM），而是每天第一次打开收藏页时
 * 按关键词查一次 Crossref，结果按天缓存；换关键词会立刻重抓。
 */
import { searchPapers, shiftDay } from '../api/crossref'
import { mapLimit } from '../api/http'
import { classify, impactOf } from './classify'
import { articleKind, type ArticleKind } from './articleType'
import { todayStr } from './feed'
import { loadKeywordFeed, saveKeywordFeed } from '../store/storage'
import type { Paper } from '../types'

const DAYS = 7
const PER_KEYWORD = 30
const MAX = 12
const CJK = /[\u3400-\u9fff]/

/** Crossref 的 bibliographic 查询很宽，本地再卡一次标题/摘要，减少无关命中 */
function matches(p: Paper, kw: string): boolean {
  const k = kw.trim().toLowerCase()
  if (!k) return false
  const text = `${p.title || ''} ${p.abstract || ''}`.toLowerCase()
  if (CJK.test(k)) return text.includes(k)
  const parts = k.split(/\s+/).filter((x) => x.length >= 2 || /\d/.test(x))
  if (!parts.length) return text.includes(k)
  return parts.every((x) => text.includes(x))
}

/**
 * 取当天关键词推荐。force=true 忽略当天缓存（换词 / 点重新找）。
 * 单个关键词失败不影响其它词，全部失败时返回空列表，由页面给重试入口。
 */
export async function getKeywordFeed(
  keywords: string[],
  force = false,
  kind: ArticleKind | 'all' = 'all',
): Promise<Paper[]> {
  const day = todayStr()
  const clean = keywords.map((x) => x.trim()).filter(Boolean).slice(0, 5)
  if (!clean.length) return []

  if (!force) {
    const cached = await loadKeywordFeed(day, kind)
    if (cached.length) return cached
  }

  const from = shiftDay(day, -DAYS)
  const groups = await mapLimit(clean, 2, async (kw) => {
    try {
      return await searchPapers(kw, { from, until: day }, PER_KEYWORD)
    } catch {
      return [] as Paper[]
    }
  })

  const byDoi = new Map<string, Paper>()
  const collect = (items: Paper[], since: string) => {
    for (const p of items) {
      if (!p.doi || byDoi.has(p.doi)) continue
      if (/^\d{4}-\d{2}-\d{2}$/.test(p.date) && p.date < since) continue
      if (!clean.some((kw) => matches(p, kw))) continue
      if (kind !== 'all' && articleKind(p.type, p.title) !== kind) continue
      byDoi.set(p.doi, {
        ...p,
        domain: p.domain || classify(p.issn, p.title, p.abstract),
        impact: p.impact || impactOf(p.journal),
      })
    }
  }
  collect(groups.flat(), from)

  // 近 7 天命中太少就补近 30 天，否则卡片常年只有一两条
  if (byDoi.size < 3) {
    const olderFrom = shiftDay(day, -30)
    const more = await mapLimit(clean, 2, async (kw) => {
      try {
        return await searchPapers(kw, { from: olderFrom, until: day }, PER_KEYWORD)
      } catch {
        return [] as Paper[]
      }
    })
    collect(more.flat(), olderFrom)
  }

  const out = [...byDoi.values()]
    .sort((a, b) => String(b.date).localeCompare(String(a.date)))
    .slice(0, MAX)
  await saveKeywordFeed(day, kind, out)
  return out
}

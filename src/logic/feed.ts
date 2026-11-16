/**
 * 列表取数：把「时间窗」拆成一天一天去拿，每天各自缓存。
 *
 * 为什么这样设计：
 *   1) Crossref 只提供 created 倒序翻页，取前 N 条会永远只覆盖几个小时 → 必须按天分桶；
 *   2) 每天再配合 cursor 深分页取全（见 api/crossref.ts 的 papersInDay）；
 *   3) 过去的日期基本不会变，缓存 24h；今天缓存 10 分钟 —— 这样第二次切「30 天」几乎是瞬开。
 */
import { papersInDay, shiftDay } from '../api/crossref'
import { mapLimit } from '../api/http'
import { loadDayCache, saveDayCache } from '../store/storage'
import type { Paper } from '../types'

const pad2 = (n: number) => (n < 10 ? '0' + n : String(n))
export const todayStr = () => {
  const d = new Date()
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`
}

const PAST_TTL = 24 * 3600 * 1000
const TODAY_TTL = 10 * 60 * 1000
/** 单次最多回溯多少天：再多请求数会失控，体验也未必需要 */
export const MAX_DAYS = 90

/**
 * @param issns    期刊集合（领域 → 该领域收录刊，或单本刊）
 * @param days     0 = 只看今天，2 = 今天含前 2 天，以此类推
 * @param scope    缓存作用域（领域 key 或期刊 ISSN），不同筛选互不污染
 * @param perDay   每天最多取多少条，兜底防异常
 */
/**
 * 按天配额取样：直接截前 N 条会全是最近一天（每天的量远大于 N）。
 * 这里先给每天分到 limit/天数 的额度，不够的再用剩余补齐，保证时间窗里每天都能露脸。
 */
function stratify(papers: Paper[], span: number, limit: number): Paper[] {
  const buckets = new Map<string, Paper[]>()
  for (const p of papers) {
    const key = p.date || '?'
    const list = buckets.get(key)
    if (list) list.push(p)
    else buckets.set(key, [p])
  }

  const quota = Math.max(1, Math.ceil(limit / Math.max(span, 1)))
  const picked: Paper[] = []
  const leftovers: Paper[] = []

  for (const list of buckets.values()) {
    list.forEach((p, i) => {
      if (i < quota) picked.push(p)
      else leftovers.push(p)
    })
  }

  // 每天都不满额度时，用剩下的把列表补满
  if (picked.length < limit) {
    leftovers.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0))
    picked.push(...leftovers.slice(0, limit - picked.length))
  }

  return picked
    .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0))
    .slice(0, limit)
}

export async function loadRange(
  issns: string[],
  days: number,
  scope: string,
  perDay = 300,
  limit = 60,
): Promise<Paper[]> {
  if (!issns.length) return []
  const span = Math.min(Math.max(days, 0), MAX_DAYS)
  const today = todayStr()

  const dayList: string[] = []
  for (let i = 0; i <= span; i += 1) dayList.push(shiftDay(today, -i))

  const lists = await mapLimit(dayList, 3, async (day) => {
    // v4：日期补全到日（published 只到年月时用 created），v3 缓存的 7 位日期不复用
    const key = `v4|${scope}|${day}`
    const cached = await loadDayCache<Paper>(key, day === today ? TODAY_TTL : PAST_TTL)
    if (cached) return cached

    const fresh = await papersInDay(issns, day, perDay).catch(() => [] as Paper[])
    if (fresh.length) void saveDayCache(key, fresh)
    return fresh
  })

  const seen = new Set<string>()
  const merged: Paper[] = []
  for (const list of lists) {
    for (const p of list) {
      if (seen.has(p.doi)) continue
      seen.add(p.doi)
      merged.push(p)
    }
  }
  return stratify(merged, span + 1, limit)
}

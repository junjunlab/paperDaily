/**
 * 关注期刊的「有新文」判定。
 *
 * 只给每本关注的刊打一次 Crossref「按入库时间倒序取 3 条」，拿到最新上线日，
 * 和本地水位线（follow.seen）比大小 —— 不下载整期，也不依赖官网页面（Science 有反爬）。
 * 结果缓存半小时，进页面不会每次都打一轮请求。
 */
import { journalLatest } from '../api/crossref'
import { mapLimit } from '../api/http'
import { loadFollowNews, saveFollowNews, type Follow } from '../store/storage'

/** issn → 该刊最新一篇的上线日（yyyy-mm-dd） */
export type NewsMap = Record<string, string>

const MAX_CHECK = 24

export async function checkFollowNews(follows: Follow[], force = false): Promise<NewsMap> {
  if (!follows.length) return {}
  if (!force) {
    const cached = await loadFollowNews()
    if (cached) return cached
  }
  const list = follows.slice(0, MAX_CHECK)
  const pairs = await mapLimit(list, 3, async (f) => {
    const latest = await journalLatest(f.issn, 3).catch(() => [])
    const newest = latest
      .map((p) => p.date)
      .filter((d) => !!d)
      // published 只到年月的刊会拿到 7 位日期，补成月初，保证比较口径统一
      .map((d) => (d.length === 7 ? d + '-01' : d))
      .sort()
      .pop()
    return [f.issn, newest || ''] as [string, string]
  })
  const map: NewsMap = {}
  for (const [issn, date] of pairs) if (date) map[issn] = date
  await saveFollowNews(map)
  return map
}

/** 关注的刊是否比上次看到的有新内容 */
export const hasNews = (follow: Follow | undefined, latest?: string) =>
  !!follow && !!latest && latest > (follow.seen || '')

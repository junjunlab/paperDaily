/** 本地持久化：偏好、阅读统计、CNS 当期缓存、译文缓存。App 里没有账号，全部落在本机 */
import AsyncStorage from '@react-native-async-storage/async-storage'
import type { IssueInfo, Paper, Prefs, ReadingStats } from '../types'

const K = {
  prefs: 'pd.prefs',
  stats: 'pd.stats',
  issues: 'pd.issues',
  zh: 'pd.zh',
  pubdates: 'pd.pubdates2', // v2：改用 PubMed 为准（旧 pd.pubdates 里有 S2 的错误日期）
  favs: 'pd.favs',
  follows: 'pd.follows',
  followNews: 'pd.followNews',
  picks: 'pd.picks',
  picksOff: 'pd.picksOff',
  keywords: 'pd.keywords',
  kwKind: 'pd.kwKind',
  kwFeed: 'pd.kwFeed',
}

/** DOI → 真实上线日期（Semantic Scholar publicationDate），用于 published 只到年月的刊 */
export const loadPubDates = () => readJson<Record<string, string>>(K.pubdates, {})
export const savePubDates = (map: Record<string, string>) => writeJson(K.pubdates, map)

export const defaultPrefs: Prefs = {
  lang: 'zh',
  domain: 'all',
  range: 'today',
  customFrom: '',
  customTo: '',
  translateBaseUrl: '',
  translateKey: '',
  translateModel: '',
}

const todayKey = () => new Date().toISOString().slice(0, 10)

async function readJson<T>(key: string, fallback: T): Promise<T> {
  try {
    const raw = await AsyncStorage.getItem(key)
    if (!raw) return fallback
    return { ...fallback, ...JSON.parse(raw) } as T
  } catch {
    return fallback
  }
}

async function writeJson(key: string, value: unknown) {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(value))
  } catch {
    /* 存储满了也不该挡住阅读 */
  }
}

export const loadPrefs = () => readJson<Prefs>(K.prefs, defaultPrefs)
export const savePrefs = (p: Prefs) => writeJson(K.prefs, p)

const emptyStats: ReadingStats = { total: 0, byDay: {}, byDomain: {}, lastOpen: '' }

export const loadStats = () => readJson<ReadingStats>(K.stats, emptyStats)

/** 打开一篇详情记一次；同一天同一篇反复打开只算一次，避免刷高 */
export async function recordRead(doi: string, domain: string): Promise<ReadingStats> {
  const stats = await loadStats()
  const day = todayKey()
  const seenKey = 'pd.seen.' + day
  const seen = (await AsyncStorage.getItem(seenKey).catch(() => null)) || ''
  const seenList = seen ? seen.split('|') : []
  if (seenList.includes(doi)) return stats

  seenList.push(doi)
  await AsyncStorage.setItem(seenKey, seenList.join('|')).catch(() => {})

  const next: ReadingStats = {
    total: stats.total + 1,
    byDay: { ...stats.byDay, [day]: (stats.byDay[day] || 0) + 1 },
    byDomain: domain ? { ...stats.byDomain, [domain]: (stats.byDomain[domain] || 0) + 1 } : stats.byDomain,
    lastOpen: day,
  }
  await writeJson(K.stats, next)
  return next
}

/** 连续阅读天数：从今天往前数，遇到空档就停 */
export function streakOf(stats: ReadingStats): number {
  let streak = 0
  const cursor = new Date()
  for (let i = 0; i < 400; i += 1) {
    const key = cursor.toISOString().slice(0, 10)
    if ((stats.byDay[key] || 0) > 0) {
      streak += 1
      cursor.setDate(cursor.getDate() - 1)
    } else if (i === 0) {
      // 今天还没读，从昨天开始算，别把连续记录打断
      cursor.setDate(cursor.getDate() - 1)
    } else {
      break
    }
  }
  return streak
}

// ------------------------------------------------------------ 按天缓存

/** 每天一份结果，过去的日期长缓存、今天短缓存 */
export async function loadDayCache<T>(key: string, ttl: number): Promise<T[] | null> {
  try {
    const raw = await AsyncStorage.getItem('pd.day.' + key)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (!parsed || !parsed.at || Date.now() - parsed.at > ttl) return null
    return Array.isArray(parsed.items) && parsed.items.length ? (parsed.items as T[]) : null
  } catch {
    return null
  }
}

export async function saveDayCache<T>(key: string, items: T[]): Promise<void> {
  try {
    await AsyncStorage.setItem('pd.day.' + key, JSON.stringify({ at: Date.now(), items }))
  } catch {
    /* 存不下不影响主流程 */
  }
}

// -------------------------------------------------------------- 列表缓存

/** 30 分钟内复用上次的列表：进页面先铺屏，再后台刷新 */
const LIST_TTL = 30 * 60 * 1000

export async function loadListCache<T>(key: string): Promise<T[] | null> {
  try {
    const raw = await AsyncStorage.getItem('pd.list.' + key)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (!parsed || !parsed.at || Date.now() - parsed.at > LIST_TTL) return null
    return Array.isArray(parsed.items) && parsed.items.length ? (parsed.items as T[]) : null
  } catch {
    return null
  }
}

export async function saveListCache<T>(key: string, items: T[]): Promise<void> {
  try {
    await AsyncStorage.setItem('pd.list.' + key, JSON.stringify({ at: Date.now(), items }))
  } catch {
    /* 存不下就算了，不影响功能 */
  }
}

// ------------------------------------------------------------ CNS 当期缓存

type IssueCache = { at: number; list: IssueInfo[] }
/** 6 小时内算新鲜，直接复用；超过就先用旧数据铺屏，再后台静默刷新 */
export const ISSUE_TTL = 6 * 3600 * 1000
/** 会话内内存副本：切 tab 回来能同步拿到，不必等 AsyncStorage，也不会闪一下加载中 */
let issuesMem: IssueCache | null = null

export const issuesNow = (): IssueCache | null => issuesMem

export async function loadIssuesCache(): Promise<IssueCache | null> {
  if (issuesMem) return issuesMem
  const cached = await readJson<IssueCache>(K.issues, { at: 0, list: [] })
  if (cached.at && cached.list.length) {
    issuesMem = cached
    return cached
  }
  return null
}

export async function saveIssuesCache(list: IssueInfo[]): Promise<void> {
  issuesMem = { at: Date.now(), list }
  await writeJson(K.issues, issuesMem)
}

// -------------------------------------------------------------- 译文缓存

type ZhMap = Record<string, string>

export const loadZhCache = () => readJson<ZhMap>(K.zh, {})
export const saveZhCache = (map: ZhMap) => writeJson(K.zh, map)

// ---------------------------------------------------------------- 收藏

/** 收藏的论文：整条记录存下来，断网也能看标题/摘要/期刊 */
export type FavPaper = Paper & { savedAt: number }

export async function loadFavs(): Promise<FavPaper[]> {
  try {
    const raw = await AsyncStorage.getItem(K.favs)
    const list = raw ? JSON.parse(raw) : []
    return Array.isArray(list) ? (list as FavPaper[]) : []
  } catch {
    return []
  }
}

export const saveFavs = (list: FavPaper[]) => writeJson(K.favs, list)

/** 收藏/取消收藏，返回新的收藏列表（最新的排最前） */
export async function toggleFav(paper: Paper): Promise<FavPaper[]> {
  const list = await loadFavs()
  const hit = list.findIndex((x) => x.doi === paper.doi)
  const next =
    hit >= 0
      ? list.filter((x) => x.doi !== paper.doi)
      : [{ ...paper, savedAt: Date.now() }, ...list]
  await saveFavs(next)
  return next
}

// ------------------------------------------------------------ 缓存清理

/** 清列表缓存 / 每日缓存 / 译文缓存；收藏、统计、偏好不动 */
export async function clearCaches(): Promise<void> {
  issuesMem = null
  try {
    const keys = await AsyncStorage.getAllKeys()
    const drop = keys.filter(
      (k) =>
        k.startsWith('pd.list.') ||
        k.startsWith('pd.day.') ||
        k.startsWith('pd.seen.') ||
        k === K.zh ||
        k === K.issues ||
        k === K.kwFeed,
    )
    if (drop.length) await AsyncStorage.multiRemove(drop)
  } catch {
    /* 清不掉也不影响使用 */
  }
}

// ------------------------------------------------------ 关注期刊 / 新文提示

/** 关注的期刊。seen = 上次看到的最新内容日（yyyy-mm-dd），比它新的就算「有新文」 */
export type Follow = {
  issn: string
  name: string
  abbr?: string
  impact?: string
  domain?: string
  /** 关注时间 */
  at: number
  /** 已读到的日期水位线 */
  seen: string
}

export async function loadFollows(): Promise<Follow[]> {
  try {
    const raw = await AsyncStorage.getItem(K.follows)
    const list = raw ? JSON.parse(raw) : []
    return Array.isArray(list) ? (list as Follow[]) : []
  } catch {
    return []
  }
}

export const saveFollows = (list: Follow[]) => writeJson(K.follows, list)

/**
 * 关注 / 取消关注。新关注时把水位线设成「今天」：
 * 关注这一刻之前的内容视为已看过，之后真有新文才亮红点，不会一关注就冒提示。
 */
export async function toggleFollow(
  j: { issn: string; name: string; abbr?: string; impact?: string; domain?: string },
  today: string,
): Promise<Follow[]> {
  const list = await loadFollows()
  const hit = list.findIndex((x) => x.issn === j.issn)
  const next = hit >= 0 ? list.filter((x) => x.issn !== j.issn) : [{ ...j, at: Date.now(), seen: today }, ...list]
  await saveFollows(next)
  return next
}

/** 看过某刊之后推进水位线；没有变化就返回 null，避免无谓重渲染 */
export async function markFollowSeen(issn: string, date: string): Promise<Follow[] | null> {
  if (!issn || !date) return null
  const list = await loadFollows()
  const hit = list.find((x) => x.issn === issn)
  if (!hit || date <= (hit.seen || '')) return null
  const next = list.map((x) => (x.issn === issn ? { ...x, seen: date } : x))
  await saveFollows(next)
  return next
}

const NEWS_TTL = 30 * 60 * 1000

/** 各关注刊的最新上线日；半小时内复用，避免每次进页面都打一轮 Crossref */
export async function loadFollowNews(): Promise<Record<string, string> | null> {
  try {
    const raw = await AsyncStorage.getItem(K.followNews)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (!parsed || !parsed.at || Date.now() - parsed.at > NEWS_TTL) return null
    return parsed.map || null
  } catch {
    return null
  }
}

export const saveFollowNews = (map: Record<string, string>) =>
  writeJson(K.followNews, { at: Date.now(), map })

// ------------------------------------------------------------ 每日精选

type PicksCache = { day: string; domain: string; papers: Paper[] }

/** 每日精选一天只选一次（同一天、同领域复用），避免每次刷新都换一批 */
export async function loadPicks(day: string, domain: string): Promise<Paper[] | null> {
  const cached = await readJson<PicksCache>(K.picks, { day: '', domain: '', papers: [] })
  if (cached.day === day && cached.domain === domain && cached.papers.length) return cached.papers
  return null
}

export const savePicks = (day: string, domain: string, papers: Paper[]) =>
  writeJson(K.picks, { day, domain, papers })

/** 当天手动关掉精选卡就别再弹（存在 picksOff 里，跨天自动失效） */
export async function picksDismissed(day: string): Promise<boolean> {
  const v = await readJson<{ day: string }>(K.picksOff, { day: '' })
  return v.day === day
}

export const dismissPicks = (day: string) => writeJson(K.picksOff, { day })

// ------------------------------------------------------------ 关键词订阅

/** 用户自己填的检索词，最多 5 个，存在本机 */
export async function loadKeywords(): Promise<string[]> {
  try {
    const raw = await AsyncStorage.getItem(K.keywords)
    const list = raw ? JSON.parse(raw) : []
    return Array.isArray(list) ? list.filter((x) => typeof x === 'string' && x.trim()).slice(0, 5) : []
  } catch {
    return []
  }
}

export const saveKeywords = (list: string[]) => writeJson(K.keywords, list.slice(0, 5))

export const loadKeywordKind = async (): Promise<string> => {
  const v = await AsyncStorage.getItem(K.kwKind)
  return v || 'all'
}
export const saveKeywordKind = (kind: string) => AsyncStorage.setItem(K.kwKind, kind).catch(() => {})

type KwFeedCache = { day: string; kind: string; papers: Paper[] }

/** 关键词推荐一天只抓一次；跨天或换文章类型自动过期重抓 */
export async function loadKeywordFeed(day: string, kind = 'all'): Promise<Paper[]> {
  try {
    const raw = await AsyncStorage.getItem(K.kwFeed)
    if (!raw) return []
    const parsed = JSON.parse(raw) as KwFeedCache
    return parsed.day === day && (parsed.kind || 'all') === kind && Array.isArray(parsed.papers)
      ? parsed.papers
      : []
  } catch {
    return []
  }
}

export const saveKeywordFeed = (day: string, kind: string, papers: Paper[]) =>
  writeJson(K.kwFeed, { day, kind, papers } satisfies KwFeedCache)


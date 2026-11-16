/**
 * Crossref 数据源。和小程序版同一套接口与字段，只是把 wx.request 换成 fetch。
 * 封面推导规则见 issues()：Nature 直链、Cell 走 PII 校验位、Science 放弃（Cloudflare 反爬）。
 */
import { getJson, mapLimit } from './http'
import type { JournalMeta } from '../data/catalog'
import type { IssueArticle, IssueInfo, Paper } from '../types'

const BASE = 'https://api.crossref.org'
/** Crossref 的 polite pool：带上邮箱能拿到更稳的配额 */
const MAILTO = 'paperdaily@example.com'

export const CNS = [
  { key: 'cell' as const, name: 'Cell', cn: '细胞', issn: '0092-8674', color: '#0e7490', site: 'https://www.cell.com/cell/current' },
  { key: 'nature' as const, name: 'Nature', cn: '自然', issn: '0028-0836', color: '#b91c1c', site: 'https://www.nature.com/nature/current-issue' },
  { key: 'science' as const, name: 'Science', cn: '科学', issn: '0036-8075', color: '#1d4ed8', site: 'https://www.science.org/toc/science/current' },
]

const SELECT =
  'title,author,published,published-print,created,volume,issue,DOI,abstract,type,page,ISSN,container-title,short-container-title'

/** 列表用：不带 abstract，单页能塞更多行、传得更快；摘要进详情时再补 */
const SELECT_LIST =
  'title,author,published,published-print,created,volume,issue,DOI,type,page,ISSN,container-title,short-container-title'

const pad2 = (n: number) => (n < 10 ? '0' + n : String(n))

/**
 * Crossref 的标题常带 JATS 内联标签（<i>、<sub>）和大量换行，
 * 小程序版只抹了空白，标签会原样露出来，这里一并清掉。
 */
export const cleanTitle = (text?: string) =>
  String(text || '')
    .replace(/<[^>]+>/g, '')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#x[0-9a-f]+;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim()

/** Crossref 的 abstract 是 JATS 片段，去标签再展示 */
export function stripJats(text?: string): string {
  return String(text || '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#x[0-9a-f]+;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    // 不少刊把 "ABSTRACT"/"Summary" 直接写在摘要开头，和我们的标签重复
    .replace(/^(abstract|summary)\s*[:.\-–—]?\s*/i, '')
}

export function authorLine(list?: any[]): string {
  const names = (Array.isArray(list) ? list : [])
    .map((a) => (String(a.given || '').trim() + ' ' + String(a.family || a.name || '').trim()).trim())
    .filter(Boolean)
  if (!names.length) return ''
  return names.length > 6 ? names.slice(0, 6).join(', ') + ' et al.' : names.join(', ')
}

/** 作者机构：Crossref 里挂在 author[].affiliation[].name，去重后最多留 3 条 */
export function affiliationLine(list?: any[]): string {
  const names: string[] = []
  ;(Array.isArray(list) ? list : []).forEach((a) => {
    ;(Array.isArray(a.affiliation) ? a.affiliation : []).forEach((f: any) => {
      // 机构名常带尾随的 ", ," 之类的分隔符，先清干净再去重
      const n = cleanTitle(f && f.name)
        .replace(/^[\s,;·]+/, '')
        .replace(/[\s,;·]+$/, '')
        .trim()
      if (n && n.length > 3 && !names.some((x) => x.toLowerCase() === n.toLowerCase())) names.push(n)
    })
  })
  return names.slice(0, 3).join(' · ')
}

const dateOf = (it: any): string => {
  const parts =
    (it['published-print'] && it['published-print']['date-parts'] && it['published-print']['date-parts'][0]) ||
    (it.published && it.published['date-parts'] && it.published['date-parts'][0]) ||
    []
  if (parts.length >= 3) return `${parts[0]}-${pad2(parts[1])}-${pad2(parts[2])}`
  if (parts.length === 2) return `${parts[0]}-${pad2(parts[1])}`
  const created = it.created && it.created['date-time']
  return created ? String(created).slice(0, 10) : ''
}

const issnOf = (it: any): string => {
  const list = it.ISSN
  if (Array.isArray(list) && list.length) return String(list[0]).toUpperCase()
  return ''
}

const todayISO = () => {
  const d = new Date()
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`
}

/**
 * 展示用日期：优先发表日期；但如果发表日期在未来（很多刊提前挂出未来期号），
 * 就改用收录日期并标记 online —— 否则选「最近 3 天」会出现 2027 年的日期，看着像 bug。
 */
function displayDate(it: any): { date: string; kind: 'print' | 'online'; needsPubDate: boolean; pubYm: string } {
  const pub = dateOf(it)
  const created = it.created && it.created['date-time'] ? String(it.created['date-time']).slice(0, 10) : ''
  const pubYm = pub.length === 7 ? pub : ''
  if (!pub) return { date: created, kind: created ? 'online' : 'print', needsPubDate: false, pubYm: '' }
  // 很多刊（Cell/Cell Reports 等）published 只到年月（2026-11），没有具体日。
  // created 是元数据入库日，常比官网 Published online 晚 1 天，不能直接当上线日；
  // 这里暂用 created 占位并标记，列表加载后用 PubMed/S2 补全真实上线日。
  if (pub.length === 7) return { date: created, kind: 'online', needsPubDate: !!created, pubYm }
  if (pub > todayISO() && created) return { date: created, kind: 'online', needsPubDate: false, pubYm: '' }
  return { date: pub, kind: 'print', needsPubDate: false, pubYm: '' }
}

/** Crossref item → 内部 Paper（领域分类由调用方补，避免这里依赖分类逻辑） */
export function toPaper(it: any): Paper | null {
  const title = cleanTitle(it.title && it.title[0])
  const doi = String(it.DOI || '')
  if (!title || !doi) return null
  const shown = displayDate(it)
  return {
    uid: doi,
    doi,
    title,
    authors: authorLine(it.author),
    affiliations: affiliationLine(it.author),
    journal: cleanTitle((it['container-title'] && it['container-title'][0]) || ''),
    journalAbbr: cleanTitle((it['short-container-title'] && it['short-container-title'][0]) || ''),
    issn: issnOf(it),
    date: shown.date,
    dateKind: shown.kind,
    needsPubDate: shown.needsPubDate,
    pubYm: shown.pubYm,
    domain: '',
    domainName: '',
    type: String(it.type || ''),
    url: 'https://doi.org/' + doi,
    abstract: stripJats(it.abstract),
  }
}

type Window = { from: string; until: string }

const ymd = (d: Date) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`

/** 按「上线日期」窗口取最新论文；rows 上限 100（Crossref 单页最大 1000，但 100 足够） */
export async function latestPapers(win: Window, rows = 100): Promise<Paper[]> {
  const filter = [
    `from-created-date:${win.from}`,
    `until-created-date:${win.until}`,
    'type:journal-article',
  ].join(',')
  const url =
    `${BASE}/works?filter=${encodeURIComponent(filter)}&sort=created&order=desc` +
    `&rows=${rows}&select=${SELECT}&mailto=${encodeURIComponent(MAILTO)}`
  const data = await getJson(url)
  const items = (data && data.message && data.message.items) || []
  return items.map(toPaper).filter(Boolean) as Paper[]
}

/**
 * 关键词检索：用 bibliographic 查询，命中标题/作者/刊名。
 * 按**发表日期**卡下限（不是收录日期）：很多刊的 created 是入库日，
 * 用 created 卡「今天」会让正常检索一条都搜不到。
 */
export async function searchPapers(keyword: string, win: Window, rows = 60): Promise<Paper[]> {
  const filter = [`from-pub-date:${win.from}`, 'type:journal-article'].join(',')
  const url =
    `${BASE}/works?query.bibliographic=${encodeURIComponent(keyword)}` +
    `&filter=${encodeURIComponent(filter)}&sort=relevance&order=desc` +
    `&rows=${rows}&select=${SELECT}&mailto=${encodeURIComponent(MAILTO)}`
  const data = await getJson(url)
  const items = (data && data.message && data.message.items) || []
  return items.map(toPaper).filter(Boolean) as Paper[]
}

/** 输入联想：只按相关度取少量标题，不做日期过滤 */
export async function suggestPapers(keyword: string, rows = 6): Promise<Paper[]> {
  const q = String(keyword || '').trim()
  if (q.length < 2) return []
  // 只给近三年的：不然按相关度排会把十几年前的经典老文顶上来
  const since = new Date()
  since.setFullYear(since.getFullYear() - 3)
  const filter = `from-pub-date:${ymd(since)},type:journal-article`
  const url =
    `${BASE}/works?query.bibliographic=${encodeURIComponent(q)}&rows=${rows}&sort=relevance&order=desc` +
    `&filter=${encodeURIComponent(filter)}&select=${SELECT_LIST}&mailto=${encodeURIComponent(MAILTO)}`
  const data = await getJson(url).catch(() => null)
  const items = (data && data.message && data.message.items) || []
  return items.map(toPaper).filter(Boolean) as Paper[]
}

/**
 * 期刊全库检索：Crossref 的 /journals 接口能按刊名搜到平台上所有登记过的期刊。
 * 本地只内置了精选 160 本，靠这个补全「搜不到某本刊」的问题。
 * 缺点：不支持按缩写搜（数据库里没这个字段），所以简称仍走本地 abbr 表。
 */
export async function searchJournalsRemote(keyword: string, rows = 25): Promise<JournalMeta[]> {
  const q = String(keyword || '').trim()
  if (q.length < 2) return []
  // 注意：/journals 路由不支持 select 参数（传了会 400），只能取全字段
  const url = `${BASE}/journals?query=${encodeURIComponent(q)}&rows=${rows}&mailto=${encodeURIComponent(MAILTO)}`
  const data = await getJson(url).catch(() => null)
  const items = (data && data.message && data.message.items) || []
  return items
    .filter((it: any) => it && it.title && Array.isArray(it.ISSN) && it.ISSN.length)
    .map((it: any) => ({
      issn: String(it.ISSN[0]).toUpperCase(),
      name: cleanTitle(it.title),
      abbr: '',
      impact: '',
      domain: '',
    }))
}

export const windowFor = (days: number): Window => {
  const now = new Date()
  const end = ymd(now)
  if (days <= 0) return { from: end, until: end }
  const start = new Date(now.getTime() - days * 86400000)
  return { from: ymd(start), until: end }
}

// ---------------------------------------------------------------- 封面推导

/** Cell 的 PII 校验位：序号每 +1，加权和增 2，故校验值 +2（mod 11，10 记 X） */
export function cellCheck(seq: number): string {
  const v = (((9 + 2 * (seq - 20)) % 11) + 11) % 11
  return v === 10 ? 'X' : String(v)
}

export function cellCover(vol?: string, issue?: string, year?: number): string {
  if (!issue || !year) return ''
  const seq = Number(issue) + 1
  const yy = String((year - 1) % 100).padStart(2, '0')
  return (
    'https://ars.els-cdn.com/content/image/1-s2.0-S00928674' +
    yy +
    'X' +
    String(seq).padStart(4, '0') +
    cellCheck(seq) +
    '-cov200h.gif'
  )
}

/** w440 那张要 580KB，缩略图只有 96dp 宽，用 w200 够了（139KB），省一半以上的等待 */
export function natureCover(vol?: string, issue?: string): string {
  if (!vol || !issue) return ''
  return 'https://media.springernature.com/w200/springer-static/cover-hires/journal/41586/' + vol + '/' + issue
}

/** Science 全站在 Cloudflare 后面，推出来也会 403，直接返回空让页面走版式封面 */
export function scienceCover(): string {
  return ''
}

export function coverOf(key: string, info: { volume?: string; issue?: string; year?: number }): string {
  if (key === 'cell') return cellCover(info.volume, info.issue, info.year)
  if (key === 'nature') return natureCover(info.volume, info.issue)
  return scienceCover()
}

/** 从一批最新文章里找出「当期」：有卷有期，且排除 Nature 的新闻稿（10.1038/d*） */
function pickIssue(items: any[]) {
  let hit: any = null
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

  // Cell 的 published 只到年月，created 那条其实是「上线时间」：拿来补日，但要如实标注
  let dateParts: number[] | null = print.length >= 3 ? print : null
  let dateKind: 'print' | 'online' = 'print'
  if (!dateParts && hit.created && hit.created['date-time']) {
    const d = new Date(hit.created['date-time'])
    if (!isNaN(d.getTime())) {
      dateParts = [d.getFullYear(), d.getMonth() + 1, d.getDate()]
      dateKind = 'online'
    }
  }
  if (!dateParts) dateParts = print.length >= 2 ? print : null

  let lead = hit
  for (const it of items) {
    if (String(it.volume) === String(hit.volume) && String(it.issue) === String(hit.issue) && it.type === 'journal-article') {
      lead = it
      break
    }
  }

  return {
    volume: String(hit.volume),
    issue: String(hit.issue),
    year,
    dateParts,
    dateKind,
    leadTitle: cleanTitle((lead.title && lead.title[0]) || (hit.title && hit.title[0]) || ''),
    leadDoi: String(lead.DOI || ''),
  }
}

/**
 * 「某刊最近的 N 篇」。
 *
 * 别用 /journals/{issn}/works 这个端点：它按刊名反查后再排序，实测单次要 15–22 秒；
 * 换成 /works?filter=issn:xxx 走的是同一套过滤索引，同样结果只要 3–5 秒。
 * 加 from-created-date 是为了收窄扫描范围，只留近一年，不影响「取最新」。
 */
function recentByIssn(issn: string, rows: number, select: string, days = 400): string {
  const d = new Date(Date.now() - days * 86400000)
  const from = `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`
  const filter = `issn:${issn},from-created-date:${from},type:journal-article`
  return (
    `${BASE}/works?filter=${encodeURIComponent(filter)}&rows=${rows}&sort=created&order=desc` +
    `&select=${select}&mailto=${encodeURIComponent(MAILTO)}`
  )
}

async function fetchOne(meta: (typeof CNS)[number]): Promise<IssueInfo> {
  const data = await getJson(recentByIssn(meta.issn, 40, 'volume,issue,type,published,published-print,created,title,DOI', 200), undefined, 2, 13000)
  const items = (data && data.message && data.message.items) || []
  const info = pickIssue(items)
  if (!info) throw new Error('no issue')

  const dateText = info.dateParts
    ? info.dateParts.length >= 3
      ? `${info.dateParts[0]}-${pad2(info.dateParts[1])}-${pad2(info.dateParts[2])}`
      : `${info.dateParts[0]}-${pad2(info.dateParts[1])}`
    : ''

  return {
    ...meta,
    volume: info.volume,
    issue: info.issue,
    year: info.year,
    label: `Vol ${info.volume} · No.${info.issue}`,
    dateText,
    dateKind: info.dateKind,
    leadTitle: info.leadTitle,
    leadDoi: info.leadDoi,
    cover: coverOf(meta.key, info),
  }
}

/**
 * 三刊并发；任一失败不影响其它，失败项带 error。
 * onEach 每刊单独回来就回调一次：谁先到谁先上屏，不用等最慢的那本。
 */
export async function fetchIssues(onEach?: (item: IssueInfo) => void): Promise<IssueInfo[]> {
  return Promise.all(
    CNS.map(async (meta) => {
      let out: IssueInfo
      try {
        out = await fetchOne(meta)
      } catch (e: any) {
        out = { ...meta, error: (e && e.message) || 'fetch fail' }
      }
      if (onEach) onEach(out)
      return out
    }),
  )
}

const dayMs = 86400000

/** yyyy-mm-dd 加减天数 */
export const shiftDay = (day: string, delta: number): string => {
  const [y, m, d] = day.split('-').map(Number)
  const t = new Date(y, m - 1, d).getTime() + delta * dayMs
  const nd = new Date(t)
  return `${nd.getFullYear()}-${pad2(nd.getMonth() + 1)}-${pad2(nd.getDate())}`
}

/**
 * 取「某一天」在给定期刊集合里的**全部**论文。
 *
 * 为什么不能只取前 N 条：Crossref 只能按 created 倒序翻页，全球每天上万篇，
 * rows=100 只够几小时，于是「最近 3 天」永远只显示今天。
 * 这里改成 cursor 深分页（Crossref 官方推荐的深翻页方式），一直翻到当天取完为止，
 * 再用 maxRows 兜底防止异常情况打爆内存。
 */
/**
 * published 的原始精度：'day' = 精确到日，'month' = 只到年月，'' = 没有 published。
 * Crossref 里 Cell/很多月刊的 published 只有年月（如 2026-11），
 * 按 from-pub-date:2026-11-14 这种「某一天」过滤会全部落空 —— 需要靠 created 兜底。
 */
function pubPrecision(it: any): 'day' | 'month' | '' {
  const parts =
    (it.published && it.published['date-parts'] && it.published['date-parts'][0]) ||
    (it['published-print'] && it['published-print']['date-parts'] && it['published-print']['date-parts'][0]) ||
    []
  if (parts.length >= 3) return 'day'
  if (parts.length === 2) return 'month'
  return ''
}

async function fetchByFilter(filter: string, maxRows: number): Promise<any[]> {
  const out: any[] = []
  let cursor = '*'
  let page = 0
  while (out.length < maxRows && page < 6) {
    // cursor 深翻页不支持按 published 排序（会 400），故不加 sort，取回本地再排
    const url =
      `${BASE}/works?filter=${encodeURIComponent(filter)}&rows=1000` +
      `&cursor=${encodeURIComponent(cursor)}&select=${SELECT_LIST}&mailto=${encodeURIComponent(MAILTO)}`
    const data = await getJson(url).catch(() => null)
    const items = (data && data.message && data.message.items) || []
    if (!items.length) break
    out.push(...items)
    const next = data && data.message && data.message['next-cursor']
    page += 1
    if (!next || items.length < 1000) break
    cursor = next
  }
  return out
}

export async function papersInDay(issns: string[], day: string, maxRows = 400): Promise<Paper[]> {
  if (!issns.length) return []
  const issnFilter = issns.map((i) => 'issn:' + i).join(',')
  const ym = day.slice(0, 7) // 2026-11

  // 双口径并发：① 发表日期精确到当天；② 收录日期当天（兜底 published 只到年月的月刊）
  const pubFilter = [issnFilter, `from-pub-date:${day}`, `until-pub-date:${day}`, 'type:journal-article'].join(',')
  const createdFilter = [issnFilter, `from-created-date:${day}`, `until-created-date:${day}`, 'type:journal-article'].join(',')
  const [byPub, byCreated] = await Promise.all([
    fetchByFilter(pubFilter, maxRows),
    fetchByFilter(createdFilter, maxRows),
  ])

  const out: Paper[] = []
  const seen = new Set<string>()
  // ① published 精确到当天的：直接收
  for (const it of byPub) {
    const p = toPaper(it)
    if (!p || seen.has(p.doi)) continue
    seen.add(p.doi)
    out.push(p)
  }
  // ② created 兜底：只收「published 只到年月、且年月=查询月」的文章，
  //    避免把「今天收录但上个月发表」的旧文混进来
  for (const it of byCreated) {
    const prec = pubPrecision(it)
    if (prec === 'day') continue // 精确到日的，应由 ① 覆盖；若不在 ① 说明发表日≠今天，跳过
    const parts =
      (it.published && it.published['date-parts'] && it.published['date-parts'][0]) ||
      (it['published-print'] && it['published-print']['date-parts'] && it['published-print']['date-parts'][0]) ||
      []
    if (prec === 'month') {
      const pubYm = `${parts[0]}-${String(parts[1]).padStart(2, '0')}`
      if (pubYm !== ym) continue // 年月对不上，跳过
    }
    // prec === ''（无 published）也收：对这类文章 created 就是唯一可用的日期
    const p = toPaper(it)
    if (!p || seen.has(p.doi)) continue
    seen.add(p.doi)
    out.push(p)
  }

  return out.slice(0, maxRows)
}

/** 某本期刊的最新论文：期刊面板选中后用它 */
export async function journalLatest(issn: string, rows = 40): Promise<Paper[]> {
  const data = await getJson(recentByIssn(issn, rows, SELECT), undefined, 2, 13000)
  const items = (data && data.message && data.message.items) || []
  return items.map(toPaper).filter(Boolean) as Paper[]
}

const pageStart = (item: any) => {
  const m = String(item.page || '').match(/^\s*(\d+)/)
  return m ? Number(m[1]) : Number.MAX_SAFE_INTEGER
}

/** Crossref 不支持按卷/期过滤，只能拉最新 100 条本地筛 */
export async function fetchIssueArticles(meta: { issn: string }, volume: string, issue: string): Promise<IssueArticle[]> {
  const data = await getJson(recentByIssn(meta.issn, 100, SELECT), undefined, 2, 13000)
  const items = (data && data.message && data.message.items) || []
  return items
    .filter((it: any) => String(it.volume || '') === String(volume) && String(it.issue || '') === String(issue))
    .sort((a: any, b: any) => pageStart(a) - pageStart(b))
    .map((it: any) => ({
      doi: String(it.DOI || ''),
      title: cleanTitle(it.title && it.title[0]),
      authors: authorLine(it.author),
      affiliations: affiliationLine(it.author),
      date: dateOf(it),
      page: String(it.page || ''),
      type: String(it.type || ''),
      abstract: stripJats(it.abstract),
    }))
    .filter((it: IssueArticle) => it.title)
}

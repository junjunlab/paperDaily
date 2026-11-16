/** 全应用共用的数据形状，字段名刻意跟 Crossref / 小程序版本保持一致，便于对照排查 */

export type Paper = {
  uid: string
  doi: string
  title: string
  titleZh?: string
  authors: string
  /** 作者机构（去重后最多 3 条，用 · 连接） */
  affiliations?: string
  journal: string
  journalAbbr?: string
  issn?: string
  date: string
  /** print=按发表日期显示；online=发表日期在未来，改用收录日期 */
  dateKind?: 'print' | 'online'
  /** published 只到年月（2026-11），日期需由 PubMed/S2 补全真实上线日 */
  needsPubDate?: boolean
  /** published 的年月（2026-11），用于校验补全日期是否可信 */
  pubYm?: string
  domain: string
  domainName: string
  type: string
  url: string
  abstract?: string
  abstractZh?: string
  impact?: string
}

export type IssueInfo = {
  key: 'cell' | 'nature' | 'science'
  name: string
  /** 三刊的 ISSN，用于「关注」与查询最新上线日 */
  issn?: string
  cn: string
  color: string
  site: string
  volume?: string
  issue?: string
  year?: number
  label?: string
  dateText?: string
  dateKind?: 'print' | 'online'
  leadTitle?: string
  leadDoi?: string
  cover?: string
  error?: string
}

export type IssueArticle = {
  doi: string
  title: string
  titleZh?: string
  authors: string
  affiliations?: string
  date: string
  page: string
  type: string
  abstract?: string
  abstractZh?: string
}

export type Lang = 'zh' | 'en'

export type Prefs = {
  lang: Lang
  domain: string
  /** today | d3 | d7 | d30 | custom */
  range: string
  /** range === 'custom' 时生效，yyyy-mm-dd */
  customFrom?: string
  customTo?: string
  translateBaseUrl: string
  translateKey: string
  translateModel: string
}

export type ReadingStats = {
  total: number
  byDay: Record<string, number>
  byDomain: Record<string, number>
  lastOpen: string
}

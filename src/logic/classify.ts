/**
 * 领域归属：先看期刊 ISSN（我们的期刊表就是按领域人工分好的），
 * 查不到再按标题/摘要的特征词打分。宁可留空，也不硬塞进错的领域。
 */
import { DOMAIN_BY_ISSN, DOMAIN_SIGNALS, JOURNAL_IF } from '../data/catalog'
import { SUBDOMAINS } from '../data/subdomains'
import { DOMAINS } from './domains'

const TITLE_WEIGHT = 3
const ABSTRACT_WEIGHT = 1
const MIN_SCORE = 3
/** 二级方向：标题命中权重更高；词组比单词更「有指向性」，权重再加倍 */
const SUB_TITLE_WEIGHT = 2
const SUB_ABSTRACT_WEIGHT = 1
/** 低于这个分宁可不分方向（只出现在「全部方向」里），也别塞错 */
const MIN_SUB_SCORE = 2

export const domainName = (key: string, lang: 'zh' | 'en'): string => {
  const d = DOMAINS.find((x) => x.key === key)
  if (!d) return ''
  return lang === 'en' ? d.en : d.name
}

function score(key: string, titleLower: string, abstractLower: string) {
  let total = 0
  let hits = 0
  for (const word of DOMAIN_SIGNALS[key] || []) {
    if (titleLower.includes(word)) {
      total += TITLE_WEIGHT
      hits += 1
    } else if (abstractLower.includes(word)) {
      total += ABSTRACT_WEIGHT
      hits += 1
    }
  }
  return { total, hits }
}

export function classify(issn: string | undefined, title: string, abstract?: string): string {
  const byIssn = issn ? DOMAIN_BY_ISSN[issn.toUpperCase()] : ''
  if (byIssn) return byIssn

  const t = String(title || '').toLowerCase()
  const a = String(abstract || '').toLowerCase()
  let best = ''
  let bestScore = 0
  for (const key of Object.keys(DOMAIN_SIGNALS)) {
    const r = score(key, t, a)
    if (r.total > bestScore) {
      bestScore = r.total
      best = key
    }
  }
  return bestScore >= MIN_SCORE ? best : ''
}

/**
 * 二级方向：按该领域细分表里的关键词打分。
 * 词组（protein structure）比单词（protein）更能说明问题，权重 ×2；
 * 标题命中比摘要命中更可信，权重 ×2。
 * 一个都没命中返回空串 —— 宁可让这篇只出现在「全部方向」里，也别硬塞。
 */
export function classifySub(domainKey: string, title: string, abstract?: string): string {
  const subs = SUBDOMAINS[domainKey]
  if (!subs || !subs.length) return ''
  // 部分源（如 JACS）标题里带换行，短语匹配前先把空白压成单空格
  const norm = (x?: string) => String(x || '').toLowerCase().replace(/\s+/g, ' ')
  const t = norm(title)
  const a = norm(abstract)
  let best = ''
  let bestScore = 0
  for (const sub of subs) {
    let s = 0
    let inTitle = 0
    for (const kw of sub.keywords) {
      const k = String(kw).toLowerCase()
      const phrase = k.includes(' ') || k.includes('-') ? 2 : 1
      if (t.includes(k)) {
        s += phrase * SUB_TITLE_WEIGHT
        inTitle += 1
      } else if (a.includes(k)) {
        s += phrase * SUB_ABSTRACT_WEIGHT
      }
    }
    // 只有摘要里冒出一个泛词（比如摘要提到一次 plant）不足以定性；
    // 标题命中则宽松些。表内已按「从专到泛」排序，同分保持先出现的那个。
    const confident = (inTitle > 0 && s >= MIN_SUB_SCORE) || s >= MIN_SUB_SCORE + 1
    if (confident && s > bestScore) {
      bestScore = s
      best = sub.key
    }
  }
  return best
}

/**
 * 影响因子：期刊表按「刊名」存的键，且大小写/前缀写法不统一（thelancet / the lancet 都有），
 * 所以依次试三种归一化，命中即返回。
 */
export function impactOf(journalName?: string): string {
  const raw = String(journalName || '').trim().toLowerCase()
  if (!raw) return ''
  const candidates = [
    raw,
    raw.replace(/^the\s+/, ''),
    raw.replace(/^the\s+/, '').replace(/[^a-z0-9]+/g, ''),
    raw.replace(/[^a-z0-9]+/g, ''),
  ]
  for (const key of candidates) {
    if (JOURNAL_IF[key]) return JOURNAL_IF[key]
  }
  return ''
}

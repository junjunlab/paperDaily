/**
 * 领域 + 细分方向：把 catalog.ts（小程序那套，较粗）与 subdomains.ts（更细的新表）合并。
 * 有细分表就用细分表，没有就回退到老 subs，保证旧领域不会突然没有二级分类。
 */
import { DOMAINS as BASE, type Domain } from '../data/catalog'
import { SUBDOMAINS, type SubRule } from '../data/subdomains'

export type Sub = { key: string; name: string; en: string; query: string; keywords: string[] }
export type DomainWithSubs = Omit<Domain, 'subs'> & { subs: Sub[] }

const fromRules = (rules: SubRule[]): Sub[] =>
  rules.map((r) => ({ key: r.key, name: r.name, en: r.en, query: '', keywords: r.keywords }))

const fromLegacy = (d: Domain): Sub[] =>
  (d.subs || []).map((s) => ({ key: s.key, name: s.name, en: s.name, query: s.query, keywords: s.keywords }))

export const DOMAINS: DomainWithSubs[] = BASE.map((d) => ({
  ...d,
  subs: SUBDOMAINS[d.key] ? fromRules(SUBDOMAINS[d.key]) : fromLegacy(d),
}))

export const subsOfDomain = (domainKey: string): Sub[] =>
  DOMAINS.find((d) => d.key === domainKey)?.subs || []

/** 方向名（中/英），找不到返回空串 */
export const subName = (domainKey: string, subKey: string, lang: 'zh' | 'en'): string => {
  const sub = subsOfDomain(domainKey).find((s) => s.key === subKey)
  if (!sub) return ''
  return lang === 'en' ? sub.en || sub.key : sub.name
}

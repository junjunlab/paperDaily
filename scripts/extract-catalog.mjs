/**
 * 从微信小程序工程里抽取「领域 / 期刊 / 分类信号」数据，生成 App 可直接用的 catalog.ts。
 * 用法：node scripts/extract-catalog.mjs
 * 目的：避免手抄 200+ 条期刊数据，保证两端同一份事实来源。
 */
import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const SRC = process.env.MP_DIR || 'C:/Users/JunJun/Desktop/agent_devop_pkgs/paperread/paper-daily'
const OUT = path.resolve('src/data/catalog.ts')

global.wx = {
  getStorageSync: () => 'zh',
  setStorageSync: () => {},
  setTabBarItem: () => {},
  getTabBar: () => null,
}

const domainsMod = require(path.join(SRC, 'utils/domains.js'))
const journalsMod = require(path.join(SRC, 'utils/journals.js'))

// DOMAIN_SIGNALS 没导出，直接从源码里抠对象字面量
const text = fs.readFileSync(path.join(SRC, 'utils/domains.js'), 'utf8')
const start = text.indexOf('const DOMAIN_SIGNALS = {')
if (start < 0) throw new Error('找不到 DOMAIN_SIGNALS')
let i = text.indexOf('{', start)
let depth = 0
let end = -1
for (let j = i; j < text.length; j += 1) {
  if (text[j] === '{') depth += 1
  else if (text[j] === '}') {
    depth -= 1
    if (depth === 0) {
      end = j
      break
    }
  }
}
const signals = new Function('return (' + text.slice(i, end + 1) + ')')()
console.log('信号词领域数:', Object.keys(signals).length)

// ISSN → 领域 key
const domainByIssn = {}
Object.keys(journalsMod.JOURNALS).forEach((key) => {
  ;(journalsMod.JOURNALS[key] || []).forEach((j) => {
    const issn = String(j.issn || '').toUpperCase()
    if (issn && !domainByIssn[issn]) domainByIssn[issn] = key
  })
})
console.log('ISSN→领域:', Object.keys(domainByIssn).length, '| 影响因子表:', Object.keys(domainsMod.JOURNAL_IF).length)

// 期刊清单：面板要按「简称/全名/ISSN」搜索，所以 abbr 必须一起抽
const journals = []
const seenIssn = new Set()
Object.keys(journalsMod.JOURNALS).forEach((domain) => {
  ;(journalsMod.JOURNALS[domain] || []).forEach((j) => {
    const issn = String(j.issn || j.id || '').toUpperCase()
    if (!issn || seenIssn.has(issn)) return
    seenIssn.add(issn)
    journals.push({
      issn,
      name: j.name,
      abbr: j.abbr || '',
      impact: j.if || '',
      domain,
    })
  })
})
console.log('期刊清单:', journals.length, '条（含简称）')

const header = `/**
 * 由 scripts/extract-catalog.mjs 从小程序工程自动生成，勿手改。
 * 来源：paper-daily/utils/domains.js、utils/journals.js
 */
`

const body = [
  header,
  'export type Sub = { key: string; name: string; query: string; keywords: string[] }',
  'export type Domain = { key: string; name: string; en: string; color: string; query: string; subs: Sub[] }',
  '',
  'export const DOMAINS: Domain[] = ' + JSON.stringify(domainsMod.DOMAINS, null, 2),
  '',
  'export const ALL_KEY = ' + JSON.stringify(domainsMod.ALL_KEY),
  '',
  '/** ISSN → 领域 key，用于按期刊判定论文归属 */',
  'export const DOMAIN_BY_ISSN: Record<string, string> = ' + JSON.stringify(domainByIssn, null, 2),
  '',
  '/** 刊名 → 影响因子参考值 */',
  'export const JOURNAL_IF: Record<string, string> = ' + JSON.stringify(domainsMod.JOURNAL_IF, null, 2),
  '',
  'export type JournalMeta = { issn: string; name: string; abbr: string; impact: string; domain: string }',
  '',
  '/** 期刊清单：面板按简称/全名/ISSN 搜索靠它 */',
  'export const JOURNALS: JournalMeta[] = ' + JSON.stringify(journals, null, 2),
  '',
  '/** 各领域高区分度特征词，用于按标题/摘要纠正分类 */',
  'export const DOMAIN_SIGNALS: Record<string, string[]> = ' + JSON.stringify(signals, null, 2),
  '',
].join('\n')

fs.mkdirSync(path.dirname(OUT), { recursive: true })
fs.writeFileSync(OUT, body, 'utf8')
console.log('写出', OUT, (body.length / 1024).toFixed(1) + ' KB')

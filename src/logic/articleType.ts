/**
 * 文章类型标注。
 *
 * 现实约束：Crossref / OpenAlex / Semantic Scholar 对 Cell/Nature 的文章几乎一律返回
 * journal-article / article —— 出版社投稿系统 deposition 时没提交 Article/Review 这种细分。
 * 所以这里两条路：
 *   1) Crossref type 本身有细分的（review / editorial / letter / news…）直接用；
 *   2) 其余按标题里的栏目词做启发式（Commentary / Perspective / Review / Protocol…），
 *      这是 Cell/Nature 官网栏目名的通用规律，能补回大部分可见区分度。
 * 都不命中就归为「研究论文」——不说谎，也不留空。
 */

export type ArticleKind =
  | 'research'
  | 'review'
  | 'editorial'
  | 'commentary'
  | 'letter'
  | 'news'
  | 'protocol'
  | 'case'

/** Crossref type → 类型；只认明确细分的，journal-article 交给标题推断 */
const BY_CROSSREF: Record<string, ArticleKind> = {
  review: 'review',
  'journal-article-review': 'review',
  editorial: 'editorial',
  letter: 'letter',
  comment: 'commentary',
  news: 'news',
  'news-article': 'news',
  'case-report': 'case',
  report: 'case',
  proceeding: 'research',
  'conference-paper': 'research',
}

/** 标题栏目词 → 类型（大小写不敏感，按出现顺序匹配，越靠前越具体） */
const TITLE_RULES: { re: RegExp; kind: ArticleKind }[] = [
  { re: /\b(commentary|comment on|response|reply)\b/i, kind: 'commentary' },
  { re: /\b(editorial|guest editorial|introduction|preface|foreword)\b/i, kind: 'editorial' },
  { re: /\b(perspective|viewpoint|opinion|essay|feature)\b/i, kind: 'commentary' },
  { re: /\b(review|overview|state of the art|progress)\b/i, kind: 'review' },
  { re: /\b(protocol|methods|technical note|resource)\b/i, kind: 'protocol' },
  { re: /\b(letter|brief communication|short report)\b/i, kind: 'letter' },
  { re: /\b(news|research highlight|dispatch)\b/i, kind: 'news' },
  { re: /\b(case report|case study)\b/i, kind: 'case' },
]

export function articleKind(type: string, title: string): ArticleKind {
  const t = String(type || '').toLowerCase()
  if (BY_CROSSREF[t]) return BY_CROSSREF[t]
  for (const rule of TITLE_RULES) if (rule.re.test(title)) return rule.kind
  return 'research'
}

const ZH: Record<ArticleKind, string> = {
  research: '研究论文',
  review: '综述',
  editorial: '社论',
  commentary: '评论',
  letter: '通讯',
  news: '新闻',
  protocol: '方法',
  case: '病例',
}
const EN: Record<ArticleKind, string> = {
  research: 'Article',
  review: 'Review',
  editorial: 'Editorial',
  commentary: 'Commentary',
  letter: 'Letter',
  news: 'News',
  protocol: 'Protocol',
  case: 'Case Report',
}

export const articleKindLabel = (kind: ArticleKind, lang: 'zh' | 'en' = 'zh') =>
  (lang === 'zh' ? ZH : EN)[kind]

/** 一步到位：给一条记录算好显示标签 */
export const typeLabel = (type: string, title: string, lang: 'zh' | 'en' = 'zh') =>
  articleKindLabel(articleKind(type, title), lang)

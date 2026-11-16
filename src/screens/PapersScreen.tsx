import React, { useCallback, useEffect, useMemo, useState } from 'react'
import {
  FlatList,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'
import PaperCard from '../components/PaperCard'
import PicksCard from '../components/PicksCard'
import JournalPanel from '../components/JournalPanel'
import WheelRangePicker from '../components/WheelRangePicker'
import DetailModal from '../components/DetailModal'
import { Empty, Header, LangSwitch, Loading } from '../components/ui'
import { searchPapers, shiftDay, suggestPapers, windowFor } from '../api/crossref'
import { fillPubDates } from '../api/pubDates'
import { graphicalAbstractUrl } from '../api/graphicalAbstract'
import { resolveAbstract } from '../api/abstracts'
import { LIST_TRANSLATE_LIMIT, freeQuotaExhausted, hasOwnKey, translateOne, translateTitles } from '../api/translate'
import { classify, classifySub, domainName, impactOf } from '../logic/classify'
import { allIssns, impactNum, journalFromKeyword, journalsOf, type JournalMeta } from '../logic/journals'
import { loadRange, todayStr } from '../logic/feed'
import { dailyPicks } from '../logic/picks'
import { hasNews, type NewsMap } from '../logic/follows'
import { typeLabel } from '../logic/articleType'
import {
  dismissPicks,
  loadListCache,
  loadStats,
  loadZhCache,
  picksDismissed,
  recordRead,
  saveListCache,
  saveZhCache,
  type Follow,
} from '../store/storage'
import { rangeDays, rangeOptions, type Dict } from '../i18n'
import { DOMAINS } from '../logic/domains'
import type { Paper, Prefs } from '../types'
import { colors, radius } from '../theme'

/** 二级方向折叠时默认显示几个（超出的收进「更多 +N」） */
const SUB_COLLAPSED = 8

type Props = {
  prefs: Prefs
  t: Dict
  patchPrefs: (p: Partial<Prefs>) => void
  onOpenSettings: () => void
  /** 已收藏的 DOI 列表（收藏状态由 App 统一持有，两个 tab 才能同步） */
  favDois: string[]
  onToggleFav: (p: Paper) => void
  /** 关注的期刊 + 各刊最新上线日（用于「新」标记） */
  follows: Follow[]
  news: NewsMap
  onToggleFollow: (j: JournalMeta) => void
  /** 看过某刊后推进水位线 */
  onSeen: (issn: string, date: string) => void
  /** 下拉刷新时顺手重查关注刊有没有新文 */
  onRefreshNews: () => void
}

export default function PapersScreen({
  prefs,
  t,
  patchPrefs,
  onOpenSettings,
  favDois,
  onToggleFav,
  follows,
  news,
  onToggleFollow,
  onSeen,
  onRefreshNews,
}: Props) {
  const [raw, setRaw] = useState<Paper[]>([])
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading')
  const [refreshing, setRefreshing] = useState(false)
  const [input, setInput] = useState('')
  const [keyword, setKeyword] = useState('')

  const [detail, setDetail] = useState<Paper | null>(null)
  const [absLoading, setAbsLoading] = useState(false)
  const [calOpen, setCalOpen] = useState(false)
  const [quotaOut, setQuotaOut] = useState(false)
  const [subKey, setSubKey] = useState('all')
  /** 二级方向折叠状态：默认只露前几个，避免一行挤 14 个 */
  const [subOpen, setSubOpen] = useState(false)
  const [journal, setJournal] = useState<JournalMeta | null>(null)
  const [panelOpen, setPanelOpen] = useState(false)
  const [sort, setSort] = useState<'date' | 'impact'>('date')
  const [sugPapers, setSugPapers] = useState<Paper[]>([])
  const [sugLoading, setSugLoading] = useState(false)
  /** 联想面板显式开关：回车/选中/点外面都要能关掉，不能只靠输入框有没有字 */
  const [sugOpen, setSugOpen] = useState(false)
  /** 每日精选：3 篇，按影响因子 + 领域偏好挑 */
  const [picks, setPicks] = useState<Paper[]>([])
  const [picksOff, setPicksOff] = useState(false)
  const [detailZh, setDetailZh] = useState('')
  const [detailGa, setDetailGa] = useState('')
  const [translating, setTranslating] = useState(false)

  const load = useCallback(
    async (force = false) => {
      // 筛选条件一变（领域/时间/期刊/搜索词）就说明用户已经开始看结果，联想面板该收起来
      setSugOpen(false)
      // v5：单刊时间窗为空不再自动塞「最新一期」，旧缓存里混着窗口外文章，不复用
      const cacheKey = ['v6', prefs.domain, prefs.range, prefs.customFrom || '', prefs.customTo || '', keyword, journal?.issn || '', subKey, sort].join('|')

      // 先用上次的结果铺屏（不转圈），再联网刷新
      if (!force) {
        const cached = await loadListCache<Paper>(cacheKey)
        if (cached && cached.length) {
          setRaw(cached)
          setState('ready')
          void translateList(cached)
        } else {
          setState('loading')
        }
      }

      try {
        const win =
          prefs.range === 'custom' && prefs.customFrom
            ? { from: prefs.customFrom, until: prefs.customTo || prefs.customFrom }
            : windowFor(rangeDays(prefs.range))
          // 期刊优先；否则按「本领域收录的期刊」+ 时间窗分桶拉，
        // 这样选「3 天」就真的覆盖 3 天，而不是只有最近几小时。
        const issns = journal
          ? [journal.issn]
          : prefs.domain === 'all'
            ? allIssns()
            : journalsOf(prefs.domain).map((j) => j.issn)

        const days = (() => {
          if (prefs.range === 'custom' && prefs.customFrom) {
            const from = new Date(prefs.customFrom + 'T00:00:00')
            const until = new Date((prefs.customTo || prefs.customFrom) + 'T00:00:00')
            const diff = Math.round((until.getTime() - from.getTime()) / 86400000)
            return Number.isFinite(diff) && diff >= 0 ? diff : 0
          }
          return rangeDays(prefs.range)
        })()

        // 选定期刊时也走时间窗分桶取数，这样「今天/3天/7天/自定义」对单刊同样生效。
        // 关键词检索不受「今天/3天」限制：那是浏览用的时间窗，
        // 拿来卡搜索会出现「输入 ribo 回车 → 没有匹配的论文」。检索固定看近两年。
        const list = keyword && !journal
          ? await searchPapers(keyword, { from: shiftDay(todayStr(), -730), until: win.until }, 60)
          : await loadRange(issns, days, journal?.issn || prefs.domain, days > 30 ? 200 : 300)
        // 严格按所选时间窗：窗内没有文章就空着，绝不拿「该刊最新一期」顶上
        // （以前那样做，选「3 天」会冒出 11-02、11-04 的旧文）。
        const decorated = list.map((p) => {
          const domain = classify(p.issn, p.title, p.abstract)
          return { ...p, domain, impact: impactOf(p.journal) }
        })
        // published 只到年月的刊（Cell/Cell Reports…）：Crossref created 是入库日，
        // 常比官网 Published online 晚一天。后台异步补全真实上线日，不阻塞首屏。
        // 校正后可能落到时间窗之外（created 是入库日，真实上线日更早），这类要剔掉：
        // 选「3 天」就不该出现 13 号及更早的文章。
        const inWin = (d: string) => !!d && d >= win.from && d <= win.until
        void (async () => {
          const need = decorated
            .filter((p) => p.needsPubDate)
            .slice(0, 12)
            .map((p) => ({ doi: p.doi, pubYm: p.pubYm || '', created: p.date }))
          if (!need.length) return
          const dates = await fillPubDates(need)
          if (!Object.keys(dates).length) return
          setRaw((cur) =>
            cur
              .map((p) => (dates[p.doi] ? { ...p, date: dates[p.doi], needsPubDate: false } : p))
              .filter((p) => (keyword ? true : inWin(p.date)))
              .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0)),
          )
        })()
        // 取数按「收录日期」分桶，卡片显示的是「上线日期」，两者可能差一两天；
        // 这里再按显示日期收一次，保证列表里不会出现所选区间之外的条目。
        const scoped =
          !keyword && prefs.range === 'custom' && prefs.customFrom
            ? decorated.filter((p) => {
                const from = prefs.customFrom as string
                const until = prefs.customTo || from
                const cmp = (d: string, edge: string) =>
                  d.length === 7 ? d <= edge.slice(0, 7) : d <= edge
                const cmpFrom = (d: string, edge: string) =>
                  d.length === 7 ? d >= edge.slice(0, 7) : d >= edge
                return !!p.date && cmpFrom(p.date, from) && cmp(p.date, until)
              })
            : decorated
        // 选定期刊后，期刊本身就是最精确的筛选：不再叠加领域/子领域 chip，
        // 否则「生命科学」chip 会把 Nature Medicine（属医学）的文章全滤掉。
        const byDomain = journal || prefs.domain === 'all' ? scoped : scoped.filter((p) => p.domain === prefs.domain)
        // 子领域：只有未选期刊、且选中具体领域时才可用
        const withSub = byDomain.map((p) => ({ ...p, sub: classifySub(p.domain, p.title, p.abstract) }))
        // 方向 key 可能来自上一版细分表（或切换领域后残留），失效时按「全部方向」处理
        const subList = prefs.domain === 'all' ? [] : DOMAINS.find((d) => d.key === prefs.domain)?.subs || []
        const validSub = subKey !== 'all' && subList.some((x) => x.key === subKey)
        const bySub = journal || !validSub ? withSub : withSub.filter((p) => p.sub === subKey)
        const sorted = bySub.slice().sort((a, b) =>
          sort === 'impact' ? impactNum(b.impact || '') - impactNum(a.impact || '') : (a.date < b.date ? 1 : a.date > b.date ? -1 : 0),
        )
        const capped = sorted.slice(0, 60)
        setRaw(capped)
        setState('ready')
        // 正在看这本刊：把关注水位线推到它的最新一篇，「新」标记随之消失
        if (journal) {
          const newest = capped
            .map((p) => (p.date && p.date.length === 7 ? p.date + '-01' : p.date))
            .filter(Boolean)
            .sort()
            .pop()
          if (newest) onSeen(journal.issn, newest)
        }
        void saveListCache(cacheKey, capped)
        void translateList(capped)
      } catch {
        setState('error')
      }
    },
    [prefs.domain, prefs.range, prefs.customFrom, prefs.customTo, keyword, journal, subKey, sort, onSeen],
  )

  /**
   * 每日精选：进页面算一次（同一天同领域会命中缓存），不跟着时间窗变化。
   * 只取「今天」，今天不够 3 篇才回退到近 7 天 —— 每行都带自己的日期，不会看着像筛选失效。
   */
  useEffect(() => {
    let alive = true
    void (async () => {
      const day = todayStr()
      if (await picksDismissed(day)) {
        if (alive) setPicksOff(true)
        return
      }
      if (alive) setPicksOff(false)
      const stats = await loadStats()
      const list = await dailyPicks(prefs, stats).catch(() => [] as Paper[])
      if (!alive || !list.length) return
      setPicks(list)
      if (prefs.lang !== 'zh') return
      const cache = await loadZhCache()
      if (!alive) return
      setPicks((prev) => prev.map((p) => (cache[p.doi] ? { ...p, titleZh: cache[p.doi] } : p)))
      const missing = list.filter((p) => !cache[p.doi])
      if (!missing.length) return
      const at = new Map(missing.map((p, i) => [p.doi, i]))
      await translateTitles(prefs, missing.map((p) => p.title), (partial) => {
        if (!alive) return
        setPicks((prev) =>
          prev.map((p) => {
            const i = at.get(p.doi)
            const text = i === undefined ? '' : partial[i]
            return text ? { ...p, titleZh: text } : p
          }),
        )
      })
    })()
    return () => {
      alive = false
    }
    // 只跟「领域 / 语言」走：时间窗、排序变化不该换一批精选
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prefs.domain, prefs.lang])

  /** 标题翻译是加分项：失败不影响列表，翻完一批刷一批 */
  const translateList = useCallback(
    async (list: Paper[]) => {
      if (prefs.lang !== 'zh' || !list.length) return
      const cache = await loadZhCache()
      // 先把缓存里已有的铺满屏幕，再只翻缺的那些
      setRaw((prev) => prev.map((p) => (cache[p.doi] ? { ...p, titleZh: cache[p.doi] } : p)))
      // 免密钥通道有每日字符配额，只自动翻前一批，剩下的等用户点开详情再翻
      const limit = hasOwnKey(prefs) ? list.length : LIST_TRANSLATE_LIMIT
      const missing = list.slice(0, limit).filter((p) => !cache[p.doi])
      if (!missing.length) {
        setRaw((prev) => prev.map((p) => (cache[p.doi] ? { ...p, titleZh: cache[p.doi] } : p)))
        return
      }
      const next = { ...cache }
      // 按批回填：翻好一批就先显示，别让用户干等十几秒
      const flush = (partial: string[]) => {
        partial.forEach((text, i) => {
          if (text && missing[i]) next[missing[i].doi] = text
        })
        setRaw((prev) => prev.map((p) => (next[p.doi] ? { ...p, titleZh: next[p.doi] } : p)))
      }
      await translateTitles(prefs, missing.map((p) => p.title), flush)
      await saveZhCache(next)
      setQuotaOut(freeQuotaExhausted())
    },
    [prefs],
  )

  useEffect(() => {
    void load()
  }, [load])

  /** 输入即联想：期刊走本地（零延迟），论文标题走 Crossref（防抖 350ms） */
  useEffect(() => {
    const q = input.trim()
    if (q.length < 2) {
      setSugPapers([])
      setSugLoading(false)
      setSugOpen(false)
      return
    }
    // 重新输入就把面板打开（回车关掉后再改一个字，应当又能联想）
    setSugOpen(true)
    setSugLoading(true)
    let alive = true
    const timer = setTimeout(async () => {
      const list = await suggestPapers(q, 5).catch(() => [] as Paper[])
      if (!alive) return
      setSugPapers(list)
      setSugLoading(false)
    }, 350)
    return () => {
      alive = false
      clearTimeout(timer)
    }
  }, [input])

  /** 切到中文时先用本机缓存铺一遍：这一步不联网，几乎立刻出中文 */
  useEffect(() => {
    if (prefs.lang !== 'zh') return
    let alive = true
    void (async () => {
      const cache = await loadZhCache()
      if (!alive) return
      setRaw((prev) => prev.map((p) => (cache[p.doi] ? { ...p, titleZh: cache[p.doi] } : p)))
      if (raw.length) void translateList(raw)
    })()
    return () => {
      alive = false
    }
    // raw 只用作触发条件，不跟着它重跑
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prefs.lang])

  const activeSubs = useMemo(
    () => (prefs.domain === 'all' ? [] : DOMAINS.find((d) => d.key === prefs.domain)?.subs || []),
    [prefs.domain],
  )
  const shownSubs = useMemo(() => {
    if (subOpen) return activeSubs
    const head = activeSubs.slice(0, SUB_COLLAPSED)
    const picked = activeSubs.find((s) => s.key === subKey)
    if (picked && !head.includes(picked)) return [picked, ...head].slice(0, SUB_COLLAPSED)
    return head
  }, [activeSubs, subOpen, subKey])
  const favSet = useMemo(() => new Set(favDois), [favDois])
  const followSet = useMemo(() => new Set(follows.map((f) => f.issn)), [follows])
  const followMeta = useCallback(
    (f: Follow): JournalMeta => ({
      issn: f.issn,
      name: f.name,
      abbr: f.abbr || f.name,
      impact: f.impact || '',
      domain: f.domain || '',
    }),
    [],
  )
  /** 搜索词正好是某本期刊的简称/全名时，给一条「查看该刊」的捷径 */
  const journalHit = useMemo(() => (keyword ? journalFromKeyword(keyword) : null), [keyword])

  // 英文模式下把译文摘掉 + 实时排序。
  // 排序放在这里（而非 load 里）：日期是后台异步补全的，补全后 raw 变了，
  // 这里会重排，保证「最新」始终按修正后的真实日期降序，不会 13 号排在 14 号前。
  const view = useMemo(() => {
    const mapped = raw.map((p) => ({
      ...p,
      domainName: domainName(p.domain, prefs.lang),
      titleZh: prefs.lang === 'zh' ? p.titleZh : undefined,
    }))
    return mapped.sort((a, b) =>
      sort === 'impact'
        ? impactNum(b.impact || '') - impactNum(a.impact || '')
        : a.date < b.date
          ? 1
          : a.date > b.date
            ? -1
            : 0,
    )
  }, [raw, prefs.lang, sort])

  /** 摘要补全：Crossref 没给就顺着 EPMC / OpenAlex / S2 找，找到就顺手回填列表 */
  const fillAbstract = useCallback(async (p: Paper) => {
    setAbsLoading(true)
    try {
      const res = await resolveAbstract(p.doi)
      if (res.text) {
        setDetail((cur) => (cur && cur.doi === p.doi ? { ...cur, abstract: res.text } : cur))
        setRaw((prev) => prev.map((x) => (x.doi === p.doi ? { ...x, abstract: res.text } : x)))
        return res.text
      }
      return ''
    } finally {
      setAbsLoading(false)
    }
  }, [])

  /**
   * 自动翻译摘要：中文模式打开详情即触发。key 用 'abs:' 前缀，
   * 避免和标题译文（裸 doi）互相覆盖。
   */
  const translateAbstract = useCallback(
    async (p: Paper, abstract: string) => {
      if (!abstract) return
      setTranslating(true)
      const cache = await loadZhCache()
      const key = 'abs:' + p.doi
      if (cache[key]) {
        setDetailZh(cache[key])
        setTranslating(false)
        return
      }
      const text = await translateOne(prefs, abstract)
      if (text) {
        setDetailZh(text)
        await saveZhCache({ ...cache, [key]: text })
      }
      setTranslating(false)
    },
    [prefs],
  )

  const openDetail = async (p: Paper) => {
    setDetail(p)
    setDetailZh('')
    setDetailGa('')
    void recordRead(p.doi, p.domain)
    // 图形摘要：仅 Elsevier 刊异步取，取不到就不显示
    void graphicalAbstractUrl(p.doi).then(setDetailGa)
    // 中文模式下自动翻译摘要：有摘要直接翻；没有先补全再翻。
    if (prefs.lang === 'zh') {
      if (p.abstract) void translateAbstract(p, p.abstract)
      else {
        void (async () => {
          const text = await fillAbstract(p)
          if (text) void translateAbstract(p, text)
        })()
      }
    }
  }

  const doTranslate = () => {
    if (!detail?.abstract) return
    void translateAbstract(detail, detail.abstract)
  }

  const submitSearch = () => {
    const k = input.trim()
    setKeyword(k)
    // 回车即「已确认搜索」：把联想面板收起来，否则它盖在结果上又关不掉
    setSugOpen(false)
    if (!k) void load()
  }

  return (
    <View style={styles.root}>
      <Header
        brand={t.brand}
        sub={`${new Date().toISOString().slice(0, 10)} · ${t.headerSub}`}
        right={
          <>
            <LangSwitch lang={prefs.lang} onChange={(lang) => patchPrefs({ lang })} />
            <Pressable onPress={onOpenSettings} hitSlop={10} style={styles.gear}>
              <Text style={styles.gearText}>⚙</Text>
            </Pressable>
          </>
        }
      />

      <View style={styles.searchWrap}>
        <TextInput
          value={input}
          onChangeText={setInput}
          onSubmitEditing={submitSearch}
          onFocus={() => {
            if (input.trim().length >= 2) setSugOpen(true)
          }}
          onBlur={() => {
            // 点联想项时先触发 blur；延迟一点再关，免得把这次点击吞掉
            setTimeout(() => setSugOpen(false), 180)
          }}
          placeholder={t.searchPlaceholder}
          placeholderTextColor={colors.faint}
          returnKeyType="search"
          style={styles.searchInput}
        />
        {!!input && (
          <Pressable
            onPress={() => {
              setInput('')
              setKeyword('')
              setSugOpen(false)
              setSugPapers([])
            }}
            hitSlop={8}
          >
            <Text style={styles.clear}>×</Text>
          </Pressable>
        )}
      </View>

      {sugOpen && input.trim().length >= 2 && (sugPapers.length > 0 || sugLoading) && (
        <View style={styles.sugPanel}>
          <Pressable onPress={submitSearch} style={styles.sugRow}>
            <Text style={styles.sugSearch} numberOfLines={1}>
              {t.sugSearchFor}「{input.trim()}」
            </Text>
          </Pressable>

          {sugPapers.length > 0 && <Text style={styles.sugLabel}>{t.sugPapers}</Text>}
          {sugPapers.map((p) => (
            <Pressable
              key={'p' + p.doi}
              onPress={() => {
                setInput('')
                setSugPapers([])
                setSugOpen(false)
                void openDetail(p)
              }}
              style={styles.sugRow}
            >
              <Text style={styles.sugTitle} numberOfLines={1}>
                {p.title}
              </Text>
              <Text style={styles.sugMeta} numberOfLines={1}>
                {[p.journalAbbr || p.journal, p.date].filter(Boolean).join(' · ')}
              </Text>
            </Pressable>
          ))}

          {sugLoading && (
            <Text style={styles.sugLoading}>{t.loading}</Text>
          )}
        </View>
      )}

      <View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
          <Pressable
            onPress={() => {
              patchPrefs({ domain: 'all' })
              setSubKey('all')
              setSubOpen(false)
            }}
            style={[styles.chip, prefs.domain === 'all' && styles.chipActive]}
          >
            <Text style={[styles.chipText, prefs.domain === 'all' && styles.chipTextActive]}>
              {prefs.lang === 'en' ? 'All' : '全部'}
            </Text>
          </Pressable>
          {DOMAINS.map((d) => {
            const active = prefs.domain === d.key
            return (
              <Pressable
                key={d.key}
                onPress={() => {
                  patchPrefs({ domain: d.key })
                  setSubKey('all')
                  setSubOpen(false)
                }}
                style={[styles.chip, active && styles.chipActive]}
              >
                <Text style={[styles.chipText, active && styles.chipTextActive]}>
                  {prefs.lang === 'en' ? d.en : d.name}
                </Text>
              </Pressable>
            )
          })}
        </ScrollView>

        {/* 二级方向：细分后条数多，改成换行铺开，默认只露两行，其余折叠 */}
        {activeSubs.length > 0 && (
          <View style={styles.subWrap}>
            <Pressable
              onPress={() => setSubKey('all')}
              style={[styles.subChip, subKey === 'all' && styles.subChipActive]}
            >
              <Text style={[styles.subText, subKey === 'all' && styles.subTextActive]}>{t.subAll}</Text>
            </Pressable>
            {shownSubs.map((sub) => {
              const active = subKey === sub.key
              return (
                <Pressable
                  key={sub.key}
                  onPress={() => setSubKey(active ? 'all' : sub.key)}
                  style={[styles.subChip, active && styles.subChipActive]}
                >
                  <Text style={[styles.subText, active && styles.subTextActive]}>
                    {prefs.lang === 'en' ? sub.en || sub.key : sub.name}
                  </Text>
                </Pressable>
              )
            })}
            {activeSubs.length > SUB_COLLAPSED && (
              <Pressable onPress={() => setSubOpen((v) => !v)} style={styles.subChip}>
                <Text style={styles.subMore}>
                  {subOpen ? t.subLess : `${t.subMore} +${activeSubs.length - SUB_COLLAPSED}`}
                </Text>
              </Pressable>
            )}
          </View>
        )}

        {/* 期刊条：跟小程序一样给出「当前期刊 + 搜索/切换」入口 */}
        <View style={styles.journalBar}>
          <Pressable onPress={() => setPanelOpen(true)} style={styles.journalBtn}>
            <Text style={styles.journalLabel}>{t.journalBarLabel}</Text>
            <Text style={styles.journalName} numberOfLines={1}>
              {journal ? journal.name : t.journalAll}
            </Text>
            <Text style={styles.journalSwitch}>{t.journalSwitch}</Text>
            <Text style={styles.journalChevron}>▾</Text>
          </Pressable>
          {!!journal && (
            <>
              <Pressable
                onPress={() => onToggleFollow(journal)}
                hitSlop={10}
                style={styles.followBtn}
                accessibilityLabel={followSet.has(journal.issn) ? t.followOn : t.followOff}
              >
                <Text style={[styles.followStar, followSet.has(journal.issn) && styles.followStarOn]}>
                  {followSet.has(journal.issn) ? '★' : '☆'}
                </Text>
              </Pressable>
              <Pressable onPress={() => setJournal(null)} hitSlop={10} style={styles.journalClear}>
                <Text style={styles.journalClearText}>×</Text>
              </Pressable>
            </>
          )}
        </View>

        {/* 关注的期刊：一行横滑的快捷入口，有新文时带红点，省得一本本点进去看 */}
        {follows.length > 0 && (
          <View style={styles.followStrip}>
            <Text style={styles.followLabel}>{t.followStrip}</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={{ flex: 1 }}
              contentContainerStyle={styles.followRow}
            >
              {follows.map((f) => {
                const active = journal?.issn === f.issn
                const fresh = hasNews(f, news[f.issn])
                return (
                  <Pressable
                    key={f.issn}
                    onPress={() => setJournal(followMeta(f))}
                    style={[styles.followChip, active && styles.followChipActive]}
                  >
                    <Text
                      style={[styles.followChipText, active && styles.followChipTextActive]}
                      numberOfLines={1}
                    >
                      {f.abbr || f.name}
                    </Text>
                    {fresh && (
                      <View style={styles.newDot}>
                        <Text style={styles.newDotText}>{t.news}</Text>
                      </View>
                    )}
                  </Pressable>
                )
              })}
            </ScrollView>
          </View>
        )}

        {/* 排序 */}
        <View style={[styles.chipRow, { flexDirection: 'row', alignItems: 'center' }]}>
          {([
            { key: 'date' as const, label: t.sortLatest },
            { key: 'impact' as const, label: t.sortImpact },
          ]).map((opt) => (
            <Pressable
              key={opt.key}
              onPress={() => setSort(opt.key)}
              style={[styles.rangeChip, sort === opt.key && styles.rangeChipActive]}
            >
              <Text style={[styles.rangeText, sort === opt.key && styles.rangeTextActive]}>{opt.label}</Text>
            </Pressable>
          ))}
        </View>

        {keyword && !journal ? (
          // 检索模式下时间窗不生效（检索固定看近两年），把 chip 换成说明，避免误以为还能筛
          <View style={styles.searchScope}>
            <Text style={styles.searchScopeText} numberOfLines={1}>
              {t.searchScope}「{keyword}」
            </Text>
            <Pressable
              onPress={() => {
                setInput('')
                setKeyword('')
              }}
              hitSlop={8}
            >
              <Text style={styles.searchScopeClear}>{t.clear}</Text>
            </Pressable>
          </View>
        ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
            {rangeOptions(prefs.lang).map((r) => {
              const active = prefs.range === r.key
              return (
                <Pressable
                  key={r.key}
                  onPress={() => patchPrefs({ range: r.key })}
                  style={[styles.rangeChip, active && styles.rangeChipActive]}
                >
                  <Text style={[styles.rangeText, active && styles.rangeTextActive]}>{r.name}</Text>
                </Pressable>
              )
            })}
            <Pressable
              onPress={() => setCalOpen(true)}
              style={[styles.rangeChip, prefs.range === 'custom' && styles.rangeChipActive]}
            >
              <Text style={[styles.rangeText, prefs.range === 'custom' && styles.rangeTextActive]}>
                {prefs.range === 'custom' && prefs.customFrom
                  ? `${prefs.customFrom.slice(5)}~${(prefs.customTo || prefs.customFrom).slice(5)}`
                  : t.cvCustom}
              </Text>
            </Pressable>
          </ScrollView>
        )}
      </View>

      {!!keyword && !journal && !!journalHit && (
        <Pressable
          onPress={() => {
            setJournal(journalHit)
            setInput('')
            setKeyword('')
          }}
          style={styles.hitBar}
        >
          <Text style={styles.hitText} numberOfLines={1}>
            {t.foundJournal}《{journalHit.name}》 · {t.openJournal}
          </Text>
          <Text style={styles.hitArrow}>›</Text>
        </Pressable>
      )}

      {quotaOut && prefs.lang === 'zh' && (
        <Pressable onPress={onOpenSettings} style={styles.quotaBar}>
          <Text style={styles.quotaText}>{t.quotaTip}</Text>
        </Pressable>
      )}

      {state === 'loading' && <Loading label={t.loading} />}

      {state === 'error' && <Empty title={t.loadFail} tip={t.emptyTip} actionLabel={t.retry} onAction={() => load(true)} />}

      {state === 'ready' && (
        <FlatList
          data={view}
          keyExtractor={(item) => item.uid}
          renderItem={({ item }) => (
            <PaperCard
              paper={item}
              t={t}
              lang={prefs.lang}
              onPress={() => void openDetail(item)}
              fav={favSet.has(item.doi)}
              onToggleFav={() => onToggleFav(item)}
            />
          )}
          contentContainerStyle={{ paddingTop: 4, paddingBottom: 24 }}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            picks.length > 0 && !picksOff && view.length > 0 && !journal && !keyword ? (
              <PicksCard
                picks={picks}
                t={t}
                lang={prefs.lang}
                onOpen={(p) => void openDetail(p)}
                onDismiss={() => {
                  void dismissPicks(todayStr())
                  setPicksOff(true)
                }}
              />
            ) : undefined
          }
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              tintColor={colors.primary}
              onRefresh={async () => {
                setRefreshing(true)
                await load(true)
                onRefreshNews()
                setRefreshing(false)
              }}
            />
          }
          ListEmptyComponent={
            <Empty
              title={keyword ? t.emptySearch : t.emptyToday}
              tip={keyword ? t.emptySearchTip : t.emptyTip}
              actionLabel={keyword ? t.clear : prefs.range === 'today' ? rangeOptions(prefs.lang)[2].name : undefined}
              onAction={() => {
                if (keyword) {
                  setInput('')
                  setKeyword('')
                } else {
                  patchPrefs({ range: 'd7' })
                }
              }}
            />
          }
          ListFooterComponent={
            view.length > 0 ? (
              <Text style={styles.foot}>
                {view.length}
                {t.countSuffix}
              </Text>
            ) : undefined
          }
        />
      )}

      <JournalPanel
        visible={panelOpen}
        domain={prefs.domain}
        current={journal}
        t={t}
        onPick={(j) => setJournal(j)}
        onClose={() => setPanelOpen(false)}
        follows={follows}
        news={news}
        onToggleFollow={onToggleFollow}
      />

      <WheelRangePicker
        visible={calOpen}
        from={prefs.customFrom}
        to={prefs.customTo}
        t={t}
        lang={prefs.lang}
        onApply={(from, to) => {
          patchPrefs({ range: 'custom', customFrom: from, customTo: to })
          setCalOpen(false)
        }}
        onClose={() => setCalOpen(false)}
      />

      <DetailModal
        visible={!!detail}
        data={
          detail
            ? {
                title: detail.title,
                titleZh: prefs.lang === 'zh' ? detail.titleZh : undefined,
                journal: [detail.journal, detail.impact ? `IF ${detail.impact}` : ''].filter(Boolean).join(' · '),
                meta: [typeLabel(detail.type, detail.title, prefs.lang), detail.date].filter(Boolean).join(' · '),
                authors: detail.authors,
                affiliations: detail.affiliations,
                abstract: detail.abstract,
                abstractZh: prefs.lang === 'zh' ? detailZh : undefined,
                graphicalAbstract: detailGa || undefined,
                url: detail.url,
              }
            : null
        }
        t={t}
        translating={translating}
        canTranslate={prefs.lang === 'zh'}
        onClose={() => setDetail(null)}
        onTranslate={() => void doTranslate()}
        onRetryAbstract={() => {
          if (detail) void fillAbstract(detail)
        }}
        retrying={absLoading}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, minWidth: 0, backgroundColor: colors.bg },
  gear: { width: 30, height: 30, alignItems: 'center', justifyContent: 'center' },
  gearText: { fontSize: 17, color: colors.muted },

  searchWrap: {
    marginHorizontal: 16,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: radius.md,
    paddingHorizontal: 12,
    height: 42,
    borderWidth: 1,
    borderColor: colors.line,
  },
  searchInput: { flex: 1, fontSize: 14, color: colors.ink, padding: 0 },
  clear: { fontSize: 18, color: colors.faint, paddingHorizontal: 4 },

  chipRow: { paddingHorizontal: 16, paddingBottom: 8 },
  searchScope: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingBottom: 10,
  },
  searchScopeText: { flex: 1, fontSize: 12.5, color: colors.ink2 },
  searchScopeClear: { fontSize: 12.5, color: colors.primary, fontWeight: '600' },
  chip: {
    paddingHorizontal: 14,
    height: 32,
    borderRadius: radius.pill,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.line,
    justifyContent: 'center',
    marginRight: 8,
  },
  chipActive: { backgroundColor: colors.ink, borderColor: colors.ink },
  chipText: { fontSize: 13, color: colors.ink2 },
  chipTextActive: { color: '#fff', fontWeight: '600' },

  rangeChip: {
    paddingHorizontal: 12,
    height: 28,
    borderRadius: radius.pill,
    backgroundColor: 'transparent',
    justifyContent: 'center',
    marginRight: 6,
  },
  rangeChipActive: { backgroundColor: colors.primarySoft },
  rangeText: { fontSize: 12.5, color: colors.muted },
  rangeTextActive: { color: colors.primary, fontWeight: '700' },

  foot: { textAlign: 'center', color: colors.faint, fontSize: 11, marginTop: 8, marginBottom: 16 },

  subWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 4,
    rowGap: 6,
  },
  subChip: {
    paddingHorizontal: 11,
    height: 27,
    borderRadius: radius.pill,
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: colors.line,
    justifyContent: 'center',
    marginRight: 6,
  },
  subChipActive: { backgroundColor: colors.primarySoft, borderColor: colors.primarySoft },
  subText: { fontSize: 12.5, color: colors.muted },
  subTextActive: { color: colors.primary, fontWeight: '700' },
  subMore: { fontSize: 12.5, color: colors.primary, fontWeight: '600' },

  journalBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, marginBottom: 8 },
  journalBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.line,
    paddingHorizontal: 12,
    height: 32,
    flex: 1,
    minWidth: 0,
  },
  journalLabel: { fontSize: 11, color: colors.faint, marginRight: 6 },
  journalName: { flex: 1, fontSize: 12.5, color: colors.ink2, fontWeight: '600' },
  journalSwitch: { fontSize: 11, color: colors.primary, fontWeight: '600', marginLeft: 6 },
  journalChevron: { fontSize: 10, color: colors.faint, marginLeft: 4 },
  journalClear: { width: 28, height: 28, alignItems: 'center', justifyContent: 'center' },
  journalClearText: { fontSize: 18, color: colors.faint },
  followBtn: { width: 30, height: 30, alignItems: 'center', justifyContent: 'center' },
  followStar: { fontSize: 18, color: colors.faint, lineHeight: 20 },
  followStarOn: { color: '#f59e0b' },

  followStrip: { flexDirection: 'row', alignItems: 'center', paddingLeft: 16, marginBottom: 6 },
  followLabel: { fontSize: 10.5, color: colors.faint, marginRight: 8 },
  followRow: { paddingRight: 16, alignItems: 'center' },
  followChip: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 26,
    paddingHorizontal: 10,
    borderRadius: radius.pill,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.line,
    marginRight: 6,
    maxWidth: 150,
  },
  followChipActive: { backgroundColor: colors.ink, borderColor: colors.ink },
  followChipText: { fontSize: 11.5, color: colors.ink2, fontWeight: '600' },
  followChipTextActive: { color: '#fff' },
  newDot: {
    marginLeft: 5,
    backgroundColor: colors.danger,
    borderRadius: 5,
    paddingHorizontal: 4,
    paddingVertical: 0.5,
  },
  newDotText: { fontSize: 8.5, color: '#fff', fontWeight: '800' },

  hitBar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginBottom: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: radius.sm,
    backgroundColor: colors.primarySoft,
  },
  hitText: { flex: 1, fontSize: 12, color: colors.primary, fontWeight: '600' },
  hitArrow: { fontSize: 16, color: colors.primary, marginLeft: 6 },

  sugPanel: {
    marginHorizontal: 16,
    marginBottom: 8,
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.line,
    paddingVertical: 4,
    shadowColor: '#0f172a',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
  sugRow: { paddingHorizontal: 14, paddingVertical: 9 },
  sugSearch: { fontSize: 13, color: colors.primary, fontWeight: '600' },
  sugLabel: {
    fontSize: 10.5,
    color: colors.faint,
    fontWeight: '700',
    paddingHorizontal: 14,
    paddingTop: 6,
    paddingBottom: 2,
  },
  sugTitle: { fontSize: 13.5, color: colors.ink, fontWeight: '500' },
  sugMeta: { fontSize: 11, color: colors.faint, marginTop: 2 },
  sugLoading: { fontSize: 11, color: colors.faint, paddingHorizontal: 14, paddingBottom: 8 },

  quotaBar: {
    marginHorizontal: 16,
    marginBottom: 6,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: radius.sm,
    backgroundColor: '#fff7ed',
  },
  quotaText: { fontSize: 11.5, lineHeight: 17, color: '#b45309' },
})

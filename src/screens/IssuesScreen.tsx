import React, { useCallback, useEffect, useState } from 'react'
import { FlatList, Image, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native'
import { Empty, Header, LangSwitch } from '../components/ui'
import { CNS, coverOf, fetchIssues } from '../api/crossref'
import { ISSUE_TTL, issuesNow, loadIssuesCache, saveIssuesCache } from '../store/storage'
import seed from '../data/cns-issues.json'
import { hasNews, type NewsMap } from '../logic/follows'
import type { Follow } from '../store/storage'
import type { JournalMeta } from '../logic/journals'
import type { Dict } from '../i18n'
import type { IssueInfo, Prefs } from '../types'
import { colors, radius } from '../theme'

/** 固定按 Cell / Nature / Science 的顺序展示，增量到货也不会乱序 */
const order = new Map(CNS.map((c, i) => [String(c.key), i]))
const sortIssues = (list: IssueInfo[]) =>
  [...list].sort((a, b) => (order.get(String(a.key)) ?? 99) - (order.get(String(b.key)) ?? 99))

/**
 * 构建时烘焙的当期快照（scripts/bake-issues.mjs 生成）。
 * 走到这儿还在等网络说明本来就没缓存 —— 那就先把快照摆出来，0 毫秒也有内容可看，
 * 网络回来了再静默替换。封面是纯函数按卷期推的，快照里只存期号，不会指向错的图。
 */
const seedList = (): IssueInfo[] =>
  (seed.list as unknown as IssueInfo[]).map((x) => ({ ...x, cover: coverOf(String(x.key), x) }))

/**
 * 同一时刻只允许一轮请求在飞：预热和页面本身共用它。
 * 不共用的话，进页面瞬间会和预热各打三发，六发并发把 Crossref 拖到十几秒还互相超时。
 */
type Waiter = (one: IssueInfo) => void
let running: { promise: Promise<IssueInfo[]>; waiters: Set<Waiter> } | null = null

function startFetch() {
  const waiters = new Set<Waiter>()
  const promise = fetchIssues((one) => waiters.forEach((w) => w(one)))
  const job = { promise, waiters }
  running = job
  void promise.catch(() => {}).then(() => {
    if (running === job) running = null
  })
  return job
}

/**
 * 启动预热：缓存过期或没有时，趁用户还在看论文列表先把三刊抓回来落盘。
 * 之后进顶刊页就是「读内存 → 直接渲染」，不用盯着转圈等 Crossref。
 */
export async function prefetchIssues(): Promise<void> {
  try {
    const cached = await loadIssuesCache()
    if (cached && Date.now() - cached.at < ISSUE_TTL) return
    if (running) return
    const { promise } = startFetch()
    const fresh = await promise
    if (fresh.some((x) => !x.error)) await saveIssuesCache(fresh)
  } catch {
    /* 预热失败无所谓，进页面时还会再试 */
  }
}

/** 顶刊页：CNS 三刊当期期号 + 封面。封面取不到就走版式封面，不留破图 */
export default function IssuesScreen({
  prefs,
  t,
  patchPrefs,
  onOpenIssue,
  follows,
  news,
  onToggleFollow,
  onSeen,
}: {
  prefs: Prefs
  t: Dict
  patchPrefs: (p: Partial<Prefs>) => void
  onOpenIssue: (info: IssueInfo) => void
  follows: Follow[]
  news: NewsMap
  onToggleFollow: (j: JournalMeta) => void
  /** 打开某期后推进关注刊的水位线，红点随即消失 */
  onSeen: (issn: string, date: string) => void
}) {
  // 会话内有内存副本时直接铺屏：切 tab 回来不再闪「加载中」
  const boot = issuesNow()
  const [list, setList] = useState<IssueInfo[]>(boot ? sortIssues(boot.list) : seedList())
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('ready')
  const [refreshing, setRefreshing] = useState(false)

  const load = useCallback(async (force = false) => {
    // ① 有缓存就先上屏（不管多旧），只在过期时才去网络
    let cached = await loadIssuesCache()
    if (cached) {
      setList(sortIssues(cached.list))
      setState('ready')
      if (!force && Date.now() - cached.at < ISSUE_TTL) return
    }

    // ② 后台刷新：三刊各回各的，谁先回谁先替换，别等最慢那本
    //    起点带上旧数据/快照，保证列表从头到尾都是三张，不会中途只剩一张
    const base = cached ? cached.list : seedList()
    const acc = new Map<string, IssueInfo>(base.map((x) => [String(x.key), x]))
    const onOne: Waiter = (one) => {
      const old = acc.get(String(one.key))
      // 这次抓挂了、但手里已有真数据：留着旧的，别把好好的卡片变成「加载失败」
      if (one.error && old && !old.error && old.label) return
      acc.set(String(one.key), one)
      setList(sortIssues([...acc.values()]))
      if (!one.error) setState('ready')
    }
    const job = running ?? startFetch()
    job.waiters.add(onOne)
    try {
      const fresh = await job.promise
      if (fresh.some((x) => !x.error)) {
        await saveIssuesCache(fresh)
        setList(sortIssues(fresh))
        setState('ready')
      } else {
        // 一刊都没拿到：列表里还有快照/旧数据，就在页脚提示一下，别把整页清空
        setState('error')
      }
    } catch {
      setState('error')
    } finally {
      job.waiters.delete(onOne)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  return (
    <View style={styles.root}>
      <Header brand={t.brand} sub={t.cvSub} right={<LangSwitch lang={prefs.lang} onChange={(lang) => patchPrefs({ lang })} />} />

      {state === 'error' && !list.length ? (
        <Empty title={t.cvFailTip} actionLabel={t.retry} onAction={() => void load(true)} />
      ) : (
        <FlatList
          data={list}
          keyExtractor={(item) => item.key}
          contentContainerStyle={{ padding: 16, paddingTop: 4 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              tintColor={colors.primary}
              onRefresh={async () => {
                setRefreshing(true)
                await load(true)
                setRefreshing(false)
              }}
            />
          }
          renderItem={({ item }) => {
            // ok = 真有期号；pending = 还在路上的占位卡；剩下才是真失败
            const ok = !item.error && !!item.label
            const pending = !ok && !item.error
            const issn = item.issn || ''
            const follow = follows.find((f) => f.issn === issn)
            const fresh = hasNews(follow, news[issn])
            return (
              // 星标放在卡片外面（绝对定位盖上去）：嵌在卡片里点星标会顺手把这一期打开
              <View style={styles.cardWrap}>
              <Pressable
                onPress={() => {
                  if (!ok) return
                  if (issn) onSeen(issn, item.dateText || '')
                  onOpenIssue(item)
                }}
                style={({ pressed }) => [styles.card, pressed && ok && { opacity: 0.9 }]}
              >
                <View style={[styles.coverWrap, { backgroundColor: item.color + '14' }]}>
                  {ok && item.cover ? (
                    <Image source={{ uri: item.cover }} style={styles.cover} resizeMode="cover" />
                  ) : (
                    <View style={[styles.layoutCover, { backgroundColor: item.color }]}>
                      <Text style={styles.layoutName}>{item.name}</Text>
                      <Text style={styles.layoutLabel}>{ok ? item.label : pending ? '···' : '—'}</Text>
                      <Text style={styles.layoutNote}>{t.cvNoCover}</Text>
                    </View>
                  )}
                </View>

                <View style={styles.info}>
                  <View style={styles.nameRow}>
                    <Text style={[styles.name, { color: item.color }]}>{item.name}</Text>
                    {!!fresh && (
                      <View style={styles.newTag}>
                        <Text style={styles.newTagText}>{t.news}</Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.cn}>{item.cn}</Text>
                  {ok ? (
                    <>
                      <Text style={styles.vol}>{item.label}</Text>
                      {!!item.dateText && (
                        <Text style={styles.date}>
                          {t.cvOnline && item.dateKind === 'online' ? `${item.dateText}（${t.cvOnline}）` : item.dateText}
                        </Text>
                      )}
                      {!!item.leadTitle && (
                        <Text style={styles.lead} numberOfLines={3}>
                          {item.leadTitle}
                        </Text>
                      )}
                      <View style={styles.go}>
                        <Text style={styles.goText}>{t.cvOpen} ›</Text>
                      </View>
                    </>
                  ) : pending ? (
                    <Text style={styles.pending}>{t.loading}</Text>
                  ) : (
                    <Text style={styles.fail}>{t.cvFail}</Text>
                  )}
                </View>
              </Pressable>
              {!!issn && (
                <Pressable
                  onPress={() => onToggleFollow({ issn, name: item.name, abbr: item.name, impact: '', domain: '' })}
                  hitSlop={8}
                  style={styles.starBtn}
                >
                  <Text style={[styles.star, follow ? styles.starOn : null]}>{follow ? '★' : '☆'}</Text>
                </Pressable>
              )}
              </View>
            )
          }}
          ListFooterComponent={
            <View>
              {state === 'error' && <Text style={styles.stale}>{t.cvStale}</Text>}
              <Text style={styles.foot}>{t.cvFootNote}</Text>
            </View>
          }
        />
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, minWidth: 0, backgroundColor: colors.bg },
  cardWrap: { marginBottom: 14 },
  card: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: 14,
    shadowColor: '#0f172a',
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  coverWrap: { width: 96, height: 132, borderRadius: radius.md, overflow: 'hidden' },
  cover: { width: '100%', height: '100%' },
  layoutCover: { flex: 1, padding: 10, justifyContent: 'flex-end' },
  layoutName: { color: '#fff', fontSize: 15, fontWeight: '800' },
  layoutLabel: { color: '#ffffffdd', fontSize: 11, marginTop: 2 },
  layoutNote: { color: '#ffffffa8', fontSize: 8, marginTop: 6 },

  info: { flex: 1, marginLeft: 14, justifyContent: 'flex-start' },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingRight: 26 },
  name: { fontSize: 17, fontWeight: '800' },
  starBtn: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 30,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  star: { fontSize: 17, color: colors.faint, lineHeight: 20 },
  starOn: { color: '#f59e0b' },
  newTag: { backgroundColor: colors.danger, borderRadius: 5, paddingHorizontal: 5, paddingVertical: 1 },
  newTagText: { fontSize: 9, color: '#fff', fontWeight: '800' },
  cn: { fontSize: 11, color: colors.faint, marginTop: 1 },
  vol: { fontSize: 13, color: colors.ink2, fontWeight: '600', marginTop: 8 },
  date: { fontSize: 11, color: colors.faint, marginTop: 3 },
  lead: { fontSize: 12, color: colors.muted, lineHeight: 18, marginTop: 8 },
  go: { marginTop: 'auto', alignSelf: 'flex-start' },
  goText: { fontSize: 13, color: colors.primary, fontWeight: '700' },
  fail: { fontSize: 12, color: colors.danger, marginTop: 10 },
  pending: { fontSize: 12, color: colors.faint, marginTop: 10 },
  stale: { fontSize: 11, color: colors.danger, lineHeight: 17, marginTop: 4, paddingHorizontal: 2 },
  foot: { fontSize: 10.5, color: colors.faint, lineHeight: 17, marginTop: 4, paddingHorizontal: 2 },
})

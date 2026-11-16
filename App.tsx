import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { StatusBar } from 'expo-status-bar'
import Safe from './src/components/Safe'
import PapersScreen from './src/screens/PapersScreen'
import IssuesScreen, { prefetchIssues } from './src/screens/IssuesScreen'
import IssueScreen from './src/screens/IssueScreen'
import FavoritesScreen from './src/screens/FavoritesScreen'
import MeScreen from './src/screens/MeScreen'
import SettingsScreen from './src/screens/SettingsScreen'
import { dict } from './src/i18n'
import {
  defaultPrefs,
  loadFavs,
  loadFollows,
  loadPrefs,
  markFollowSeen,
  savePrefs,
  toggleFav,
  toggleFollow,
  type FavPaper,
  type Follow,
} from './src/store/storage'
import { checkFollowNews, type NewsMap } from './src/logic/follows'
import { todayStr } from './src/logic/feed'
import type { JournalMeta } from './src/logic/journals'
import type { IssueInfo, Paper, Prefs } from './src/types'
import { colors } from './src/theme'

type Tab = 'papers' | 'issues' | 'favs' | 'me'

/** 自绘 tab 图标：三条横线=论文，方框=期刊，星=收藏，人形=我的。省掉一套 png，也不用矢量库 */
function TabIcon({ type, active }: { type: Tab; active: boolean }) {
  const tint = active ? colors.primary : colors.faint
  if (type === 'papers') {
    return (
      <View style={styles.iconBox}>
        {[10, 8, 6].map((w, i) => (
          <View
            key={i}
            style={{ width: w * 1.6, height: 2, borderRadius: 1, backgroundColor: tint, marginVertical: 1.5 }}
          />
        ))}
      </View>
    )
  }
  if (type === 'issues') {
    return (
      <View style={styles.iconBox}>
        <View style={{ width: 16, height: 14, borderRadius: 2, borderWidth: 1.8, borderColor: tint }} />
      </View>
    )
  }
  if (type === 'favs') {
    return (
      <View style={styles.iconBox}>
        <Text style={[styles.starIcon, { color: tint }]}>{active ? '★' : '☆'}</Text>
      </View>
    )
  }
  return (
    <View style={styles.iconBox}>
      <View style={{ width: 7, height: 7, borderRadius: 4, borderWidth: 1.8, borderColor: tint }} />
      <View
        style={{
          width: 14,
          height: 6,
          marginTop: 2,
          borderTopLeftRadius: 7,
          borderTopRightRadius: 7,
          borderWidth: 1.8,
          borderBottomWidth: 0,
          borderColor: tint,
        }}
      />
    </View>
  )
}

export default function App() {
  const [prefs, setPrefs] = useState<Prefs | null>(null)
  const [tab, setTab] = useState<Tab>('papers')
  const [issue, setIssue] = useState<IssueInfo | null>(null)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [favs, setFavs] = useState<FavPaper[]>([])
  const [follows, setFollows] = useState<Follow[]>([])
  /** issn → 该刊最新上线日；用于关注条上的「新」标记 */
  const [news, setNews] = useState<NewsMap>({})

  useEffect(() => {
    let alive = true
    void loadPrefs().then((p) => {
      if (alive) setPrefs({ ...defaultPrefs, ...p })
    })
    void loadFavs().then((list) => {
      if (alive) setFavs(list)
    })
    void loadFollows().then((list) => {
      if (alive) setFollows(list)
    })
    return () => {
      alive = false
    }
  }, [])

  /** 关注的刊有新文没有：拉一次各刊最新上线日，半小时内走缓存 */
  useEffect(() => {
    if (!follows.length) {
      setNews({})
      return
    }
    let alive = true
    // 晚 2.5 秒再问：先让首页论文列表把带宽和配额占上，别在首屏跟它抢
    const timer = setTimeout(() => {
      void checkFollowNews(follows).then((map) => {
        if (alive) setNews(map)
      })
    }, 2500)
    return () => {
      alive = false
      clearTimeout(timer)
    }
  }, [follows])

  /** 顶刊页预热：后台先抓一轮并落盘，切到「顶刊」时连刷新都省了 */
  useEffect(() => {
    // 5 秒后再动：首屏论文列表要用 Crossref，别在这时候跟它抢连接
    const timer = setTimeout(() => void prefetchIssues(), 5000)
    return () => clearTimeout(timer)
  }, [])

  const onToggleFollow = useCallback((j: JournalMeta) => {
    void toggleFollow(j, todayStr()).then(setFollows)
  }, [])

  const refreshNews = useCallback(() => {
    if (!follows.length) return
    void checkFollowNews(follows, true).then(setNews)
  }, [follows])

  /** 看过某刊 / 打开某期后推进水位线，「新」标记随之消失 */
  const onSeen = useCallback((issn: string, date: string) => {
    void markFollowSeen(issn, date).then((list) => {
      if (list) setFollows(list)
    })
  }, [])

  const patchPrefs = useCallback((patch: Partial<Prefs>) => {
    setPrefs((cur) => {
      const next = { ...(cur || defaultPrefs), ...patch }
      void savePrefs(next)
      return next
    })
  }, [])

  /** 收藏状态统一放在 App：论文页与收藏页共用同一份，点任意一边另一边立刻同步 */
  const onToggleFav = useCallback((p: Paper) => {
    void toggleFav(p).then(setFavs)
  }, [])
  const favDois = useMemo(() => favs.map((f) => f.doi), [favs])

  if (!prefs) {
    return <View style={{ flex: 1, backgroundColor: colors.bg }} />
  }

  const t = dict(prefs.lang)
  const tabs: { key: Tab; label: string }[] = [
    { key: 'papers', label: t.tabPapers },
    { key: 'issues', label: t.tabIssues },
    { key: 'favs', label: t.tabFavs },
    { key: 'me', label: t.tabMe },
  ]

  return (
    <Safe>
      <StatusBar style="dark" />
      <View style={{ flex: 1, width: '100%' }}>
        {issue ? (
          <IssueScreen info={issue} t={t} prefs={prefs} onBack={() => setIssue(null)} />
        ) : tab === 'papers' ? (
          <PapersScreen
            prefs={prefs}
            t={t}
            patchPrefs={patchPrefs}
            onOpenSettings={() => setSettingsOpen(true)}
            favDois={favDois}
            onToggleFav={onToggleFav}
            follows={follows}
            news={news}
            onToggleFollow={onToggleFollow}
            onSeen={onSeen}
            onRefreshNews={refreshNews}
          />
        ) : tab === 'issues' ? (
          <IssuesScreen
            prefs={prefs}
            t={t}
            patchPrefs={patchPrefs}
            onOpenIssue={setIssue}
            follows={follows}
            news={news}
            onToggleFollow={onToggleFollow}
            onSeen={onSeen}
          />
        ) : tab === 'favs' ? (
          <FavoritesScreen prefs={prefs} t={t} patchPrefs={patchPrefs} favs={favs} onToggleFav={onToggleFav} />
        ) : (
          <MeScreen
            prefs={prefs}
            t={t}
            patchPrefs={patchPrefs}
            onOpenSettings={() => setSettingsOpen(true)}
            onOpenFavs={() => setTab('favs')}
            favCount={favs.length}
          />
        )}
      </View>

      {!issue && (
        <View style={styles.tabBar}>
          {tabs.map((item) => {
            const active = tab === item.key
            return (
              <Pressable key={item.key} onPress={() => setTab(item.key)} style={styles.tabItem}>
                <TabIcon type={item.key} active={active} />
                <Text style={[styles.tabText, active && styles.tabTextActive]}>{item.label}</Text>
              </Pressable>
            )
          })}
        </View>
      )}

      <SettingsScreen
        visible={settingsOpen}
        prefs={prefs}
        t={t}
        onSave={patchPrefs}
        onClose={() => setSettingsOpen(false)}
      />
    </Safe>
  )
}

const styles = StyleSheet.create({
  tabBar: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.line,
    paddingTop: 8,
    paddingBottom: 22,
  },
  tabItem: { flex: 1, alignItems: 'center', gap: 5 },
  tabText: { fontSize: 11, color: colors.faint },
  tabTextActive: { color: colors.primary, fontWeight: '700' },
  iconBox: { height: 18, justifyContent: 'center', alignItems: 'center' },
  starIcon: { fontSize: 15, lineHeight: 18 },
})

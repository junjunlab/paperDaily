import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { Image, Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { Header, LangSwitch } from '../components/ui'
import { clearCaches, loadStats, streakOf } from '../store/storage'
import { domainName } from '../logic/classify'
import type { Dict } from '../i18n'
import type { Prefs, ReadingStats } from '../types'
import { colors, domainColor, radius } from '../theme'

const ymd = (d: Date) => d.toISOString().slice(0, 10)
const DEV_GITHUB = 'https://github.com/junjunlab'
/** 首行背景图：20 种常见氨基酸图谱（随包内置，不联网） */
const AMINO_BG = require('../../assets/amino-acids.png')

/** 我的：阅读统计 + 设置入口 + 开发者信息，全部本地数据，不联网 */
export default function MeScreen({
  prefs,
  t,
  patchPrefs,
  onOpenSettings,
  onOpenFavs,
  favCount,
}: {
  prefs: Prefs
  t: Dict
  patchPrefs: (p: Partial<Prefs>) => void
  onOpenSettings: () => void
  onOpenFavs: () => void
  favCount: number
}) {
  const [stats, setStats] = useState<ReadingStats>({ total: 0, byDay: {}, byDomain: {}, lastOpen: '' })
  const [cleared, setCleared] = useState(false)

  const load = useCallback(async () => {
    setStats(await loadStats())
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const days = useMemo(() => {
    const out: { key: string; label: string; count: number }[] = []
    for (let i = 6; i >= 0; i -= 1) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      const key = ymd(d)
      out.push({ key, label: `${d.getMonth() + 1}/${d.getDate()}`, count: stats.byDay[key] || 0 })
    }
    return out
  }, [stats])

  const maxDay = Math.max(1, ...days.map((d) => d.count))
  const domains = Object.entries(stats.byDomain || {}).sort((a, b) => b[1] - a[1])
  const maxDomain = Math.max(1, ...domains.map(([, n]) => n))
  const today = stats.byDay[ymd(new Date())] || 0
  const streak = streakOf(stats)

  const openGithub = () => {
    void Linking.openURL(DEV_GITHUB).catch(() => {})
  }

  return (
    <View style={styles.root}>
      <Header
        brand={t.brand}
        sub={t.meTitle}
        right={<LangSwitch lang={prefs.lang} onChange={(lang) => patchPrefs({ lang })} />}
      />

      <ScrollView contentContainerStyle={{ padding: 16, paddingTop: 4, paddingBottom: 28 }}>
        <View style={styles.hero}>
          <Image source={AMINO_BG} style={styles.heroImg} resizeMode="cover" />
          <View style={styles.heroScrim} />
          <View style={styles.heroBody}>
            {/* 数字压在自己的白色小板上：图谱当纹理，字还能看清 */}
            <View style={styles.heroPanel}>
              <Text style={styles.heroLabel}>{t.stTotal}</Text>
              <Text style={styles.heroNum}>{stats.total}</Text>
              <View style={styles.heroRow}>
                <View style={styles.heroCell}>
                  <Text style={styles.heroCellNum}>{today}</Text>
                  <Text style={styles.heroCellLabel}>{t.stToday}</Text>
                </View>
                <View style={styles.heroDivider} />
                <View style={styles.heroCell}>
                  <Text style={styles.heroCellNum}>{streak}</Text>
                  <Text style={styles.heroCellLabel}>{t.stStreak}</Text>
                </View>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>{t.stDays}</Text>
          <View style={styles.bars}>
            {days.map((d) => (
              <View key={d.key} style={styles.barCol}>
                <Text style={styles.barNum}>{d.count || ''}</Text>
                <View style={styles.barTrack}>
                  <View
                    style={[
                      styles.barFill,
                      { height: Math.max(3, (d.count / maxDay) * 76), opacity: d.count ? 1 : 0.18 },
                    ]}
                  />
                </View>
                <Text style={styles.barLabel}>{d.label}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>{t.stByDomain}</Text>
          {domains.length === 0 ? (
            <>
              <Text style={styles.emptyTitle}>{t.stEmpty}</Text>
              <Text style={styles.emptyTip}>{t.stEmptyTip}</Text>
            </>
          ) : (
            domains.map(([key, n]) => (
              <View key={key} style={styles.domainRow}>
                <Text style={styles.domainName} numberOfLines={1}>
                  {domainName(key, prefs.lang) || key}
                </Text>
                <View style={styles.domainTrack}>
                  <View
                    style={[
                      styles.domainFill,
                      { width: `${Math.max(6, (n / maxDomain) * 100)}%`, backgroundColor: domainColor(key) },
                    ]}
                  />
                </View>
                <Text style={styles.domainNum}>{n}</Text>
              </View>
            ))
          )}
        </View>

        {/* 设置入口：把原来顶栏齿轮里的东西收在这里 */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{t.meSettings}</Text>

          <Pressable onPress={onOpenFavs} style={styles.row}>
            <Text style={styles.rowLabel}>{t.favTitle}</Text>
            <Text style={styles.rowValue}>{favCount}</Text>
            <Text style={styles.rowArrow}>›</Text>
          </Pressable>

          <Pressable onPress={onOpenSettings} style={styles.row}>
            <Text style={styles.rowLabel}>{t.meTranslate}</Text>
            <Text style={styles.rowValue}>
              {prefs.translateKey ? t.meConfigured : t.meDefault}
            </Text>
            <Text style={styles.rowArrow}>›</Text>
          </Pressable>

          <Pressable
            onPress={() => {
              void clearCaches().then(() => {
                setCleared(true)
                setTimeout(() => setCleared(false), 1800)
              })
            }}
            style={[styles.row, { borderBottomWidth: 0 }]}
          >
            <Text style={styles.rowLabel}>{t.meClear}</Text>
            <Text style={[styles.rowValue, cleared && { color: colors.primary }]}>
              {cleared ? t.meCleared : ''}
            </Text>
            <Text style={styles.rowArrow}>›</Text>
          </Pressable>
        </View>

        {/* 开发者信息：App 可直跳外链，点击卡片打开 GitHub 主页 */}
        <Pressable
          onPress={openGithub}
          style={({ pressed }) => [styles.devCard, pressed && { opacity: 0.75 }]}
        >
          <View style={styles.devAvatar}>
            <Text style={styles.devAvatarText}>J</Text>
          </View>
          <View style={styles.devMain}>
            <Text style={styles.devLabel}>{t.devTitle}</Text>
            <Text style={styles.devName}>junjunlab</Text>
            <Text style={styles.devUrl} numberOfLines={1}>
              {DEV_GITHUB}
            </Text>
          </View>
          <Text style={styles.devAction}>{t.devOpen} ›</Text>
        </Pressable>

        <Text style={styles.foot}>{t.stLocal}</Text>
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, minWidth: 0, backgroundColor: colors.bg },

  hero: {
    height: 176,
    borderRadius: radius.lg,
    overflow: 'hidden',
    backgroundColor: '#fff',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e6ecf5',
  },
  // 图谱本身是白底黑字，铺满后盖一层半透明白纱，数字压在上面才看得清
  heroImg: { position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', opacity: 0.95 },
  heroScrim: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255,255,255,0.34)',
  },
  heroBody: { flex: 1, padding: 12, justifyContent: 'center' },
  heroPanel: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.93)',
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 14,
    minWidth: 152,
  },
  heroLabel: { color: '#475569', fontSize: 12, letterSpacing: 0.6 },
  heroNum: { color: '#0f172a', fontSize: 46, fontWeight: '800', lineHeight: 54 },
  heroRow: { flexDirection: 'row', alignItems: 'center', marginTop: 6 },
  heroCell: { flexDirection: 'row', alignItems: 'baseline', gap: 6 },
  heroCellNum: { color: '#0f172a', fontSize: 17, fontWeight: '700' },
  heroCellLabel: { color: '#64748b', fontSize: 12 },
  heroDivider: { width: 1, height: 12, backgroundColor: '#0f172a26', marginHorizontal: 14 },

  card: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: 16,
    marginBottom: 14,
    shadowColor: '#0f172a',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 1,
  },
  cardTitle: { fontSize: 13, fontWeight: '700', color: colors.ink2, marginBottom: 14 },

  bars: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' },
  barCol: { alignItems: 'center', flex: 1 },
  barNum: { fontSize: 10, color: colors.faint, height: 14 },
  barTrack: { height: 80, justifyContent: 'flex-end', width: 14, borderRadius: 7, backgroundColor: '#f1f5fb' },
  barFill: { width: 14, borderRadius: 7, backgroundColor: colors.primary },
  barLabel: { fontSize: 10, color: colors.faint, marginTop: 6 },

  domainRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  domainName: { width: 74, fontSize: 12, color: colors.ink2 },
  domainTrack: { flex: 1, height: 7, borderRadius: 4, backgroundColor: '#f1f5fb', overflow: 'hidden' },
  domainFill: { height: 7, borderRadius: 4 },
  domainNum: { width: 30, textAlign: 'right', fontSize: 12, color: colors.muted, fontWeight: '600' },

  emptyTitle: { fontSize: 14, color: colors.ink2, fontWeight: '600' },
  emptyTip: { fontSize: 12, color: colors.faint, marginTop: 6 },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.line,
  },
  rowLabel: { flex: 1, fontSize: 13.5, color: colors.ink },
  rowValue: { fontSize: 12.5, color: colors.faint, marginRight: 6 },
  rowArrow: { fontSize: 16, color: colors.faint },

  devCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: 16,
    marginBottom: 14,
    shadowColor: '#0f172a',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 1,
  },
  devAvatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1e293b',
  },
  devAvatarText: { color: '#fff', fontSize: 19, fontWeight: '800' },
  devMain: { flex: 1, minWidth: 0, marginLeft: 12 },
  devLabel: { fontSize: 10, color: colors.faint },
  devName: { fontSize: 14, color: colors.ink, fontWeight: '700', marginTop: 1 },
  devUrl: { fontSize: 10.5, color: colors.muted, marginTop: 2 },
  devAction: { fontSize: 12, color: colors.primary, fontWeight: '600', marginLeft: 8 },

  foot: { fontSize: 10.5, color: colors.faint, textAlign: 'center', marginTop: 2 },
})

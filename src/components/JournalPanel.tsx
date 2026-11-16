import React, { useMemo, useState } from 'react'
import { FlatList, Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native'
import type { Dict } from '../i18n'
import { journalsOf, searchJournals, type JournalMeta } from '../logic/journals'
import { searchFullJournals } from '../logic/fullJournals'
import { hasNews, type NewsMap } from '../logic/follows'
import type { Follow } from '../store/storage'
import { colors, radius } from '../theme'

type Row =
  | { kind: 'all' }
  | { kind: 'header'; key: string; label: string }
  | { kind: 'journal'; key: string; j: JournalMeta; remote?: boolean }

/**
 * 期刊面板。两个来源，均为本地同步检索（不再依赖网络）：
 *   1) 本地精选 160 本（带影响因子/领域，瞬时出）；
 *   2) Crossref 全库期刊（约 17 万本，内置在 journals-full.ts，懒加载解析）。
 * 缩写走本地简称表 —— Crossref 的期刊库没有缩写字段。
 */
export default function JournalPanel({
  visible,
  domain,
  current,
  t,
  onPick,
  onClose,
  follows,
  news,
  onToggleFollow,
}: {
  visible: boolean
  domain: string
  current: JournalMeta | null
  t: Dict
  onPick: (j: JournalMeta | null) => void
  onClose: () => void
  /** 已关注期刊（用于显示 ★ 与新文标记） */
  follows: Follow[]
  news: NewsMap
  onToggleFollow: (j: JournalMeta) => void
}) {
  const followOf = (issn: string) => follows.find((f) => f.issn === issn)
  const [keyword, setKeyword] = useState('')

  const q = keyword.trim()
  // 本地精选：零延迟
  const locals = useMemo(
    () => (q ? searchJournals(q, domain) : journalsOf(domain)),
    [q, domain],
  )
  // 全库补充：同步检索（数据已在内存），去掉了不稳定的远程请求
  const full = useMemo(() => {
    if (q.length < 2) return []
    const have = new Set(locals.map((j) => j.issn))
    return searchFullJournals(q, 40).filter((j) => !have.has(j.issn))
  }, [q, locals])

  const rows = useMemo<Row[]>(() => {
    const out: Row[] = [{ kind: 'all' }]
    if (locals.length) {
      out.push({ kind: 'header', key: 'h-local', label: q ? t.journalLocal : t.journalAll })
      locals.forEach((j) => out.push({ kind: 'journal', key: 'l-' + j.issn, j }))
    }
    if (q.length >= 2) {
      out.push({ kind: 'header', key: 'h-remote', label: t.journalRemote })
      full.forEach((j) => out.push({ kind: 'journal', key: 'r-' + j.issn, j, remote: true }))
    }
    return out
  }, [locals, full, q, t])

  const pick = (j: JournalMeta | null) => {
    onPick(j)
    onClose()
  }

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <View style={styles.root}>
        <View style={styles.bar}>
          <Text style={styles.barTitle}>{t.journalPanelTitle}</Text>
          <Pressable onPress={onClose} hitSlop={12} style={styles.closeBtn}>
            <Text style={styles.closeText}>×</Text>
          </Pressable>
        </View>

        <View style={styles.searchWrap}>
          <TextInput
            value={keyword}
            onChangeText={setKeyword}
            placeholder={t.journalSearchPh}
            placeholderTextColor={colors.faint}
            autoCapitalize="none"
            autoCorrect={false}
            style={styles.searchInput}
          />
          {!!keyword && (
            <Pressable onPress={() => setKeyword('')} hitSlop={8}>
              <Text style={styles.clear}>×</Text>
            </Pressable>
          )}
        </View>

        <FlatList
          data={rows}
          keyExtractor={(item) => ('key' in item ? item.key : 'all')}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingBottom: 24 }}
          renderItem={({ item }) => {
            if (item.kind === 'all') {
              return (
                <Pressable onPress={() => pick(null)} style={({ pressed }) => [styles.row, pressed && { opacity: 0.8 }]}>
                  <Text style={styles.allText}>{t.journalAll}</Text>
                  {!current && <Text style={styles.check}>✓</Text>}
                </Pressable>
              )
            }
            if (item.kind === 'header') {
              return <Text style={styles.section}>{item.label}</Text>
            }
            const j = item.j
            const active = current?.issn === j.issn
            const follow = followOf(j.issn)
            const fresh = hasNews(follow, news[j.issn])
            return (
              // 星标必须跟「选中该刊」并列，不能嵌在里面：嵌着点星标会顺带打开这本刊
              <View style={styles.row}>
                <Pressable
                  onPress={() => pick(j)}
                  style={({ pressed }) => [styles.rowMain, pressed && { opacity: 0.75 }]}
                >
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={[styles.name, active && { color: colors.primary }]} numberOfLines={2}>
                      {j.name}
                    </Text>
                    <Text style={styles.sub} numberOfLines={1}>
                      {[j.abbr, `ISSN ${j.issn}`].filter(Boolean).join(' · ')}
                    </Text>
                  </View>
                </Pressable>
                {!!fresh && (
                  <View style={styles.newTag}>
                    <Text style={styles.newTagText}>{t.news}</Text>
                  </View>
                )}
                {!!j.impact && (
                  <View style={styles.ifBadge}>
                    <Text style={styles.ifText}>IF {j.impact}</Text>
                  </View>
                )}
                <Pressable onPress={() => onToggleFollow(j)} hitSlop={6} style={styles.starBtn}>
                  <Text style={[styles.star, follow ? styles.starOn : null]}>{follow ? '★' : '☆'}</Text>
                </Pressable>
                {active && <Text style={styles.check}>✓</Text>}
              </View>
            )
          }}
          ListEmptyComponent={<Text style={styles.empty}>{t.journalNone}</Text>}
          ListFooterComponent={
            !keyword.trim() ? (
              <View style={{ marginTop: 8 }}>
                <Text style={styles.foot}>
                  {locals.length}
                  {t.journalCountSuffix}
                </Text>
                <Text style={styles.hint}>{t.followHint}</Text>
              </View>
            ) : undefined
          }
        />
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg, paddingTop: 44 },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.line,
  },
  barTitle: { flex: 1, fontSize: 15, fontWeight: '700', color: colors.ink },
  closeBtn: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center' },
  closeText: { fontSize: 26, color: colors.faint, lineHeight: 30 },

  searchWrap: {
    margin: 16,
    marginBottom: 4,
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

  section: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.faint,
    letterSpacing: 0.4,
    paddingHorizontal: 18,
    paddingTop: 10,
    paddingBottom: 6,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    marginHorizontal: 16,
    marginBottom: 8,
    paddingLeft: 14,
    paddingRight: 10,
    borderRadius: radius.md,
    gap: 8,
  },
  rowMain: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', paddingVertical: 12 },
  allText: { flex: 1, fontSize: 14, color: colors.ink2, fontWeight: '600' },
  name: { fontSize: 14, color: colors.ink, fontWeight: '600' },
  sub: { fontSize: 11, color: colors.faint, marginTop: 3 },
  ifBadge: { backgroundColor: '#eef7f0', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  ifText: { fontSize: 10, color: '#15803d', fontWeight: '700' },
  newTag: {
    backgroundColor: colors.danger,
    borderRadius: 5,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  newTagText: { fontSize: 9, color: '#fff', fontWeight: '800' },
  starBtn: { width: 24, height: 24, alignItems: 'center', justifyContent: 'center' },
  star: { fontSize: 16, color: colors.faint, lineHeight: 18 },
  starOn: { color: '#f59e0b' },
  hint: { fontSize: 10.5, color: colors.faint, textAlign: 'center', marginTop: 8, lineHeight: 16, paddingHorizontal: 24 },
  check: { fontSize: 15, color: colors.primary, fontWeight: '700', width: 18, textAlign: 'center' },
  empty: { textAlign: 'center', color: colors.faint, fontSize: 13, marginTop: 40 },
  foot: { textAlign: 'center', color: colors.faint, fontSize: 11, marginTop: 6 },
})

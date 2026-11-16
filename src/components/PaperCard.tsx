import React from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import type { Dict } from '../i18n'
import type { Lang, Paper } from '../types'
import { typeLabel } from '../logic/articleType'
import { colors, domainColor, radius } from '../theme'

/** 列表卡片：领域色点 + 刊名 + 日期，标题最多三行，作者一行截断 */
export default function PaperCard({
  paper,
  t,
  lang = 'zh',
  onPress,
  fav = false,
  onToggleFav,
}: {
  paper: Paper
  t: Dict
  lang?: Lang
  onPress: () => void
  /** 是否已收藏（传了 onToggleFav 才显示星标） */
  fav?: boolean
  onToggleFav?: () => void
}) {
  const tint = domainColor(paper.domain)
  const showZh = !!paper.titleZh
  const kind = typeLabel(paper.type, paper.title, lang)

  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.card, pressed && { opacity: 0.86 }]}>
      <View style={styles.metaRow}>
        {!!paper.domainName && (
          <>
            <View style={[styles.dot, { backgroundColor: tint }]} />
            <Text style={[styles.domain, { color: tint }]} numberOfLines={1}>
              {paper.domainName}
            </Text>
            <Text style={styles.sep}>·</Text>
          </>
        )}
        <Text style={styles.journal} numberOfLines={1}>
          {paper.journalAbbr || paper.journal}
        </Text>
        <Text style={styles.date}>{paper.date}</Text>
      </View>

      {showZh ? (
        <>
          <Text style={styles.titleZh} numberOfLines={3}>
            {paper.titleZh}
          </Text>
          <Text style={styles.titleEn} numberOfLines={2}>
            {paper.title}
          </Text>
        </>
      ) : (
        <Text style={styles.title} numberOfLines={3}>
          {paper.title}
        </Text>
      )}

      {!!paper.authors && (
        <Text style={styles.authors} numberOfLines={1}>
          {paper.authors}
        </Text>
      )}

      <View style={styles.footRow}>
        {!!kind && (
          <View style={styles.kindBadge}>
            <Text style={styles.kindText}>{kind}</Text>
          </View>
        )}
        {!!paper.impact && (
          <View style={styles.ifBadge}>
            <Text style={styles.ifText}>IF {paper.impact}</Text>
          </View>
        )}
        <View style={{ flex: 1 }} />
        {!!onToggleFav && (
          <Pressable onPress={onToggleFav} hitSlop={10} style={styles.starBtn}>
            <Text style={[styles.star, fav && styles.starOn]}>{fav ? '★' : '☆'}</Text>
          </Pressable>
        )}
        <Text style={styles.open}>›</Text>
      </View>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 12,
    shadowColor: '#0f172a',
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  metaRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8, minWidth: 0 },
  dot: { width: 6, height: 6, borderRadius: 3, marginRight: 6 },
  domain: { fontSize: 12, fontWeight: '700' },
  sep: { color: colors.faint, marginHorizontal: 5, fontSize: 12 },
  journal: { flex: 1, fontSize: 12, color: colors.muted, fontWeight: '500' },
  date: { fontSize: 11, color: colors.faint, marginLeft: 8 },

  title: { fontSize: 16, lineHeight: 23, color: colors.ink, fontWeight: '600', flexShrink: 1 },
  titleZh: { fontSize: 16, lineHeight: 23, color: colors.ink, fontWeight: '600', flexShrink: 1 },
  titleEn: { fontSize: 12, lineHeight: 17, color: colors.faint, marginTop: 5 },
  authors: { fontSize: 12, color: colors.muted, marginTop: 8, flexShrink: 1 },

  footRow: { flexDirection: 'row', alignItems: 'center', marginTop: 10, gap: 8 },
  kindBadge: {
    backgroundColor: colors.primarySoft,
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  kindText: { fontSize: 10, color: colors.primary, fontWeight: '700' },
  ifBadge: {
    backgroundColor: '#eef7f0',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  ifText: { fontSize: 10, color: '#15803d', fontWeight: '700' },
  absHint: { fontSize: 11, color: colors.faint, flex: 1 },
  starBtn: { paddingHorizontal: 4, paddingVertical: 2 },
  star: { fontSize: 17, color: colors.faint, lineHeight: 20 },
  starOn: { color: '#f59e0b' },
  open: { fontSize: 20, color: colors.faint, marginTop: -4 },
})

import React, { useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import type { Dict } from '../i18n'
import type { Lang, Paper } from '../types'
import { typeLabel } from '../logic/articleType'
import { colors, domainColor, radius } from '../theme'

/**
 * 每日精选卡：论文页顶部一张，按影响因子 + 领域偏好挑 3 篇。
 * 只是「先读哪篇」的入口，所以每条一行、点开就是正常详情，不另做页面。
 */
export default function PicksCard({
  picks,
  t,
  lang,
  onOpen,
  onDismiss,
}: {
  picks: Paper[]
  t: Dict
  lang: Lang
  onOpen: (p: Paper) => void
  onDismiss: () => void
}) {
  const [open, setOpen] = useState(false)
  if (!picks.length) return null

  return (
    <View style={styles.card}>
      <View style={styles.head}>
        <View style={styles.tag}>
          <Text style={styles.tagText}>{t.pickTag}</Text>
        </View>
        <Text style={styles.title}>{t.pickTitle}</Text>
        <Pressable onPress={onDismiss} hitSlop={10} style={styles.close}>
          <Text style={styles.closeText}>×</Text>
        </Pressable>
      </View>

      {!open && (
        <Pressable onPress={() => setOpen(true)} style={styles.peek}>
          <Text style={styles.peekText}>
            {picks.length}
            {t.countSuffix} · {t.pickExpand} ›
          </Text>
        </Pressable>
      )}

      {open &&
        picks.map((p, i) => {
        const tint = domainColor(p.domain)
        const kind = typeLabel(p.type, p.title, lang)
        return (
          <Pressable
            key={p.doi}
            onPress={() => onOpen(p)}
            style={({ pressed }) => [styles.row, pressed && { opacity: 0.75 }]}
          >
            <View style={[styles.rank, { backgroundColor: tint + '14' }]}>
              <Text style={[styles.rankText, { color: tint }]}>{i + 1}</Text>
            </View>
            <View style={styles.body}>
              <Text style={styles.ptitle} numberOfLines={2}>
                {lang === 'zh' ? p.titleZh || p.title : p.title}
              </Text>
              <Text style={styles.meta} numberOfLines={1}>
                {[
                  p.journalAbbr || p.journal,
                  p.date,
                  p.impact ? `IF ${p.impact}` : '',
                  kind,
                ]
                  .filter(Boolean)
                  .join(' · ')}
              </Text>
            </View>
            <Text style={styles.arrow}>›</Text>
          </Pressable>
        )
      })}

      {open && (
        <>
          <Text style={styles.foot}>{t.pickFoot}</Text>
          <Pressable onPress={() => setOpen(false)} hitSlop={8} style={styles.collapse}>
            <Text style={styles.collapseText}>{t.pickCollapse} ▴</Text>
          </Pressable>
        </>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    marginHorizontal: 16,
    marginBottom: 12,
    paddingTop: 12,
    paddingBottom: 8,
    borderWidth: 1,
    borderColor: '#dbe6fb',
    shadowColor: '#1d4ed8',
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  head: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, marginBottom: 6 },
  tag: {
    backgroundColor: colors.primary,
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginRight: 7,
  },
  tagText: { fontSize: 10, color: '#fff', fontWeight: '800', letterSpacing: 0.3 },
  title: { flex: 1, fontSize: 13.5, fontWeight: '800', color: colors.ink },
  close: { width: 24, height: 24, alignItems: 'center', justifyContent: 'center' },
  closeText: { fontSize: 18, color: colors.faint, lineHeight: 20 },

  row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 9 },
  rank: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  rankText: { fontSize: 12, fontWeight: '800' },
  body: { flex: 1, minWidth: 0 },
  ptitle: { fontSize: 13.5, lineHeight: 19, color: colors.ink, fontWeight: '600' },
  meta: { fontSize: 10.5, color: colors.faint, marginTop: 3 },
  arrow: { fontSize: 18, color: colors.faint, marginLeft: 6, marginTop: -2 },
  foot: {
    fontSize: 10,
    color: colors.faint,
    paddingHorizontal: 14,
    paddingTop: 4,
    paddingBottom: 2,
  },
  peek: { paddingHorizontal: 14, paddingVertical: 8 },
  peekText: { fontSize: 12, color: colors.primary, fontWeight: '700' },
  collapse: { alignSelf: 'center', paddingVertical: 6 },
  collapseText: { fontSize: 11, color: colors.faint, fontWeight: '600' },
})

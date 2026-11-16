import React from 'react'
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native'
import { colors, radius } from '../theme'

/** 胶囊筛选片，论文页的领域/时间、顶刊页都能用 */
export function Chip({
  label,
  active,
  onPress,
  color,
}: {
  label: string
  active?: boolean
  onPress?: () => void
  color?: string
}) {
  const tint = color || colors.primary
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.chip,
        active && { backgroundColor: tint, borderColor: tint },
        pressed && { opacity: 0.75 },
      ]}
    >
      <Text style={[styles.chipText, active && { color: '#fff' }]} numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  )
}

/** 页面抬头：左侧品牌 + 副标题，右侧放语言切换/刷新等动作 */
export function Header({
  brand,
  sub,
  right,
}: {
  brand: string
  sub?: string
  right?: React.ReactNode
}) {
  return (
    <View style={styles.header}>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={styles.brand}>{brand}</Text>
        {!!sub && <Text style={styles.sub}>{sub}</Text>}
      </View>
      <View style={styles.headerRight}>{right}</View>
    </View>
  )
}

export function LangSwitch({
  lang,
  onChange,
}: {
  lang: 'zh' | 'en'
  onChange: (l: 'zh' | 'en') => void
}) {
  return (
    <View style={styles.langWrap}>
      {(['zh', 'en'] as const).map((key) => {
        const active = lang === key
        return (
          <Pressable
            key={key}
            onPress={() => onChange(key)}
            style={[styles.langChip, active && styles.langChipActive]}
          >
            <Text style={[styles.langText, active && styles.langTextActive]}>{key === 'zh' ? '中文' : 'EN'}</Text>
          </Pressable>
        )
      })}
    </View>
  )
}

export function Loading({ label }: { label: string }) {
  return (
    <View style={styles.center}>
      <ActivityIndicator color={colors.primary} />
      <Text style={styles.centerText}>{label}</Text>
    </View>
  )
}

export function Empty({
  title,
  tip,
  actionLabel,
  onAction,
}: {
  title: string
  tip?: string
  actionLabel?: string
  onAction?: () => void
}) {
  return (
    <View style={styles.center}>
      <Text style={styles.emptyTitle}>{title}</Text>
      {!!tip && <Text style={styles.centerText}>{tip}</Text>}
      {!!actionLabel && (
        <Pressable onPress={onAction} style={styles.emptyBtn}>
          <Text style={styles.emptyBtnText}>{actionLabel}</Text>
        </Pressable>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  chip: {
    paddingHorizontal: 14,
    height: 32,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  chipText: { fontSize: 13, color: colors.ink2, fontWeight: '500' },

  header: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 18,
    paddingTop: 8,
    paddingBottom: 12,
  },
  brand: { fontSize: 24, fontWeight: '800', color: colors.ink, letterSpacing: -0.3 },
  sub: { fontSize: 12, color: colors.faint, marginTop: 3 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },

  langWrap: {
    flexDirection: 'row',
    backgroundColor: '#eef2f8',
    borderRadius: radius.pill,
    padding: 2,
  },
  langChip: { paddingHorizontal: 10, height: 26, borderRadius: radius.pill, justifyContent: 'center' },
  langChipActive: { backgroundColor: colors.card, shadowColor: '#0f172a', shadowOpacity: 0.08, shadowRadius: 4, elevation: 2 },
  langText: { fontSize: 12, color: colors.muted },
  langTextActive: { color: colors.primary, fontWeight: '700' },

  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 8 },
  centerText: { fontSize: 13, color: colors.faint, textAlign: 'center', marginTop: 8 },
  emptyTitle: { fontSize: 16, fontWeight: '600', color: colors.ink2, textAlign: 'center' },
  emptyBtn: {
    marginTop: 14,
    paddingHorizontal: 18,
    height: 38,
    borderRadius: radius.pill,
    backgroundColor: colors.primarySoft,
    justifyContent: 'center',
  },
  emptyBtnText: { color: colors.primary, fontWeight: '600', fontSize: 14 },
})

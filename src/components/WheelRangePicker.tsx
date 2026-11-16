import React, { useEffect, useMemo, useRef, useState } from 'react'
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import type { Dict } from '../i18n'
import { colors, radius } from '../theme'

const ITEM_H = 36
const VISIBLE = 3
const COL_H = ITEM_H * VISIBLE

const pad2 = (n: number) => (n < 10 ? '0' + n : String(n))
const toInt = (s: string | undefined, fallback: number) => {
  const n = Number(String(s || '').slice(0, 4))
  return Number.isFinite(n) && n > 0 ? n : fallback
}

function parse(day?: string) {
  const m = String(day || '').match(/^(\d{4})-(\d{2})-(\d{2})/)
  const now = new Date()
  return m
    ? { y: Number(m[1]), m: Number(m[2]), d: Number(m[3]) }
    : { y: now.getFullYear(), m: now.getMonth() + 1, d: now.getDate() }
}

const daysInMonth = (y: number, m: number) => new Date(y, m, 0).getDate()

/** 一列滚轮：靠 snapToInterval 吸附到整行，松手后回调选中项 */
function Wheel({
  items,
  index,
  onIndex,
  width,
}: {
  items: number[]
  index: number
  onIndex: (i: number) => void
  width: number
}) {
  const ref = useRef<React.ComponentRef<typeof ScrollView>>(null)
  const ready = useRef(false)

  useEffect(() => {
    // 首帧定位到当前值（延迟一点等布局完成，否则 scrollTo 无效）
    const t = setTimeout(() => {
      ref.current?.scrollTo({ y: index * ITEM_H, animated: false })
      ready.current = true
    }, 30)
    return () => clearTimeout(t)
    // 只在挂载时定位，之后由用户滚动驱动
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!ready.current) return
    ref.current?.scrollTo({ y: index * ITEM_H, animated: true })
    // 外部值变化（比如换月导致日期夹紧）时同步滚动
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index])

  return (
    <View style={{ width, height: COL_H, overflow: 'hidden' }}>
      <ScrollView
        ref={ref}
        showsVerticalScrollIndicator={false}
        snapToInterval={ITEM_H}
        decelerationRate="fast"
        scrollEventThrottle={16}
        contentContainerStyle={{ paddingVertical: ITEM_H }}
        onMomentumScrollEnd={(e) => {
          const i = Math.round(e.nativeEvent.contentOffset.y / ITEM_H)
          onIndex(Math.max(0, Math.min(items.length - 1, i)))
        }}
      >
        {items.map((v, i) => (
          <View key={v} style={{ height: ITEM_H, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={[styles.item, i === index && styles.itemActive]}>{v}</Text>
          </View>
        ))}
      </ScrollView>
    </View>
  )
}

/** 年月日三列：年和月、日分三维联动（换月换年时把日夹到合法范围） */
function DateWheel({
  value,
  onChange,
  t,
  lang,
}: {
  value: { y: number; m: number; d: number }
  onChange: (v: { y: number; m: number; d: number }) => void
  t: Dict
  lang: 'zh' | 'en'
}) {
  const now = new Date()
  const years = useMemo(() => {
    const start = now.getFullYear() - 12
    return Array.from({ length: 13 }, (_, i) => start + i).reverse()
  }, [now])
  const months = useMemo(() => Array.from({ length: 12 }, (_, i) => i + 1), [])
  const days = useMemo(() => Array.from({ length: daysInMonth(value.y, value.m) }, (_, i) => i + 1), [value.y, value.m])

  const setPart = (patch: Partial<{ y: number; m: number; d: number }>) => {
    const next = { ...value, ...patch }
    const max = daysInMonth(next.y, next.m)
    if (next.d > max) next.d = max
    onChange(next)
  }

  const unit = (txt: string) => <Text style={styles.unit}>{txt}</Text>

  return (
    <View style={styles.wheelRow}>
      <View style={styles.centerLine} pointerEvents="none" />
      <Wheel items={years} index={years.indexOf(value.y)} onIndex={(i) => setPart({ y: years[i] })} width={86} />
      {unit(lang === 'en' ? 'Y' : '年')}
      <Wheel items={months} index={months.indexOf(value.m)} onIndex={(i) => setPart({ m: months[i] })} width={62} />
      {unit(lang === 'en' ? 'M' : '月')}
      <Wheel items={days} index={days.indexOf(value.d)} onIndex={(i) => setPart({ d: days[i] })} width={62} />
      {unit(lang === 'en' ? 'D' : '日')}
      <Text style={styles.hint}>{t.calHint}</Text>
    </View>
  )
}

/**
 * 日期区间选择：跟小程序一致的三列滚轮（年 / 月 / 日），上下两组分别是开始、结束。
 * 选完会把结束日期夹到不早于开始日期。
 */
export default function WheelRangePicker({
  visible,
  from,
  to,
  t,
  lang,
  onApply,
  onClose,
}: {
  visible: boolean
  from?: string
  to?: string
  t: Dict
  lang: 'zh' | 'en'
  onApply: (from: string, to: string) => void
  onClose: () => void
}) {
  const [start, setStart] = useState(() => parse(from))
  const [end, setEnd] = useState(() => parse(to || from))

  useEffect(() => {
    if (!visible) return
    setStart(parse(from))
    setEnd(parse(to || from))
  }, [visible, from, to])

  const fmt = (v: { y: number; m: number; d: number }) => `${v.y}-${pad2(v.m)}-${pad2(v.d)}`
  const startStr = fmt(start)
  const endStr = fmt(end)
  const invalid = endStr < startStr

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <View style={styles.sheet}>
          <View style={styles.head}>
            <Text style={styles.title}>{t.calTitle}</Text>
            <Pressable onPress={onClose} hitSlop={12}>
              <Text style={styles.close}>×</Text>
            </Pressable>
          </View>

          <Text style={styles.sectionLabel}>{t.calFrom}</Text>
          <DateWheel value={start} onChange={setStart} t={t} lang={lang} />

          <Text style={[styles.sectionLabel, { marginTop: 10 }]}>{t.calTo}</Text>
          <DateWheel value={end} onChange={setEnd} t={t} lang={lang} />

          {invalid && <Text style={styles.warn}>{t.calOrderTip}</Text>}

          <View style={styles.actions}>
            <Pressable onPress={onClose} style={styles.ghost}>
              <Text style={styles.ghostText}>{t.cancel}</Text>
            </Pressable>
            <Pressable
              onPress={() => onApply(startStr, endStr < startStr ? startStr : endStr)}
              style={styles.primary}
            >
              <Text style={styles.primaryText}>{t.calApply}</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(15,23,42,0.42)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: colors.card,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    padding: 18,
    paddingBottom: 26,
  },
  head: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  title: { flex: 1, fontSize: 16, fontWeight: '700', color: colors.ink },
  close: { fontSize: 24, color: colors.faint, lineHeight: 26 },

  sectionLabel: { fontSize: 12, fontWeight: '700', color: colors.faint, letterSpacing: 0.4, marginBottom: 2 },

  wheelRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  centerLine: {
    position: 'absolute',
    left: 8,
    right: 8,
    top: ITEM_H,
    height: ITEM_H,
    borderRadius: 8,
    backgroundColor: colors.primarySoft,
  },
  item: { fontSize: 16, color: colors.faint },
  itemActive: { color: colors.ink, fontWeight: '700', fontSize: 17 },
  unit: { fontSize: 13, color: colors.muted, marginHorizontal: 4 },
  hint: { position: 'absolute', opacity: 0, height: 0 },

  warn: { fontSize: 11.5, color: colors.danger, marginTop: 8 },

  actions: { flexDirection: 'row', gap: 10, marginTop: 16 },
  ghost: {
    flex: 1,
    height: 44,
    borderRadius: radius.md,
    backgroundColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ghostText: { color: colors.muted, fontSize: 14, fontWeight: '600' },
  primary: {
    flex: 2,
    height: 44,
    borderRadius: radius.md,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryText: { color: '#fff', fontSize: 15, fontWeight: '700' },
})

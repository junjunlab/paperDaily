import React, { useEffect, useState } from 'react'
import {
  Image,
  Linking,
  Modal,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import type { Dict } from '../i18n'
import { colors, radius } from '../theme'

export type DetailData = {
  title: string
  titleZh?: string
  journal?: string
  meta?: string
  authors?: string
  affiliations?: string
  abstract?: string
  abstractZh?: string
  /** 图形摘要图片 URL（有才显示，加载失败自动隐藏） */
  graphicalAbstract?: string
  url?: string
}

/**
 * 详情弹层。字段全部由调用方拼好再传进来，论文页和本期页共用同一套版式。
 */
export default function DetailModal({
  visible,
  data,
  t,
  translating,
  canTranslate,
  onClose,
  onTranslate,
  onRetryAbstract,
  retrying,
}: {
  visible: boolean
  data: DetailData | null
  t: Dict
  translating?: boolean
  canTranslate?: boolean
  onClose: () => void
  onTranslate?: () => void
  onRetryAbstract?: () => void
  retrying?: boolean
}) {
  const [gaFailed, setGaFailed] = useState(false)
  useEffect(() => setGaFailed(false), [data?.url])
  const openUrl = () => {
    if (data?.url) Linking.openURL(data.url).catch(() => {})
  }

  const share = () => {
    if (!data?.url) return
    Share.share({ message: `${data.title}\n${data.url}` }).catch(() => {})
  }

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <View style={styles.root}>
        <View style={styles.bar}>
          <Text style={styles.barTitle} numberOfLines={1}>
            {t.dTitle}
          </Text>
          <Pressable onPress={onClose} hitSlop={12} style={styles.closeBtn}>
            <Text style={styles.closeText}>×</Text>
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
          {!!data?.journal && <Text style={styles.journal}>{data.journal}</Text>}
          {!!data?.meta && <Text style={styles.meta}>{data.meta}</Text>}

          <Text style={styles.title}>{data?.title}</Text>
          {!!data?.titleZh && <Text style={styles.titleZh}>{data.titleZh}</Text>}

          {!!data?.graphicalAbstract && !gaFailed && (
            <View style={styles.gaWrap}>
              <Text style={styles.gaLabel}>{t.gaTitle}</Text>
              <Image
                source={{ uri: data.graphicalAbstract }}
                style={styles.gaImage}
                resizeMode="contain"
                onError={() => setGaFailed(true)}
              />
            </View>
          )}

          {!!data?.authors && (
            <View style={styles.block}>
              <Text style={styles.label}>{t.authors}</Text>
              <Text style={styles.text}>{data.authors}</Text>
              {!!data?.affiliations && <Text style={styles.affiliation}>{data.affiliations}</Text>}
            </View>
          )}

          {!!data?.abstractZh && (
            <View style={styles.block}>
              <Text style={styles.label}>{t.dAbstract}</Text>
              <Text style={styles.text}>{data.abstractZh}</Text>
            </View>
          )}

          {!!data?.abstract && (
            <View style={styles.block}>
              <Text style={styles.label}>{t.dEnAbstract}</Text>
              <Text style={[styles.text, { color: colors.ink2 }]}>{data.abstract}</Text>
            </View>
          )}

          {!data?.abstract && (
            <View style={styles.block}>
              <Text style={styles.label}>{t.dEnAbstract}</Text>
              <Text style={[styles.text, { color: colors.faint }]}>{t.noAbstract}</Text>
              <View style={styles.absActions}>
                <Pressable onPress={onRetryAbstract} disabled={retrying} style={styles.absBtn}>
                  <Text style={styles.absBtnText}>{retrying ? t.absRetrying : t.absRetry}</Text>
                </Pressable>
                <Pressable onPress={openUrl} style={styles.absBtn}>
                  <Text style={styles.absBtnText}>{t.absOpen}</Text>
                </Pressable>
              </View>
            </View>
          )}

          {!!canTranslate && !data?.abstractZh && !!data?.abstract && (
            <Pressable onPress={onTranslate} disabled={translating} style={styles.translateBtn}>
              <Text style={styles.translateText}>{translating ? t.dTranslating : t.dTranslate}</Text>
            </Pressable>
          )}

          <Text style={styles.declare}>{t.dDeclare}</Text>
        </ScrollView>

        <View style={styles.actions}>
          <Pressable onPress={openUrl} style={[styles.primaryBtn, !data?.url && { opacity: 0.4 }]}>
            <Text style={styles.primaryText}>{t.dOpen}</Text>
          </Pressable>
          <Pressable onPress={share} style={styles.ghostBtn}>
            <Text style={styles.ghostText}>{t.dShare}</Text>
          </Pressable>
        </View>
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
  barTitle: { flex: 1, fontSize: 14, fontWeight: '600', color: colors.muted },
  closeBtn: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center' },
  closeText: { fontSize: 26, color: colors.faint, lineHeight: 30 },

  body: { padding: 18, paddingBottom: 28 },
  journal: { fontSize: 12, fontWeight: '700', color: colors.primary },
  meta: { fontSize: 12, color: colors.faint, marginTop: 4 },
  title: { fontSize: 20, lineHeight: 29, fontWeight: '700', color: colors.ink, marginTop: 10 },
  titleZh: { fontSize: 15, lineHeight: 22, color: colors.muted, marginTop: 8 },

  gaWrap: { marginTop: 16 },
  gaLabel: { fontSize: 11, fontWeight: '700', color: colors.faint, letterSpacing: 0.4, marginBottom: 8 },
  gaImage: { width: '100%', height: 240, backgroundColor: '#f8fafc', borderRadius: radius.md },

  block: { marginTop: 20 },
  label: { fontSize: 11, fontWeight: '700', color: colors.faint, letterSpacing: 0.4, marginBottom: 6 },
  text: { fontSize: 14.5, lineHeight: 23, color: colors.ink2 },
  affiliation: { fontSize: 12, lineHeight: 19, color: colors.faint, marginTop: 6 },

  absActions: { flexDirection: 'row', gap: 10, marginTop: 14 },
  absBtn: {
    paddingHorizontal: 16,
    height: 36,
    borderRadius: radius.pill,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  absBtnText: { color: colors.primary, fontSize: 13, fontWeight: '600' },

  translateBtn: {
    marginTop: 16,
    height: 40,
    borderRadius: radius.pill,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  translateText: { color: colors.primary, fontWeight: '600', fontSize: 14 },

  declare: {
    marginTop: 26,
    paddingTop: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.line,
    fontSize: 11,
    lineHeight: 18,
    color: colors.faint,
  },

  actions: {
    flexDirection: 'row',
    gap: 10,
    padding: 16,
    paddingBottom: 28,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.line,
    backgroundColor: colors.card,
  },
  primaryBtn: {
    flex: 2,
    height: 46,
    borderRadius: radius.md,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  ghostBtn: {
    flex: 1,
    height: 46,
    borderRadius: radius.md,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ghostText: { color: colors.primary, fontSize: 15, fontWeight: '600' },
})

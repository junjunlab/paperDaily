import React, { useCallback, useEffect, useState } from 'react'
import { FlatList, Image, Pressable, StyleSheet, Text, View } from 'react-native'
import DetailModal from '../components/DetailModal'
import { Empty, Loading } from '../components/ui'
import { CNS, fetchIssueArticles } from '../api/crossref'
import { LIST_TRANSLATE_LIMIT, hasOwnKey, translateOne, translateTitles } from '../api/translate'
import { resolveAbstract } from '../api/abstracts'
import { typeLabel } from '../logic/articleType'
import { loadZhCache, saveZhCache } from '../store/storage'
import type { Dict } from '../i18n'
import type { IssueArticle, IssueInfo, Prefs } from '../types'
import { colors, radius } from '../theme'

/** 某一期的文章清单。期号从上一页带进来，避免重复请求 */
export default function IssueScreen({
  info,
  t,
  prefs,
  onBack,
}: {
  info: IssueInfo
  t: Dict
  prefs: Prefs
  onBack: () => void
}) {
  const [items, setItems] = useState<IssueArticle[]>([])
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading')
  const [detail, setDetail] = useState<IssueArticle | null>(null)
  const [detailZh, setDetailZh] = useState('')
  const [translating, setTranslating] = useState(false)
  const [absLoading, setAbsLoading] = useState(false)

  const load = useCallback(async () => {
    if (!info.volume || !info.issue) {
      setState('error')
      return
    }
    try {
      const meta = CNS.find((c) => c.key === info.key)
      if (!meta) {
        setState('error')
        return
      }
      const list = await fetchIssueArticles({ issn: meta.issn }, info.volume, info.issue)
      setItems(list)
      setState('ready')
      void translateList(list)
    } catch {
      setState('error')
    }
  }, [info])

  const translateList = useCallback(
    async (list: IssueArticle[]) => {
      if (prefs.lang !== 'zh' || !list.length) return
      const cache = await loadZhCache()
      setItems((prev) => prev.map((a) => (cache[a.doi] ? { ...a, titleZh: cache[a.doi] } : a)))
      const limit = hasOwnKey(prefs) ? list.length : LIST_TRANSLATE_LIMIT
      const missing = list.slice(0, limit).filter((a) => !cache[a.doi] && a.title)
      if (!missing.length) {
        setItems((prev) => prev.map((a) => (cache[a.doi] ? { ...a, titleZh: cache[a.doi] } : a)))
        return
      }
      const next = { ...cache }
      const flush = (partial: string[]) => {
        partial.forEach((text, i) => {
          if (text && missing[i]) next[missing[i].doi] = text
        })
        setItems((prev) => prev.map((a) => (next[a.doi] ? { ...a, titleZh: next[a.doi] } : a)))
      }
      await translateTitles(prefs, missing.map((a) => a.title), flush)
      await saveZhCache(next)
    },
    [prefs],
  )

  useEffect(() => {
    void load()
  }, [load])

  /** 切到中文时先用缓存铺一遍，避免每次都等联网 */
  useEffect(() => {
    if (prefs.lang !== 'zh') return
    let alive = true
    void (async () => {
      const cache = await loadZhCache()
      if (!alive) return
      setItems((prev) => prev.map((a) => (cache[a.doi] ? { ...a, titleZh: cache[a.doi] } : a)))
    })()
    return () => {
      alive = false
    }
  }, [prefs.lang])

  /** 摘要自动翻译：中文模式打开详情即触发，'abs:' 前缀与标题译文隔离 */
  const translateAbstract = useCallback(
    async (article: IssueArticle, abstract: string) => {
      if (!abstract) return
      setTranslating(true)
      const cache = await loadZhCache()
      const key = 'abs:' + article.doi
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

  const doTranslate = () => {
    if (!detail?.abstract) return
    void translateAbstract(detail, detail.abstract)
  }

  /** 点开文章：中文模式自动翻译摘要（有摘要直接翻，没有先补全） */
  const openArticle = (item: IssueArticle) => {
    setDetail(item)
    setDetailZh('')
    if (prefs.lang === 'zh') {
      if (item.abstract) void translateAbstract(item, item.abstract)
      else {
        setAbsLoading(true)
        void resolveAbstract(item.doi).then((res) => {
          if (res.text) {
            setDetail((cur) => (cur && cur.doi === item.doi ? { ...cur, abstract: res.text } : cur))
            setItems((prev) => prev.map((a) => (a.doi === item.doi ? { ...a, abstract: res.text } : a)))
            void translateAbstract(item, res.text)
          }
          setAbsLoading(false)
        })
      }
    }
  }

  return (
    <View style={styles.root}>
      <View style={styles.head}>
        <Pressable onPress={onBack} hitSlop={12} style={styles.back}>
          <Text style={styles.backText}>‹</Text>
        </Pressable>
        {!!info.cover && <Image source={{ uri: info.cover }} style={styles.headCover} resizeMode="cover" />}
        <View style={{ flex: 1 }}>
          <Text style={[styles.headName, { color: info.color }]}>{info.name}</Text>
          <Text style={styles.headLabel}>
            {info.label}
            {items.length ? ` · ${items.length}${t.isCountSuffix}` : ''}
          </Text>
          {!!info.dateText && <Text style={styles.headDate}>{info.dateText}</Text>}
        </View>
      </View>

      {state === 'loading' && <Loading label={t.loading} />}
      {state === 'error' && <Empty title={t.cvFail} tip={t.cvFailTip} actionLabel={t.retry} onAction={() => void load()} />}

      {state === 'ready' && (
        <FlatList
          data={items}
          keyExtractor={(item) => item.doi}
          contentContainerStyle={{ padding: 16, paddingTop: 4, paddingBottom: 28 }}
          renderItem={({ item, index }) => (
            <Pressable
              onPress={() => openArticle(item)}
              style={({ pressed }) => [styles.item, pressed && { opacity: 0.85 }]}
            >
              <Text style={styles.idx}>{index + 1}</Text>
              <View style={{ flex: 1, minWidth: 0 }}>
                {prefs.lang === 'zh' && !!item.titleZh && <Text style={styles.titleZh}>{item.titleZh}</Text>}
                <Text style={[styles.title, prefs.lang === 'zh' && !!item.titleZh && styles.titleDim]} numberOfLines={3}>
                  {item.title}
                </Text>
                <View style={styles.metaRow}>
                  <Text style={styles.kindBadge}>{typeLabel(item.type, item.title, prefs.lang)}</Text>
                  <Text style={[styles.sub, { flex: 1 }]} numberOfLines={1}>
                    {[item.authors, item.page ? `p.${item.page}` : ''].filter(Boolean).join(' · ') || '—'}
                  </Text>
                </View>
              </View>
            </Pressable>
          )}
          ListEmptyComponent={<Empty title={t.emptyToday} tip={t.cvFailTip} />}
        />
      )}

      <DetailModal
        visible={!!detail}
        data={
          detail
            ? {
                title: detail.title,
                titleZh: prefs.lang === 'zh' ? detail.titleZh : undefined,
                journal: `${info.name} · ${info.label}`,
                meta: [typeLabel(detail.type, detail.title, prefs.lang), detail.page ? `p.${detail.page}` : '', detail.date].filter(Boolean).join(' · '),
                authors: detail.authors,
                affiliations: detail.affiliations,
                abstract: detail.abstract,
                abstractZh: prefs.lang === 'zh' ? detailZh : undefined,
                url: 'https://doi.org/' + detail.doi,
              }
            : null
        }
        t={t}
        translating={translating}
        canTranslate={prefs.lang === 'zh'}
        onClose={() => setDetail(null)}
        onTranslate={() => void doTranslate()}
        onRetryAbstract={() => {
          if (!detail) return
          setAbsLoading(true)
          void resolveAbstract(detail.doi).then((res) => {
            if (res.text) setDetail((cur) => (cur && cur.doi === detail.doi ? { ...cur, abstract: res.text } : cur))
            setAbsLoading(false)
          })
        }}
        retrying={absLoading}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  head: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingTop: 10, paddingBottom: 12, gap: 10 },
  back: { width: 28, height: 28, alignItems: 'center', justifyContent: 'center' },
  backText: { fontSize: 26, color: colors.muted, lineHeight: 28 },
  headCover: { width: 40, height: 54, borderRadius: 6, backgroundColor: colors.line },
  headName: { fontSize: 16, fontWeight: '800' },
  headLabel: { fontSize: 12, color: colors.muted, marginTop: 2 },
  headDate: { fontSize: 11, color: colors.faint, marginTop: 1 },

  item: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    borderRadius: radius.md,
    padding: 14,
    marginBottom: 10,
    gap: 10,
  },
  idx: { width: 20, fontSize: 12, color: colors.faint, fontWeight: '700', marginTop: 2 },
  titleZh: { fontSize: 14.5, lineHeight: 21, color: colors.ink, fontWeight: '600' },
  title: { fontSize: 14.5, lineHeight: 21, color: colors.ink, fontWeight: '600' },
  titleDim: { fontSize: 12, lineHeight: 17, color: colors.faint, fontWeight: '400', marginTop: 4 },
  sub: { fontSize: 11.5, color: colors.faint, marginTop: 6 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8, minWidth: 0 },
  kindBadge: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.primary,
    backgroundColor: colors.primarySoft,
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    overflow: 'hidden',
  },
})

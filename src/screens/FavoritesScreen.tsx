import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { FlatList, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native'
import DetailModal from '../components/DetailModal'
import PaperCard from '../components/PaperCard'
import { Empty, Header, LangSwitch } from '../components/ui'
import { LIST_TRANSLATE_LIMIT, hasOwnKey, translateTitles } from '../api/translate'
import { getKeywordFeed } from '../logic/keywordFeed'
import { articleKindLabel, type ArticleKind } from '../logic/articleType'
import {
  loadKeywordKind,
  loadKeywords,
  loadZhCache,
  saveKeywordKind,
  saveKeywords,
  saveZhCache,
  type FavPaper,
} from '../store/storage'
import type { Dict } from '../i18n'
import type { Paper, Prefs } from '../types'
import { colors, radius } from '../theme'

const MAX_KEYWORDS = 5
const KIND_OPTIONS: ArticleKind[] = ['research', 'review', 'editorial', 'commentary', 'letter', 'protocol', 'news', 'case']

/** 收藏页：本地存的完整记录，断网也能读；顶部再加一块关键词订阅，每天推相关新文 */
export default function FavoritesScreen({
  prefs,
  t,
  patchPrefs,
  favs,
  favDois,
  onToggleFav,
}: {
  prefs: Prefs
  t: Dict
  patchPrefs: (p: Partial<Prefs>) => void
  favs: FavPaper[]
  favDois: string[]
  onToggleFav: (p: Paper) => void
}) {
  const [detail, setDetail] = useState<Paper | null>(null)
  const [keywords, setKeywords] = useState<string[]>([])
  const [input, setInput] = useState('')
  const [feed, setFeed] = useState<Paper[]>([])
  const [kwLoading, setKwLoading] = useState(false)
  const [kind, setKind] = useState<ArticleKind | 'all'>('all')

  // 最新的收藏排最前
  const list = useMemo(() => favs.slice().sort((a, b) => b.savedAt - a.savedAt), [favs])
  const favSet = useMemo(() => new Set(favDois), [favDois])
  // 翻译要读最新偏好，但不应因偏好变化把已经翻好的标题重翻一遍
  const prefsRef = useRef(prefs)
  prefsRef.current = prefs
  const feedRef = useRef<Paper[]>([])
  feedRef.current = feed

  /** 和论文列表 / 精选卡同一套内置翻译：先铺缓存，缺的按批翻，失败就留英文 */
  const translateFeed = useCallback(async (list: Paper[]) => {
    const p = prefsRef.current
    if (p.lang !== 'zh' || !list.length) return
    const cache = await loadZhCache()
    const decorated = list.map((x) => (cache[x.doi] ? { ...x, titleZh: cache[x.doi] } : x))
    setFeed(decorated)
    const limit = hasOwnKey(p) ? decorated.length : LIST_TRANSLATE_LIMIT
    const missing = decorated.slice(0, limit).filter((x) => !x.titleZh)
    if (!missing.length) return
    const next = { ...cache }
    const flush = (partial: string[]) => {
      partial.forEach((text, i) => {
        if (text && missing[i]) next[missing[i].doi] = text
      })
      setFeed((prev) => prev.map((x) => (next[x.doi] ? { ...x, titleZh: next[x.doi] } : x)))
    }
    await translateTitles(p, missing.map((x) => x.title), flush)
    await saveZhCache(next)
  }, [])

  const rebuild = useCallback(
    async (words: string[], useKind: ArticleKind | 'all' = kind) => {
      if (!words.length) {
        setFeed([])
        return
      }
      setKwLoading(true)
      const out = await getKeywordFeed(words, true, useKind)
      setFeed(out)
      void translateFeed(out)
      setKwLoading(false)
    },
    [kind, translateFeed],
  )

  useEffect(() => {
    let alive = true
    void (async () => {
      const [words, savedKind] = await Promise.all([loadKeywords(), loadKeywordKind()])
      if (!alive) return
      setKeywords(words)
      if (KIND_OPTIONS.includes(savedKind as ArticleKind)) setKind(savedKind as ArticleKind)
      if (!words.length) return
      setKwLoading(true)
      const out = await getKeywordFeed(words, false, (KIND_OPTIONS.includes(savedKind as ArticleKind) ? savedKind : 'all') as ArticleKind | 'all')
      if (!alive) return
      setFeed(out)
      void translateFeed(out)
      setKwLoading(false)
    })()
    return () => {
      alive = false
    }
    // 只用挂载时那批关键词；语言切换由下面的 effect 补翻
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [translateFeed])

  // 用户从英文切回中文时，把已经拿到的推荐标题补翻
  useEffect(() => {
    if (prefs.lang === 'zh' && feedRef.current.length) void translateFeed(feedRef.current)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prefs.lang, translateFeed])

  const pickKind = (k: ArticleKind | 'all') => {
    if (k === kind) return
    setKind(k)
    void saveKeywordKind(k)
    void rebuild(keywords, k)
  }

  const addKeyword = () => {
    const k = input.trim().slice(0, 40)
    if (!k || keywords.length >= MAX_KEYWORDS) return
    if (keywords.some((x) => x.toLowerCase() === k.toLowerCase())) {
      setInput('')
      return
    }
    const next = [...keywords, k]
    setKeywords(next)
    setInput('')
    void saveKeywords(next)
    void rebuild(next)
  }

  const removeKeyword = (k: string) => {
    const next = keywords.filter((x) => x !== k)
    setKeywords(next)
    void saveKeywords(next)
    void rebuild(next)
  }

  const detailData = (p: Paper) => ({
    title: p.title,
    titleZh: p.titleZh,
    journal: p.journalAbbr || p.journal,
    meta: p.date,
    authors: p.authors,
    affiliations: p.affiliations,
    abstract: p.abstract,
    abstractZh: p.abstractZh,
    url: p.url,
  })

  return (
    <View style={styles.root}>
      <Header
        brand={t.brand}
        sub={`${t.favTitle} · ${list.length}`}
        right={<LangSwitch lang={prefs.lang} onChange={(lang) => patchPrefs({ lang })} />}
      />

      <FlatList
        data={list}
        keyExtractor={(item) => item.doi}
        contentContainerStyle={{ paddingTop: 4, paddingBottom: 24 }}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => (
          <PaperCard
            paper={item}
            t={t}
            lang={prefs.lang}
            onPress={() => setDetail(item)}
            fav
            onToggleFav={() => onToggleFav(item)}
          />
        )}
        ListHeaderComponent={
          <View>
            <View style={styles.kwCard}>
              <Text style={styles.kwTitle}>{t.kwTitle}</Text>
              <Text style={styles.kwSub}>{t.kwSub}</Text>

              <View style={styles.kwInputRow}>
                <TextInput
                  value={input}
                  onChangeText={setInput}
                  onSubmitEditing={addKeyword}
                  placeholder={t.kwPlaceholder}
                  placeholderTextColor={colors.faint}
                  returnKeyType="done"
                  style={styles.kwInput}
                />
                <Pressable onPress={addKeyword} style={styles.kwAdd}>
                  <Text style={styles.kwAddText}>{t.kwAdd}</Text>
                </Pressable>
              </View>
              <Text style={styles.kwHint}>
                {keywords.length >= MAX_KEYWORDS ? t.kwLimit : t.kwHint}
              </Text>

              <Text style={styles.kwKindLabel}>{t.kwKindLabel}</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.kindRow}
              >
                {(['all', ...KIND_OPTIONS] as const).map((k) => (
                  <Pressable
                    key={k}
                    onPress={() => pickKind(k)}
                    style={[styles.kindChip, kind === k && styles.kindChipActive]}
                  >
                    <Text
                      style={[styles.kindChipText, kind === k && styles.kindChipTextActive]}
                    >
                      {k === 'all' ? t.kindAll : articleKindLabel(k, prefs.lang)}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>

              {keywords.length > 0 ? (
                <View style={styles.kwChips}>
                  {keywords.map((k) => (
                    <Pressable key={k} onPress={() => removeKeyword(k)} style={styles.kwChip}>
                      <Text style={styles.kwChipText} numberOfLines={1}>
                        {k}
                      </Text>
                      <Text style={styles.kwChipX}>×</Text>
                    </Pressable>
                  ))}
                </View>
              ) : (
                <Text style={styles.kwEmptyWords}>{t.kwEmptyKeywords}</Text>
              )}
            </View>

            {keywords.length > 0 && (
              <View style={styles.feedHead}>
                <Text style={styles.sectionTitle}>{t.kwToday}</Text>
                <Pressable onPress={() => void rebuild(keywords)} hitSlop={8}>
                  <Text style={styles.kwRetry}>{kwLoading ? t.kwLoading : t.kwRetry}</Text>
                </Pressable>
              </View>
            )}
            {kwLoading && <Text style={styles.kwNote}>{t.kwLoading}</Text>}
            {!kwLoading && keywords.length > 0 && feed.length === 0 && (
              <Text style={styles.kwNote}>{t.kwNoHit}</Text>
            )}
            {feed.map((p) => (
              <PaperCard
                key={'kw' + p.doi}
                paper={p}
                t={t}
                lang={prefs.lang}
                onPress={() => setDetail(p)}
                fav={favSet.has(p.doi)}
                onToggleFav={() => onToggleFav(p)}
              />
            ))}
            {favs.length > 0 && (
              <Text style={[styles.sectionTitle, styles.favSection]}>{t.myFav}</Text>
            )}
          </View>
        }
        ListEmptyComponent={
          feed.length ? undefined : <Empty title={t.favEmpty} tip={t.favEmptyTip} />
        }
      />

      <DetailModal
        visible={!!detail}
        data={detail ? detailData(detail) : null}
        t={t}
        onClose={() => setDetail(null)}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, minWidth: 0, backgroundColor: colors.bg },

  kwCard: {
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 14,
    borderRadius: radius.lg,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: '#dbe6fb',
  },
  kwTitle: { fontSize: 14, fontWeight: '800', color: colors.ink },
  kwSub: { fontSize: 11, color: colors.faint, marginTop: 2, marginBottom: 10 },
  kwInputRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  kwInput: {
    flex: 1,
    height: 38,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.bg,
    paddingHorizontal: 12,
    fontSize: 13,
    color: colors.ink,
  },
  kwAdd: {
    paddingHorizontal: 16,
    height: 38,
    borderRadius: radius.md,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  kwAddText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  kwHint: { fontSize: 10.5, color: colors.faint, marginTop: 7 },
  kwEmptyWords: { fontSize: 11.5, color: colors.muted, marginTop: 10 },
  kwKindLabel: { fontSize: 10.5, color: colors.faint, marginTop: 10, marginBottom: 5 },
  kindRow: { alignItems: 'center', gap: 6 },
  kindChip: {
    paddingHorizontal: 10,
    height: 26,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.line,
    justifyContent: 'center',
  },
  kindChipActive: { backgroundColor: colors.primarySoft, borderColor: colors.primarySoft },
  kindChipText: { fontSize: 11.5, color: colors.muted },
  kindChipTextActive: { color: colors.primary, fontWeight: '700' },

  kwChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10 },
  kwChip: {
    flexDirection: 'row',
    alignItems: 'center',
    maxWidth: 180,
    paddingHorizontal: 10,
    height: 28,
    borderRadius: radius.pill,
    backgroundColor: colors.primarySoft,
  },
  kwChipText: { fontSize: 12, color: colors.primary, fontWeight: '600' },
  kwChipX: { fontSize: 15, color: colors.primary, marginLeft: 6, lineHeight: 16 },

  feedHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginBottom: 4,
  },
  sectionTitle: { fontSize: 12.5, fontWeight: '800', color: colors.ink2 },
  favSection: { marginHorizontal: 16, marginTop: 12, marginBottom: 4 },
  kwRetry: { fontSize: 11.5, color: colors.primary, fontWeight: '600' },
  kwNote: { fontSize: 11.5, color: colors.faint, paddingHorizontal: 16, paddingVertical: 10 },
})

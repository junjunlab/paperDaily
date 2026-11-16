import React, { useMemo, useState } from 'react'
import { FlatList, StyleSheet, View } from 'react-native'
import DetailModal from '../components/DetailModal'
import PaperCard from '../components/PaperCard'
import { Empty, Header, LangSwitch } from '../components/ui'
import type { Dict } from '../i18n'
import type { FavPaper } from '../store/storage'
import type { Prefs } from '../types'
import { colors } from '../theme'

/** 收藏页：本地存的完整记录，断网也能读；点星标即取消收藏 */
export default function FavoritesScreen({
  prefs,
  t,
  patchPrefs,
  favs,
  onToggleFav,
}: {
  prefs: Prefs
  t: Dict
  patchPrefs: (p: Partial<Prefs>) => void
  favs: FavPaper[]
  onToggleFav: (p: FavPaper) => void
}) {
  const [detail, setDetail] = useState<FavPaper | null>(null)
  // 最新的收藏排最前
  const list = useMemo(() => favs.slice().sort((a, b) => b.savedAt - a.savedAt), [favs])

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
        ListEmptyComponent={<Empty title={t.favEmpty} tip={t.favEmptyTip} />}
      />

      <DetailModal
        visible={!!detail}
        data={
          detail
            ? {
                title: detail.title,
                titleZh: detail.titleZh,
                journal: detail.journalAbbr || detail.journal,
                meta: detail.date,
                authors: detail.authors,
                affiliations: detail.affiliations,
                abstract: detail.abstract,
                abstractZh: detail.abstractZh,
                url: detail.url,
              }
            : null
        }
        t={t}
        onClose={() => setDetail(null)}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, minWidth: 0, backgroundColor: colors.bg },
})

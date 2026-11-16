import React, { useState } from 'react'
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'
import type { Dict } from '../i18n'
import type { Prefs } from '../types'
import { colors, radius } from '../theme'

/** 设置页：语言 + 自备翻译接口。独立 App 没有云端模型，翻译能力靠用户自己的 key */
export default function SettingsScreen({
  visible,
  prefs,
  t,
  onSave,
  onClose,
}: {
  visible: boolean
  prefs: Prefs
  t: Dict
  onSave: (p: Partial<Prefs>) => void
  onClose: () => void
}) {
  const [baseUrl, setBaseUrl] = useState(prefs.translateBaseUrl)
  const [key, setKey] = useState(prefs.translateKey)
  const [model, setModel] = useState(prefs.translateModel)

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <View style={styles.root}>
        <View style={styles.bar}>
          <Text style={styles.barTitle}>{t.setTitle}</Text>
          <Pressable onPress={onClose} hitSlop={12} style={styles.closeBtn}>
            <Text style={styles.closeText}>×</Text>
          </Pressable>
        </View>

        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
          <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
            <Text style={styles.section}>{t.setLang}</Text>
            <View style={styles.segRow}>
              {(['zh', 'en'] as const).map((l) => {
                const active = prefs.lang === l
                return (
                  <Pressable
                    key={l}
                    onPress={() => onSave({ lang: l })}
                    style={[styles.seg, active && styles.segActive]}
                  >
                    <Text style={[styles.segText, active && styles.segTextActive]}>
                      {l === 'zh' ? '简体中文' : 'English'}
                    </Text>
                  </Pressable>
                )
              })}
            </View>

            <Text style={[styles.section, { marginTop: 26 }]}>{t.setTranslate}</Text>
            <Text style={styles.hint}>{t.setTranslateHint}</Text>

            <Text style={styles.label}>{t.setBaseUrl}</Text>
            <TextInput
              value={baseUrl}
              onChangeText={setBaseUrl}
              placeholder={t.setBaseUrlPh}
              placeholderTextColor={colors.faint}
              autoCapitalize="none"
              autoCorrect={false}
              style={styles.input}
            />

            <Text style={styles.label}>{t.setKey}</Text>
            <TextInput
              value={key}
              onChangeText={setKey}
              placeholder={t.setKeyPh}
              placeholderTextColor={colors.faint}
              autoCapitalize="none"
              autoCorrect={false}
              secureTextEntry
              style={styles.input}
            />

            <Text style={styles.label}>{t.setModel}</Text>
            <TextInput
              value={model}
              onChangeText={setModel}
              placeholder={t.setModelPh}
              placeholderTextColor={colors.faint}
              autoCapitalize="none"
              autoCorrect={false}
              style={styles.input}
            />

            <Pressable
              onPress={() => {
                onSave({ translateBaseUrl: baseUrl.trim(), translateKey: key.trim(), translateModel: model.trim() })
                onClose()
              }}
              style={styles.saveBtn}
            >
              <Text style={styles.saveText}>{t.setSave}</Text>
            </Pressable>

            <Text style={[styles.section, { marginTop: 30 }]}>{t.setAbout}</Text>
            <Text style={styles.about}>{t.setAboutBody}</Text>
            <Text style={styles.version}>v1.0.0 · Expo</Text>
          </ScrollView>
        </KeyboardAvoidingView>
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

  body: { padding: 18, paddingBottom: 40 },
  section: { fontSize: 12, fontWeight: '700', color: colors.faint, letterSpacing: 0.5, marginBottom: 10 },
  hint: { fontSize: 12, lineHeight: 19, color: colors.muted, marginBottom: 16 },

  segRow: { flexDirection: 'row', gap: 10 },
  seg: {
    flex: 1,
    height: 42,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segActive: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  segText: { fontSize: 14, color: colors.ink2 },
  segTextActive: { color: colors.primary, fontWeight: '700' },

  label: { fontSize: 12, color: colors.ink2, fontWeight: '600', marginTop: 12, marginBottom: 6 },
  input: {
    height: 44,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.card,
    paddingHorizontal: 12,
    fontSize: 14,
    color: colors.ink,
  },
  saveBtn: {
    marginTop: 22,
    height: 46,
    borderRadius: radius.md,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveText: { color: '#fff', fontSize: 15, fontWeight: '700' },

  about: { fontSize: 12.5, lineHeight: 20, color: colors.muted },
  version: { fontSize: 11, color: colors.faint, marginTop: 18 },
})

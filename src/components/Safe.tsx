import React from 'react'
import { Platform, StatusBar, StyleSheet, View } from 'react-native'
import { colors } from '../theme'

/**
 * 安全区包装：iOS 用 SafeAreaView，Android 手动让开状态栏。
 * 这版没引 react-native-safe-area-context，少一个原生依赖就少一处构建风险。
 */
export default function Safe({ children, style }: { children: React.ReactNode; style?: any }) {
  const padTop = Platform.OS === 'android' ? StatusBar.currentHeight || 0 : 0
  return <View style={[styles.root, { paddingTop: padTop }, style]}>{children}</View>
}

const styles = StyleSheet.create({
  // width/overflow 是给 Web 兜底的：横向 ScrollView 的内容会把父级撑宽，原生不会
  root: { flex: 1, width: '100%', overflow: 'hidden', backgroundColor: colors.bg },
})

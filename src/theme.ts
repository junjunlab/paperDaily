/** 视觉基线：沿用小程序那套蓝白配色，跨端看起来是同一个产品 */

export const colors = {
  bg: '#f4f6fa',
  card: '#ffffff',
  ink: '#0f172a',
  ink2: '#334155',
  muted: '#64748b',
  faint: '#94a3b8',
  line: '#e8edf4',
  primary: '#1d4ed8',
  primarySoft: '#eff4ff',
  accent: '#0e7490',
  danger: '#dc2626',
  ok: '#16a34a',
}

export const radius = { sm: 10, md: 14, lg: 20, pill: 999 }

/** 领域色：和 catalog 里的 color 对应，缺省回落主色 */
export const domainColor = (key: string) =>
  ({
    life: '#0e7490',
    medicine: '#b91c1c',
    pharm: '#7c3aed',
    chemistry: '#c2410c',
    physics: '#1d4ed8',
    materials: '#0f766e',
    cs: '#4f46e5',
    earth: '#15803d',
    math: '#a16207',
  }[key] || colors.primary)

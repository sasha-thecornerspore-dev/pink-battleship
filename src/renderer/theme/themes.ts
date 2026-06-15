export type ThemeId = 'blush' | 'lavender' | 'rose'
export type ThemeMode = 'light' | 'dark'

export interface ThemeMeta {
  id: ThemeId
  label: string
  swatches: string[]
}

export const THEMES: ThemeMeta[] = [
  { id: 'blush', label: 'Blush & mauve', swatches: ['#FBF6F4', '#C98BA8', '#B9A7D6', '#D8B98C', '#8FAE97'] },
  { id: 'lavender', label: 'Lavender & pearl', swatches: ['#F6F4FB', '#A99AD0', '#9FB8D8', '#C9B8E0', '#8FAE97'] },
  { id: 'rose', label: 'Rose & sage', swatches: ['#FAF5F2', '#CE8595', '#8FAE97', '#D8B98C', '#B59FCF'] },
]

export const DEFAULT_THEME: ThemeId = 'blush'
export const DEFAULT_MODE: ThemeMode = 'light'

export function applyTheme(id: ThemeId, mode: ThemeMode): void {
  document.documentElement.setAttribute('data-theme', id)
  document.documentElement.setAttribute('data-mode', mode)
}

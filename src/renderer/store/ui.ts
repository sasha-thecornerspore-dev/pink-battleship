import { create } from 'zustand'
import type { ThemeId, ThemeMode } from '@shared/models'

export type Route = 'dashboard' | 'connectors' | 'import' | 'settings'

interface UiState {
  route: Route
  theme: ThemeId
  mode: ThemeMode
  setRoute: (r: Route) => void
  setTheme: (t: ThemeId) => void
  setMode: (m: ThemeMode) => void
}

export const useUi = create<UiState>((set) => ({
  route: 'dashboard',
  theme: 'blush',
  mode: 'light',
  setRoute: (route) => set({ route }),
  setTheme: (theme) => set({ theme }),
  setMode: (mode) => set({ mode }),
}))

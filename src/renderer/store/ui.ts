import { create } from 'zustand'
import type { ThemeId, ThemeMode } from '@shared/models'

export type Route = 'dashboard' | 'stats' | 'fans' | 'galleries' | 'assistant' | 'calendar' | 'live' | 'website' | 'connectors' | 'import' | 'compliance' | 'settings' | 'help'

interface UiState {
  route: Route
  theme: ThemeId
  mode: ThemeMode
  tourOpen: boolean
  setRoute: (r: Route) => void
  setTheme: (t: ThemeId) => void
  setMode: (m: ThemeMode) => void
  setTourOpen: (v: boolean) => void
}

export const useUi = create<UiState>((set) => ({
  route: 'dashboard',
  theme: 'blush',
  mode: 'light',
  tourOpen: false,
  setRoute: (route) => set({ route }),
  setTheme: (theme) => set({ theme }),
  setMode: (mode) => set({ mode }),
  setTourOpen: (tourOpen) => set({ tourOpen }),
}))

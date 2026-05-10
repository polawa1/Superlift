import { create } from 'zustand'

type ThemeStore = {
  override: 'light' | 'dark' | null
  setOverride: (v: 'light' | 'dark' | null) => void
}

export const useThemeStore = create<ThemeStore>((set) => ({
  override: null,
  setOverride: (override) => set({ override }),
}))

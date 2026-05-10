import { create } from 'zustand'

type SettingsStore = {
  incrementTestMax: 0.025 | 0.05 | 0.075
  setIncrementTestMax: (v: 0.025 | 0.05 | 0.075) => void
}

export const useSettingsStore = create<SettingsStore>((set) => ({
  incrementTestMax: 0.05,
  setIncrementTestMax: (incrementTestMax) => set({ incrementTestMax }),
}))

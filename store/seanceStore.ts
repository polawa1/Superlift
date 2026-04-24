import { create } from 'zustand'

type StatutSerie = 'PLANIFIEE' | 'VALIDEE' | 'INVALIDEE'

interface SerieState {
  id: number
  chargeKg: number
  reps: number
  nbSeries: number
  rpe?: number
  statut: StatutSerie
  autoValidee: boolean
}

interface SeanceStore {
  seriesEnCours: SerieState[]
  chargerSeries: (seanceId: number) => Promise<void>
  validerSerie: (serieId: number) => Promise<void>
  invaliderSerie: (serieId: number) => Promise<void>
}

export const useSeanceStore = create<SeanceStore>((set) => ({
  seriesEnCours: [],

  chargerSeries: async (seanceId) => {
    const { db } = await import('../db')
    const { series } = await import('../db/schema')
    const { eq } = await import('drizzle-orm')
    const data = await db.select().from(series).where(eq(series.seanceId, seanceId))
    set({ seriesEnCours: data })
  },

  validerSerie: async (serieId) => {
    const { db } = await import('../db')
    const { series } = await import('../db/schema')
    const { eq } = await import('drizzle-orm')
    await db.update(series).set({ statut: 'VALIDEE' }).where(eq(series.id, serieId))
    set((state) => ({
      seriesEnCours: state.seriesEnCours.map((s) =>
        s.id === serieId ? { ...s, statut: 'VALIDEE' } : s
      ),
    }))
  },

  invaliderSerie: async (serieId) => {
    const { db } = await import('../db')
    const { series } = await import('../db/schema')
    const { eq } = await import('drizzle-orm')
    await db.update(series).set({ statut: 'INVALIDEE' }).where(eq(series.id, serieId))
    set((state) => ({
      seriesEnCours: state.seriesEnCours.map((s) =>
        s.id === serieId ? { ...s, statut: 'INVALIDEE' } : s
      ),
    }))
  },
}))

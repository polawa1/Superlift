import { create } from 'zustand'

type StatutSerie = 'PLANIFIEE' | 'VALIDEE' | 'INVALIDEE'

interface SerieState {
  id: number
  chargeKg: number
  reps: number
  nbSeries: number
  rpe?: number | null
  statut: StatutSerie
  autoValidee: boolean
}

interface NoteState {
  id: number
  contenu: string
  horodatage: number
}

interface SeanceStore {
  seriesEnCours: SerieState[]
  notesEnCours: NoteState[]
  chargerSeries: (seanceId: number) => Promise<void>
  chargerNotes: (seanceId: number) => Promise<void>
  validerSerie: (serieId: number) => Promise<void>
  invaliderSerie: (serieId: number) => Promise<void>
  modifierCharge: (serieId: number, chargeKg: number) => Promise<void>
  ajouterNote: (seanceId: number, contenu: string) => Promise<void>
}

export const useSeanceStore = create<SeanceStore>((set) => ({
  seriesEnCours: [],
  notesEnCours: [],

  chargerSeries: async (seanceId) => {
    const { db } = await import('../db')
    const { series } = await import('../db/schema')
    const { eq } = await import('drizzle-orm')
    const data = await db.select().from(series).where(eq(series.seanceId, seanceId))
    set({ seriesEnCours: data })
  },

  chargerNotes: async (seanceId) => {
    const { db } = await import('../db')
    const { notesSeance } = await import('../db/schema')
    const { eq } = await import('drizzle-orm')
    const data = await db.select().from(notesSeance).where(eq(notesSeance.seanceId, seanceId))
    set({ notesEnCours: data })
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

  modifierCharge: async (serieId, chargeKg) => {
    const { db } = await import('../db')
    const { series } = await import('../db/schema')
    const { eq } = await import('drizzle-orm')
    await db.update(series).set({ chargeKg, raisonModification: 'ajustement_manuel' }).where(eq(series.id, serieId))
    set((state) => ({
      seriesEnCours: state.seriesEnCours.map((s) =>
        s.id === serieId ? { ...s, chargeKg } : s
      ),
    }))
  },

  ajouterNote: async (seanceId, contenu) => {
    const { db } = await import('../db')
    const { notesSeance } = await import('../db/schema')
    const horodatage = Date.now()
    const [note] = await db.insert(notesSeance).values({ seanceId, contenu, horodatage }).returning()
    set((state) => ({ notesEnCours: [...state.notesEnCours, note] }))
  },
}))

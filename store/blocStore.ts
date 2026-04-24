import { create } from 'zustand'

interface BlocActif {
  id: number
  exerciceId: number
  unRmKg: number
  dateDebut: string
  nbSemaines: number
}

interface BlocStore {
  blocActif: BlocActif | null
  setBlocActif: (bloc: BlocActif | null) => void
  chargerBlocActif: (exerciceId: number) => Promise<void>
}

export const useBlocStore = create<BlocStore>((set) => ({
  blocActif: null,

  setBlocActif: (bloc) => set({ blocActif: bloc }),

  chargerBlocActif: async (exerciceId) => {
    const { db } = await import('../db')
    const { blocsForce } = await import('../db/schema')
    const { eq, desc } = await import('drizzle-orm')
    const [bloc] = await db
      .select()
      .from(blocsForce)
      .where(eq(blocsForce.exerciceId, exerciceId))
      .orderBy(desc(blocsForce.id))
      .limit(1)
    set({ blocActif: bloc ?? null })
  },
}))

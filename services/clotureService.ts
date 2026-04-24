import { db } from '../db'
import { series, seances } from '../db/schema'
import { eq, and, lt } from 'drizzle-orm'
import { calculerProgression } from './progressionService'

export async function cloturerSeancePrecedente(seanceIdCourante: number) {
  const [seanceCourante] = await db
    .select()
    .from(seances)
    .where(eq(seances.id, seanceIdCourante))

  const [precedente] = await db
    .select()
    .from(seances)
    .where(
      and(
        eq(seances.exerciceId, seanceCourante.exerciceId),
        lt(seances.id, seanceIdCourante),
        eq(seances.statut, 'EN_COURS')
      )
    )
    .orderBy(seances.id)
    .limit(1)

  if (!precedente || precedente.statut === 'CLOTUREE') return

  await db
    .update(series)
    .set({ statut: 'VALIDEE', autoValidee: true })
    .where(and(eq(series.seanceId, precedente.id), eq(series.statut, 'PLANIFIEE')))

  await db
    .update(seances)
    .set({ statut: 'CLOTUREE', clotureeAt: Date.now() })
    .where(eq(seances.id, precedente.id))

  await calculerProgression(precedente.id, precedente.exerciceId)
}

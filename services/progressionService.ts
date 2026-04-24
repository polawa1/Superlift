import { db } from '../db'
import { series, objectifsExercice } from '../db/schema'
import { eq } from 'drizzle-orm'

function arrondir(kg: number): number {
  return Math.round(kg / 2.5) * 2.5
}

export function estimer1RM(chargeKg: number, reps: number): number {
  return chargeKg * (1 + reps / 30)
}

export async function calculerProgression(seanceId: number, exerciceId: number) {
  const toutesLesSeries = await db
    .select()
    .from(series)
    .where(eq(series.seanceId, seanceId))

  const [objectif] = await db
    .select()
    .from(objectifsExercice)
    .where(eq(objectifsExercice.exerciceId, exerciceId))

  if (!objectif) return

  const total = toutesLesSeries.length
  const valideesManuelles = toutesLesSeries.filter(
    (s) => s.statut === 'VALIDEE' && !s.autoValidee
  ).length

  const taux = total > 0 ? valideesManuelles / total : 1
  const chargeActuelle = toutesLesSeries[0]?.chargeKg ?? objectif.chargeKg

  let nouvelleCharge: number
  if (taux >= objectif.seuilProgression) {
    nouvelleCharge = chargeActuelle + objectif.incrementKg
  } else if (taux >= objectif.seuilMaintien) {
    nouvelleCharge = chargeActuelle
  } else {
    nouvelleCharge = chargeActuelle * (1 - objectif.reductionEchec)
  }

  await db
    .update(objectifsExercice)
    .set({ chargeKg: arrondir(nouvelleCharge) })
    .where(eq(objectifsExercice.exerciceId, exerciceId))
}

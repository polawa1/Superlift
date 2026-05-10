import { db } from './index'
import { exercices } from './schema'

const EXERCICES_INITIAUX = [
  'Développé couché',
  'Squat',
  'Traction',
  'Soulevé de terre',
]

export async function seedExercices() {
  const existants = await db.select().from(exercices)
  const nomsExistants = existants.map((e) => e.nom)
  const aInserer = EXERCICES_INITIAUX.filter((nom) => !nomsExistants.includes(nom))
  if (aInserer.length > 0) {
    await db.insert(exercices).values(aInserer.map((nom) => ({ nom })))
  }
}

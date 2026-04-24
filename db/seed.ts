import { db } from './index'
import { exercices } from './schema'

const EXERCICES_INITIAUX = [
  { nom: 'Développé couché' },
  { nom: 'Squat' },
  { nom: 'Traction' },
]

export async function seedExercices() {
  const existants = await db.select().from(exercices)
  if (existants.length > 0) return
  await db.insert(exercices).values(EXERCICES_INITIAUX)
}

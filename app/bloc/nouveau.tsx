import { useState, useEffect } from 'react'
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from 'react-native'
import { useRouter } from 'expo-router'
import { db } from '../../db'
import { blocsForce, series, seances, exercices } from '../../db/schema'
import { genererSeancesBloc } from '../../services/dupService'
import { seedExercices } from '../../db/seed'

export default function NouveauBlocScreen() {
  const router = useRouter()
  const [listeExercices, setListeExercices] = useState<{ id: number; nom: string }[]>([])
  const [exerciceId, setExerciceId] = useState<number | null>(null)
  const [unRm, setUnRm] = useState('')

  useEffect(() => {
    async function charger() {
      await seedExercices()
      const rows = await db.select().from(exercices)
      setListeExercices(rows)
      if (rows.length > 0) setExerciceId(rows[0].id)
    }
    charger()
  }, [])

  async function demarrerBloc() {
    const unRmKg = parseFloat(unRm)
    if (isNaN(unRmKg) || unRmKg <= 0) {
      Alert.alert('Erreur', 'Saisis un 1RM valide')
      return
    }
    if (!exerciceId) return

    const dateDebut = new Date().toISOString().split('T')[0]

    const [bloc] = await db
      .insert(blocsForce)
      .values({ dateDebut, exerciceId, unRmKg })
      .returning()

    const seancesPlanifiees = genererSeancesBloc(bloc.id, exerciceId, unRmKg, new Date())

    for (const s of seancesPlanifiees) {
      const [seance] = await db
        .insert(seances)
        .values({
          date: s.date,
          exerciceId: s.exerciceId,
          blocId: s.blocId,
          typeSeance: s.typeSeance,
          statut: s.statut,
        })
        .returning()

      for (let i = 0; i < s.nbSeries; i++) {
        await db.insert(series).values({
          seanceId: seance.id,
          exerciceId: s.exerciceId,
          chargeKg: s.chargeKg,
          reps: s.reps,
          nbSeries: 1,
          statut: 'PLANIFIEE',
        })
      }
    }

    router.replace('/')
  }

  return (
    <View style={styles.container}>
      <Text style={styles.titre}>Nouveau bloc DUP</Text>

      <Text style={styles.label}>Exercice</Text>
      <View style={styles.exerciceList}>
        {listeExercices.map((ex) => (
          <TouchableOpacity
            key={ex.id}
            style={[styles.chip, exerciceId === ex.id && styles.chipActif]}
            onPress={() => setExerciceId(ex.id)}
          >
            <Text style={[styles.chipTexte, exerciceId === ex.id && styles.chipTexteActif]}>
              {ex.nom}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.label}>1RM (kg)</Text>
      <TextInput
        style={styles.input}
        keyboardType="numeric"
        placeholder="ex: 100"
        value={unRm}
        onChangeText={setUnRm}
      />

      <TouchableOpacity style={styles.bouton} onPress={demarrerBloc}>
        <Text style={styles.boutonTexte}>Démarrer le bloc (4 semaines)</Text>
      </TouchableOpacity>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, backgroundColor: '#fff' },
  titre: { fontSize: 22, fontWeight: 'bold', marginBottom: 24 },
  label: { fontSize: 14, color: '#555', marginBottom: 8 },
  exerciceList: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 24 },
  chip: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: 20, borderWidth: 1, borderColor: '#ccc' },
  chipActif: { backgroundColor: '#000', borderColor: '#000' },
  chipTexte: { color: '#555' },
  chipTexteActif: { color: '#fff' },
  input: { borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 12, fontSize: 16, marginBottom: 24 },
  bouton: { backgroundColor: '#000', borderRadius: 8, padding: 14, alignItems: 'center' },
  boutonTexte: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
})

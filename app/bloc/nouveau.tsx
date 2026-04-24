import { useState } from 'react'
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from 'react-native'
import { useRouter } from 'expo-router'
import { db } from '../../db'
import { blocsForce, series, seances } from '../../db/schema'
import { genererSeancesBloc } from '../../services/dupService'

const EXERCICES = [
  { id: 1, nom: 'Développé couché' },
  { id: 2, nom: 'Squat' },
  { id: 3, nom: 'Traction' },
]

export default function NouveauBlocScreen() {
  const router = useRouter()
  const [exerciceId, setExerciceId] = useState(1)
  const [unRm, setUnRm] = useState('')

  async function demarrerBloc() {
    const unRmKg = parseFloat(unRm)
    if (isNaN(unRmKg) || unRmKg <= 0) {
      Alert.alert('Erreur', 'Saisis un 1RM valide')
      return
    }

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

      await db.insert(series).values({
        seanceId: seance.id,
        exerciceId: s.exerciceId,
        chargeKg: s.chargeKg,
        reps: s.reps,
        nbSeries: s.nbSeries,
        statut: 'PLANIFIEE',
      })
    }

    router.replace('/')
  }

  return (
    <View style={styles.container}>
      <Text style={styles.titre}>Nouveau bloc DUP</Text>

      <Text style={styles.label}>Exercice</Text>
      <View style={styles.exerciceList}>
        {EXERCICES.map((ex) => (
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

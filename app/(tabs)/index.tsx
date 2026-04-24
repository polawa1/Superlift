import { useEffect, useState } from 'react'
import { View, FlatList, StyleSheet, Text, TouchableOpacity } from 'react-native'
import { useRouter } from 'expo-router'
import { db } from '../../db'
import { seances, exercices } from '../../db/schema'
import { eq } from 'drizzle-orm'

type SeanceAvecExercice = {
  id: number
  date: string
  typeSeance: string
  statut: string | null
  nomExercice: string
}

export default function AccueilScreen() {
  const [listeSeances, setListeSeances] = useState<SeanceAvecExercice[]>([])
  const router = useRouter()

  useEffect(() => {
    chargerSeances()
  }, [])

  async function chargerSeances() {
    const rows = await db
      .select({
        id: seances.id,
        date: seances.date,
        typeSeance: seances.typeSeance,
        statut: seances.statut,
        nomExercice: exercices.nom,
      })
      .from(seances)
      .innerJoin(exercices, eq(seances.exerciceId, exercices.id))
      .orderBy(seances.date)
    setListeSeances(rows)
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={listeSeances}
        keyExtractor={(item) => String(item.id)}
        ListEmptyComponent={<Text style={styles.vide}>Aucune séance planifiée</Text>}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.carte}
            onPress={() => router.push(`/seance/${item.id}`)}
          >
            <Text style={styles.date}>{item.date}</Text>
            <Text style={styles.exercice}>{item.nomExercice}</Text>
            <Text style={styles.type}>{item.typeSeance} — {item.statut}</Text>
          </TouchableOpacity>
        )}
      />
      <TouchableOpacity
        style={styles.boutonNouveauBloc}
        onPress={() => router.push('/bloc/nouveau')}
      >
        <Text style={styles.boutonTexte}>+ Nouveau bloc</Text>
      </TouchableOpacity>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  carte: { padding: 16, borderBottomWidth: 1, borderColor: '#eee' },
  date: { fontSize: 12, color: '#888' },
  exercice: { fontSize: 16, fontWeight: 'bold', marginTop: 2 },
  type: { fontSize: 13, color: '#555', marginTop: 2 },
  vide: { textAlign: 'center', marginTop: 40, color: '#aaa' },
  boutonNouveauBloc: {
    margin: 16,
    backgroundColor: '#000',
    borderRadius: 8,
    padding: 14,
    alignItems: 'center',
  },
  boutonTexte: { color: '#fff', fontWeight: 'bold' },
})

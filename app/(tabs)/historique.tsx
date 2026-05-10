import { useState, useCallback } from 'react'
import { View, Text, FlatList, StyleSheet, TouchableOpacity } from 'react-native'
import { useFocusEffect } from 'expo-router'
import { db } from '../../db'
import { seances, series, exercices } from '../../db/schema'
import { eq, and } from 'drizzle-orm'
import { estimer1RM } from '../../services/progressionService'
import { CourbeProgression } from '../../components/CourbeProgression'
import { CourbeVolume } from '../../components/CourbeVolume'

type ExerciceId = number

type SeanceCloturee = {
  id: number
  date: string
  typeSeance: string
  nomExercice: string
  exerciceId: ExerciceId
  rmEstime: number
  volumeKg: number
}

type VolumeHebdo = { semaine: string; volumeKg: number }

const EXERCICES_IDS: ExerciceId[] = []

export default function HistoriqueScreen() {
  const [seancesCloturees, setSeancesCloturees] = useState<SeanceCloturee[]>([])
  const [volumeHebdo, setVolumeHebdo] = useState<Record<ExerciceId, VolumeHebdo[]>>({})
  const [courbes, setCourbes] = useState<Record<ExerciceId, { jour: number; rm: number }[]>>({})
  const [exercicesFiltres, setExercicesFiltres] = useState<{ id: ExerciceId; nom: string }[]>([])
  const [exerciceActif, setExerciceActif] = useState<ExerciceId | null>(null)

  useFocusEffect(
    useCallback(() => {
      charger()
    }, [])
  )

  async function charger() {
    const exos = await db.select().from(exercices)
    setExercicesFiltres(exos)
    if (exos.length > 0) setExerciceActif(exos[0].id)

    const rows = await db
      .select({
        id: seances.id,
        date: seances.date,
        typeSeance: seances.typeSeance,
        exerciceId: seances.exerciceId,
        nomExercice: exercices.nom,
      })
      .from(seances)
      .innerJoin(exercices, eq(seances.exerciceId, exercices.id))

    const enrichies: SeanceCloturee[] = []

    for (const row of rows) {
      const seriesSeance = await db
        .select()
        .from(series)
        .where(and(eq(series.seanceId, row.id), eq(series.statut, 'VALIDEE')))

      if (seriesSeance.length === 0) continue

      const volume = seriesSeance.reduce((sum, s) => sum + s.chargeKg * s.reps, 0)
      const rm = seriesSeance.reduce((max, s) => {
        const v = estimer1RM(s.chargeKg, s.reps)
        return v > max ? v : max
      }, 0)

      enrichies.push({ ...row, rmEstime: Math.round(rm * 10) / 10, volumeKg: Math.round(volume) })
    }

    enrichies.sort((a, b) => a.date.localeCompare(b.date))
    setSeancesCloturees(enrichies)

    // Courbes 1RM par exercice
    const courbsMap: Record<ExerciceId, { jour: number; rm: number }[]> = {}
    for (const exo of exos) {
      const pts = enrichies
        .filter((s) => s.exerciceId === exo.id && s.rmEstime > 0)
        .map((s, i) => ({ jour: i + 1, rm: s.rmEstime }))
      courbsMap[exo.id] = pts
    }
    setCourbes(courbsMap)

    // Volume hebdo
    const volMap: Record<ExerciceId, VolumeHebdo[]> = {}
    for (const exo of exos) {
      const par_semaine: Record<string, number> = {}
      enrichies
        .filter((s) => s.exerciceId === exo.id)
        .forEach((s) => {
          const sem = getSemaine(s.date)
          par_semaine[sem] = (par_semaine[sem] ?? 0) + s.volumeKg
        })
      volMap[exo.id] = Object.entries(par_semaine)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([semaine, volumeKg]) => ({ semaine, volumeKg }))
    }
    setVolumeHebdo(volMap)
  }

  function getSemaine(dateStr: string): string {
    const d = new Date(dateStr)
    const jan1 = new Date(d.getFullYear(), 0, 1)
    const sem = Math.ceil(((d.getTime() - jan1.getTime()) / 86400000 + jan1.getDay() + 1) / 7)
    return `${d.getFullYear()}-S${String(sem).padStart(2, '0')}`
  }

  const seancesActives = seancesCloturees.filter((s) => s.exerciceId === exerciceActif)
  const recordRM = seancesActives.reduce((max, s) => (s.rmEstime > max ? s.rmEstime : max), 0)

  return (
    <View style={styles.container}>
      {/* Onglets exercice */}
      <View style={styles.onglets}>
        {exercicesFiltres.map((exo) => (
          <TouchableOpacity
            key={exo.id}
            style={[styles.onglet, exerciceActif === exo.id && styles.ongletActif]}
            onPress={() => setExerciceActif(exo.id)}
          >
            <Text style={[styles.ongletTexte, exerciceActif === exo.id && styles.ongletTexteActif]}>
              {exo.nom}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={seancesActives}
        keyExtractor={(item) => String(item.id)}
        ListHeaderComponent={
          <>
            {/* Courbe 1RM */}
            {exerciceActif !== null && (
              <CourbeProgression
                donnees={courbes[exerciceActif] ?? []}
                nomExercice={exercicesFiltres.find((e) => e.id === exerciceActif)?.nom}
              />
            )}

            {/* Record */}
            {recordRM > 0 && (
              <View style={styles.record}>
                <Text style={styles.recordLabel}>Record 1RM estimé</Text>
                <Text style={styles.recordValeur}>{recordRM} kg</Text>
              </View>
            )}

            {/* Volume hebdo */}
            {exerciceActif !== null && (
              <CourbeVolume donnees={volumeHebdo[exerciceActif] ?? []} />
            )}

            <Text style={styles.sectionTitre}>Séances</Text>
          </>
        }
        ListEmptyComponent={
          <Text style={styles.vide}>Aucune séance clôturée pour cet exercice</Text>
        }
        renderItem={({ item }) => (
          <View style={styles.carte}>
            <View style={styles.carteEntete}>
              <Text style={styles.date}>{item.date}</Text>
              <Text style={styles.type}>{item.typeSeance}</Text>
            </View>
            <View style={styles.carteStats}>
              <Text style={styles.stat}>1RM ≈ {item.rmEstime} kg</Text>
              <Text style={styles.stat}>Volume : {item.volumeKg} kg</Text>
            </View>
          </View>
        )}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  onglets: { flexDirection: 'row', borderBottomWidth: 1, borderColor: '#eee' },
  onglet: { flex: 1, paddingVertical: 10, alignItems: 'center' },
  ongletActif: { borderBottomWidth: 2, borderColor: '#000' },
  ongletTexte: { fontSize: 12, color: '#888' },
  ongletTexteActif: { color: '#000', fontWeight: '600' },
  record: {
    margin: 12,
    padding: 12,
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  recordLabel: { fontSize: 13, color: '#555' },
  recordValeur: { fontSize: 20, fontWeight: 'bold' },
  sectionTitre: { fontSize: 13, fontWeight: '600', color: '#333', margin: 12, marginBottom: 6 },
  carte: { padding: 14, borderBottomWidth: 1, borderColor: '#eee' },
  carteEntete: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  date: { fontSize: 12, color: '#888' },
  type: { fontSize: 12, color: '#555', textTransform: 'capitalize' },
  carteStats: { flexDirection: 'row', gap: 16 },
  stat: { fontSize: 14, fontWeight: '500' },
  vide: { textAlign: 'center', marginTop: 40, color: '#aaa' },
})

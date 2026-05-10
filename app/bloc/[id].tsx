import { useState, useCallback } from 'react'
import { View, Text, ScrollView, StyleSheet, ActivityIndicator, TouchableOpacity, Alert } from 'react-native'
import { useLocalSearchParams, useFocusEffect, useRouter } from 'expo-router'
import { db } from '../../db'
import { seances, series, exercices, blocsForce, notesSeance } from '../../db/schema'
import { eq, inArray } from 'drizzle-orm'
import { SeanceCard } from '../../components/SeanceCard'
import { Ionicons } from '@expo/vector-icons'

type SeanceAvecSerie = {
  id: number
  date: string
  typeSeance: string
  statut: string | null
  chargeKg: number
  reps: number
  nbSeries: number
}

type Semaine = {
  numero: number
  label: string
  phase: string
  seances: SeanceAvecSerie[]
}

const PHASES = ['Accumulation', 'Intensification', 'Pic', 'Décharge']

export default function CalendrierBlocScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const blocId = Number(id)
  const [semaines, setSemaines] = useState<Semaine[]>([])
  const [nomExercice, setNomExercice] = useState('')
  const [unRm, setUnRm] = useState(0)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useFocusEffect(
    useCallback(() => {
      chargerBloc()
    }, [blocId])
  )

  async function chargerBloc() {
    const [bloc] = await db
      .select()
      .from(blocsForce)
      .where(eq(blocsForce.id, blocId))

    if (!bloc) return

    const [exercice] = await db
      .select()
      .from(exercices)
      .where(eq(exercices.id, bloc.exerciceId))

    setNomExercice(exercice?.nom ?? '')
    setUnRm(bloc.unRmKg)

    const toutesSeances = await db
      .select()
      .from(seances)
      .where(eq(seances.blocId, blocId))
      .orderBy(seances.date)

    // Pour chaque séance, récupérer la première série pour avoir charge/reps/nbSeries
    const seancesAvecSeries: SeanceAvecSerie[] = await Promise.all(
      toutesSeances.map(async (s) => {
        const [serie] = await db
          .select()
          .from(series)
          .where(eq(series.seanceId, s.id))
          .limit(1)
        return {
          id: s.id,
          date: s.date,
          typeSeance: s.typeSeance,
          statut: s.statut,
          chargeKg: serie?.chargeKg ?? 0,
          reps: serie?.reps ?? 0,
          nbSeries: serie?.nbSeries ?? 0,
        }
      })
    )

    // Grouper par semaine (2 séances par semaine)
    const semainesData: Semaine[] = [1, 2, 3, 4].map((num) => {
      const debut = (num - 1) * 2
      return {
        numero: num,
        label: `Semaine ${num}`,
        phase: PHASES[num - 1],
        seances: seancesAvecSeries.slice(debut, debut + 2),
      }
    })

    setSemaines(semainesData)
    setLoading(false)
  }

  async function supprimerBloc() {
    Alert.alert('Supprimer le bloc', 'Toutes les séances et séries associées seront supprimées.', [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Supprimer', style: 'destructive',
        onPress: async () => {
          const seancesBloc = await db.select({ id: seances.id }).from(seances).where(eq(seances.blocId, blocId))
          const seanceIds = seancesBloc.map((s) => s.id)
          if (seanceIds.length > 0) {
            await db.delete(notesSeance).where(inArray(notesSeance.seanceId, seanceIds))
            await db.delete(series).where(inArray(series.seanceId, seanceIds))
            await db.delete(seances).where(inArray(seances.id, seanceIds))
          }
          await db.delete(blocsForce).where(eq(blocsForce.id, blocId))
          router.back()
        },
      },
    ])
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
      </View>
    )
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* En-tête */}
      <View style={styles.entete}>
        <View>
          <Text style={styles.nomExercice}>{nomExercice}</Text>
          <Text style={styles.unRm}>1RM : {unRm} kg</Text>
        </View>
        <TouchableOpacity style={styles.btnSupprimer} onPress={supprimerBloc}>
          <Ionicons name="trash-outline" size={20} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Légende */}
      <View style={styles.legende}>
        {[
          { color: '#6366f1', label: 'Hypertrophie' },
          { color: '#f59e0b', label: 'Force' },
          { color: '#10b981', label: 'Décharge' },
        ].map((item) => (
          <View key={item.label} style={styles.legendeItem}>
            <View style={[styles.legendePuce, { backgroundColor: item.color }]} />
            <Text style={styles.legendeTexte}>{item.label}</Text>
          </View>
        ))}
      </View>

      {/* Semaines */}
      {semaines.map((semaine) => (
        <View key={semaine.numero} style={styles.semaine}>
          <View style={styles.semaineHeader}>
            <Text style={styles.semaineLabel}>{semaine.label}</Text>
            <Text style={styles.semainePhase}>{semaine.phase}</Text>
          </View>
          <View style={styles.seanceRow}>
            {semaine.seances.map((seance, i) => (
              <SeanceCard key={seance.id} seance={seance} />
            ))}
            {/* Placeholder si moins de 2 séances */}
            {semaine.seances.length < 2 && <View style={{ flex: 1 }} />}
          </View>
        </View>
      ))}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  content: { padding: 16, paddingBottom: 40 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  entete: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  nomExercice: { fontSize: 18, fontWeight: 'bold', color: '#fff' },
  unRm: { fontSize: 14, color: '#94a3b8', marginTop: 2 },
  btnSupprimer: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center', alignItems: 'center',
  },

  legende: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 20,
    paddingHorizontal: 4,
  },
  legendeItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendePuce: { width: 10, height: 10, borderRadius: 5 },
  legendeTexte: { fontSize: 12, color: '#64748b' },

  semaine: { marginBottom: 20 },
  semaineHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 10,
  },
  semaineLabel: { fontSize: 15, fontWeight: '700', color: '#1e293b' },
  semainePhase: { fontSize: 12, color: '#94a3b8', fontStyle: 'italic' },
  seanceRow: { flexDirection: 'row', gap: 10 },
})

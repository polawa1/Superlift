import { useState, useCallback } from 'react'
import { View, Text, ScrollView, StyleSheet, ActivityIndicator, TouchableOpacity, Alert } from 'react-native'
import { useLocalSearchParams, useFocusEffect, useRouter } from 'expo-router'
import { db } from '../../db'
import { seances, series, exercices, blocsForce, notesSeance } from '../../db/schema'
import { eq, inArray } from 'drizzle-orm'
import { SeanceCard } from '../../components/SeanceCard'
import { Ionicons } from '@expo/vector-icons'
import { useTheme } from '../../context/ThemeContext'
import { Colors } from '../../constants/colors'

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
  const { colors } = useTheme()
  const s = makeStyles(colors)

  useFocusEffect(useCallback(() => { chargerBloc() }, [blocId]))

  async function chargerBloc() {
    const [bloc] = await db.select().from(blocsForce).where(eq(blocsForce.id, blocId))
    if (!bloc) return

    const [exercice] = await db.select().from(exercices).where(eq(exercices.id, bloc.exerciceId))
    setNomExercice(exercice?.nom ?? '')
    setUnRm(bloc.unRmKg)

    const toutesSeances = await db.select().from(seances).where(eq(seances.blocId, blocId)).orderBy(seances.date)
    const seancesAvecSeries: SeanceAvecSerie[] = await Promise.all(
      toutesSeances.map(async (s) => {
        const [serie] = await db.select().from(series).where(eq(series.seanceId, s.id)).limit(1)
        return { id: s.id, date: s.date, typeSeance: s.typeSeance, statut: s.statut, chargeKg: serie?.chargeKg ?? 0, reps: serie?.reps ?? 0, nbSeries: serie?.nbSeries ?? 0 }
      })
    )

    setSemaines([1, 2, 3, 4].map((num) => ({
      numero: num, label: `Semaine ${num}`, phase: PHASES[num - 1],
      seances: seancesAvecSeries.slice((num - 1) * 2, (num - 1) * 2 + 2),
    })))
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
    return <View style={s.center}><ActivityIndicator size="large" color={colors.accent} /></View>
  }

  return (
    <ScrollView style={s.container} contentContainerStyle={s.content}>
      <View style={s.entete}>
        <View>
          <Text style={s.nomExercice}>{nomExercice}</Text>
          <Text style={s.unRm}>1RM : {unRm} kg</Text>
        </View>
        <TouchableOpacity style={s.btnSupprimer} onPress={supprimerBloc}>
          <Ionicons name="trash-outline" size={20} color="#fff" />
        </TouchableOpacity>
      </View>

      <View style={s.legende}>
        {[{ color: '#6366f1', label: 'Hypertrophie' }, { color: '#f59e0b', label: 'Force' }, { color: '#10b981', label: 'Décharge' }].map((item) => (
          <View key={item.label} style={s.legendeItem}>
            <View style={[s.legendePuce, { backgroundColor: item.color }]} />
            <Text style={s.legendeTexte}>{item.label}</Text>
          </View>
        ))}
      </View>

      {semaines.map((semaine) => (
        <View key={semaine.numero} style={s.semaine}>
          <View style={s.semaineHeader}>
            <Text style={s.semaineLabel}>{semaine.label}</Text>
            <Text style={s.semainePhase}>{semaine.phase}</Text>
          </View>
          <View style={s.seanceRow}>
            {semaine.seances.map((seance) => <SeanceCard key={seance.id} seance={seance} />)}
            {semaine.seances.length < 2 && <View style={{ flex: 1 }} />}
          </View>
        </View>
      ))}
    </ScrollView>
  )
}

function makeStyles(c: Colors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: c.bg },
    content: { padding: 16, paddingBottom: 40 },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: c.bg },
    entete: { backgroundColor: c.chart, borderRadius: 12, padding: 16, marginBottom: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    nomExercice: { fontSize: 18, fontWeight: 'bold', color: '#fff' },
    unRm: { fontSize: 14, color: '#94a3b8', marginTop: 2 },
    btnSupprimer: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.1)', justifyContent: 'center', alignItems: 'center' },
    legende: { flexDirection: 'row', gap: 16, marginBottom: 20, paddingHorizontal: 4 },
    legendeItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    legendePuce: { width: 10, height: 10, borderRadius: 5 },
    legendeTexte: { fontSize: 12, color: c.textMuted },
    semaine: { marginBottom: 20 },
    semaineHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 10 },
    semaineLabel: { fontSize: 15, fontWeight: '700', color: c.text },
    semainePhase: { fontSize: 12, color: c.textMuted, fontStyle: 'italic' },
    seanceRow: { flexDirection: 'row', gap: 10 },
  })
}

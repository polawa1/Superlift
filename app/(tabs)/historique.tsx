import { useState, useCallback } from 'react'
import { View, Text, FlatList, StyleSheet, TouchableOpacity } from 'react-native'
import { useFocusEffect } from 'expo-router'
import { db } from '../../db'
import { seances, series, exercices, blocsForce } from '../../db/schema'
import { eq, and } from 'drizzle-orm'
import { estimer1RM } from '../../services/progressionService'
import { CourbeProgression } from '../../components/CourbeProgression'
import { CourbeVolume } from '../../components/CourbeVolume'
import { CourbeComparaisonBlocs, DonneeBloc, COULEURS } from '../../components/CourbeComparaisonBlocs'
import { useTheme } from '../../context/ThemeContext'
import { Colors } from '../../constants/colors'

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

export default function HistoriqueScreen() {
  const [seancesCloturees, setSeancesCloturees] = useState<SeanceCloturee[]>([])
  const [volumeHebdo, setVolumeHebdo] = useState<Record<ExerciceId, VolumeHebdo[]>>({})
  const [courbes, setCourbes] = useState<Record<ExerciceId, { jour: number; rm: number }[]>>({})
  const [comparaisonBlocs, setComparaisonBlocs] = useState<Record<ExerciceId, DonneeBloc[]>>({})
  const [meilleurRM, setMeilleurRM] = useState<Record<ExerciceId, { valeur: number; date: string }>>({})
  const [exercicesFiltres, setExercicesFiltres] = useState<{ id: ExerciceId; nom: string }[]>([])
  const [exerciceActif, setExerciceActif] = useState<ExerciceId | null>(null)
  const { colors } = useTheme()
  const s = makeStyles(colors)

  useFocusEffect(useCallback(() => { charger() }, []))

  async function charger() {
    const exos = await db.select().from(exercices)
    setExercicesFiltres(exos)
    if (exos.length > 0) setExerciceActif(exos[0].id)

    const rows = await db
      .select({ id: seances.id, date: seances.date, typeSeance: seances.typeSeance, exerciceId: seances.exerciceId, nomExercice: exercices.nom })
      .from(seances)
      .innerJoin(exercices, eq(seances.exerciceId, exercices.id))

    const enrichies: SeanceCloturee[] = []
    for (const row of rows) {
      const seriesSeance = await db.select().from(series).where(and(eq(series.seanceId, row.id), eq(series.statut, 'VALIDEE')))
      if (seriesSeance.length === 0) continue
      const volume = seriesSeance.reduce((sum, s) => sum + s.chargeKg * s.reps, 0)
      const rm = seriesSeance.reduce((max, s) => { const v = estimer1RM(s.chargeKg, s.reps); return v > max ? v : max }, 0)
      enrichies.push({ ...row, rmEstime: Math.round(rm * 10) / 10, volumeKg: Math.round(volume) })
    }
    enrichies.sort((a, b) => a.date.localeCompare(b.date))
    setSeancesCloturees(enrichies)

    const courbsMap: Record<ExerciceId, { jour: number; rm: number }[]> = {}
    for (const exo of exos) {
      courbsMap[exo.id] = enrichies
        .filter((s) => s.exerciceId === exo.id && s.rmEstime > 0)
        .map((s, i) => ({ jour: i + 1, rm: s.rmEstime }))
    }
    setCourbes(courbsMap)

    const volMap: Record<ExerciceId, VolumeHebdo[]> = {}
    for (const exo of exos) {
      const par_semaine: Record<string, number> = {}
      enrichies.filter((s) => s.exerciceId === exo.id).forEach((s) => {
        const sem = getSemaine(s.date)
        par_semaine[sem] = (par_semaine[sem] ?? 0) + s.volumeKg
      })
      volMap[exo.id] = Object.entries(par_semaine).sort(([a], [b]) => a.localeCompare(b)).map(([semaine, volumeKg]) => ({ semaine, volumeKg }))
    }
    setVolumeHebdo(volMap)

    const comparMap: Record<ExerciceId, DonneeBloc[]> = {}
    for (const exo of exos) {
      const blocs = await db.select().from(blocsForce).where(eq(blocsForce.exerciceId, exo.id))
      const donneeBlocs: DonneeBloc[] = []
      for (let i = 0; i < blocs.length; i++) {
        const bloc = blocs[i]
        const seancesBloc = await db.select({ id: seances.id, date: seances.date }).from(seances).where(eq(seances.blocId, bloc.id))
        seancesBloc.sort((a, b) => a.date.localeCompare(b.date))
        const points: { session: number; rm: number }[] = []
        for (let j = 0; j < seancesBloc.length; j++) {
          const seriesSeance = await db.select().from(series).where(and(eq(series.seanceId, seancesBloc[j].id), eq(series.statut, 'VALIDEE')))
          if (seriesSeance.length === 0) continue
          const rm = seriesSeance.reduce((max, sr) => { const v = estimer1RM(sr.chargeKg, sr.reps); return v > max ? v : max }, 0)
          if (rm > 0) points.push({ session: j + 1, rm: Math.round(rm * 10) / 10 })
        }
        if (points.length >= 2) donneeBlocs.push({ blocId: bloc.id, dateDebut: bloc.dateDebut, points, couleur: COULEURS[i % COULEURS.length] })
      }
      comparMap[exo.id] = donneeBlocs
    }
    setComparaisonBlocs(comparMap)

    // Meilleur 1RM réalisé parmi les blocs terminés (séance test_max clôturée)
    const meilleurMap: Record<ExerciceId, { valeur: number; date: string }> = {}
    for (const exo of exos) {
      const blocs = await db.select().from(blocsForce).where(eq(blocsForce.exerciceId, exo.id))
      let best = 0
      let bestDate = ''
      for (const bloc of blocs) {
        const seancesBloc = await db.select().from(seances).where(eq(seances.blocId, bloc.id))
        const testMax = seancesBloc.find((s) => s.typeSeance === 'test_max' && s.statut === 'CLOTUREE')
        if (!testMax) continue
        const seriesTestMax = await db.select().from(series).where(and(eq(series.seanceId, testMax.id), eq(series.statut, 'VALIDEE')))
        const rm = seriesTestMax.reduce((max, sr) => sr.chargeKg > max ? sr.chargeKg : max, 0)
        if (rm > best) { best = rm; bestDate = testMax.date }
      }
      if (best > 0) meilleurMap[exo.id] = { valeur: Math.round(best * 10) / 10, date: bestDate }
    }
    setMeilleurRM(meilleurMap)
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
    <View style={s.container}>
      <View style={s.onglets}>
        {exercicesFiltres.map((exo) => (
          <TouchableOpacity
            key={exo.id}
            style={[s.onglet, exerciceActif === exo.id && s.ongletActif]}
            onPress={() => setExerciceActif(exo.id)}
          >
            <Text style={[s.ongletTexte, exerciceActif === exo.id && s.ongletTexteActif]}>{exo.nom}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={seancesActives}
        keyExtractor={(item) => String(item.id)}
        ListHeaderComponent={
          <>
            {exerciceActif !== null && meilleurRM[exerciceActif] && (
              <View style={s.bestRM}>
                <View>
                  <Text style={s.bestRMLabel}>Meilleur 1RM réalisé</Text>
                  <Text style={s.bestRMSous}>
                    {new Date(meilleurRM[exerciceActif].date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </Text>
                </View>
                <View style={s.bestRMValeurRow}>
                  <Text style={s.bestRMValeur}>{meilleurRM[exerciceActif].valeur} kg</Text>
                  <Text style={s.bestRMTrophee}>🏆</Text>
                </View>
              </View>
            )}
            {exerciceActif !== null && (
              <CourbeProgression donnees={courbes[exerciceActif] ?? []} nomExercice={exercicesFiltres.find((e) => e.id === exerciceActif)?.nom} />
            )}
            {recordRM > 0 && (
              <View style={s.record}>
                <Text style={s.recordLabel}>Record 1RM estimé (Epley)</Text>
                <Text style={s.recordValeur}>{recordRM} kg</Text>
              </View>
            )}
            {exerciceActif !== null && <CourbeVolume donnees={volumeHebdo[exerciceActif] ?? []} />}
            {exerciceActif !== null && <CourbeComparaisonBlocs blocs={comparaisonBlocs[exerciceActif] ?? []} />}
            <Text style={s.sectionTitre}>Séances</Text>
          </>
        }
        ListEmptyComponent={<Text style={s.vide}>Aucune séance clôturée pour cet exercice</Text>}
        renderItem={({ item }) => (
          <View style={s.carte}>
            <View style={s.carteEntete}>
              <Text style={s.date}>{item.date}</Text>
              <Text style={s.type}>{item.typeSeance}</Text>
            </View>
            <View style={s.carteStats}>
              <Text style={s.stat}>1RM ≈ {item.rmEstime} kg</Text>
              <Text style={s.stat}>Volume : {item.volumeKg} kg</Text>
            </View>
          </View>
        )}
      />
    </View>
  )
}

function makeStyles(c: Colors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: c.bg },
    onglets: { flexDirection: 'row', borderBottomWidth: 1, borderColor: c.borderLight, backgroundColor: c.bgCard },
    onglet: { flex: 1, paddingVertical: 10, alignItems: 'center' },
    ongletActif: { borderBottomWidth: 2, borderColor: c.accent },
    ongletTexte: { fontSize: 12, color: c.textMuted },
    ongletTexteActif: { color: c.text, fontWeight: '600' },
    bestRM: { margin: 12, padding: 16, backgroundColor: c.accent, borderRadius: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    bestRMLabel: { fontSize: 14, fontWeight: '700', color: '#fff' },
    bestRMSous: { fontSize: 11, color: 'rgba(255,255,255,0.75)', marginTop: 2 },
    bestRMValeurRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    bestRMTrophee: { fontSize: 28 },
    bestRMValeur: { fontSize: 32, fontWeight: 'bold', color: '#fff' },
    record: { margin: 12, padding: 12, backgroundColor: c.bgMuted, borderRadius: 8, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    recordLabel: { fontSize: 13, color: c.textSub },
    recordValeur: { fontSize: 20, fontWeight: 'bold', color: c.text },
    sectionTitre: { fontSize: 13, fontWeight: '600', color: c.text, margin: 12, marginBottom: 6 },
    carte: { padding: 14, borderBottomWidth: 1, borderColor: c.borderLight, backgroundColor: c.bg },
    carteEntete: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
    date: { fontSize: 12, color: c.textMuted },
    type: { fontSize: 12, color: c.textSub, textTransform: 'capitalize' },
    carteStats: { flexDirection: 'row', gap: 16 },
    stat: { fontSize: 14, fontWeight: '500', color: c.text },
    vide: { textAlign: 'center', marginTop: 40, color: c.textFaint },
  })
}

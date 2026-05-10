import { useState, useCallback } from 'react'
import {
  View, Text, StyleSheet, FlatList,
  TouchableOpacity, RefreshControl, SectionList,
} from 'react-native'
import { useRouter, useFocusEffect } from 'expo-router'
import { db } from '../../db'
import { blocsForce, exercices, seances, series } from '../../db/schema'
import { eq, desc } from 'drizzle-orm'
import { useTheme } from '../../context/ThemeContext'
import { Colors } from '../../constants/colors'

const TYPE_LABEL: Record<string, string> = {
  hypertrophie: 'Hypertrophie',
  force: 'Force',
  decharge: 'Décharge',
  test_max: 'Test max',
}

const TYPE_COLOR: Record<string, string> = {
  hypertrophie: '#6366f1',
  force: '#f59e0b',
  decharge: '#10b981',
  test_max: '#ef4444',
}

type ProchaineSeance = {
  id: number
  date: string
  typeSeance: string
  chargeKg: number
  reps: number
  nbSeries: number
}

type BlocResume = {
  id: number
  dateDebut: string
  unRmKg: number
  nomExercice: string
  nbSeances: number
  nbCloturees: number
  prochaine: ProchaineSeance | null
  termine: boolean
}

export default function AccueilScreen() {
  const [blocs, setBlocs] = useState<BlocResume[]>([])
  const [refreshing, setRefreshing] = useState(false)
  const router = useRouter()
  const { colors } = useTheme()
  const s = makeStyles(colors)

  useFocusEffect(useCallback(() => { chargerBlocs() }, []))

  async function chargerBlocs() {
    const rows = await db
      .select({ id: blocsForce.id, dateDebut: blocsForce.dateDebut, unRmKg: blocsForce.unRmKg, nomExercice: exercices.nom })
      .from(blocsForce)
      .innerJoin(exercices, eq(blocsForce.exerciceId, exercices.id))
      .orderBy(desc(blocsForce.id))

    const blocsAvecStats = await Promise.all(
      rows.map(async (b) => {
        const toutesSeances = await db.select().from(seances).where(eq(seances.blocId, b.id))
        const cloturees = toutesSeances.filter((s) => s.statut === 'CLOTUREE').length
        const testMaxSeance = toutesSeances.find((s) => s.typeSeance === 'test_max')
        const termine = testMaxSeance ? testMaxSeance.statut === 'CLOTUREE' : toutesSeances.length > 0 && cloturees === toutesSeances.length

        const planifiees = toutesSeances
          .filter((s) => s.statut === 'PLANIFIEE')
          .sort((a, b) => a.date.localeCompare(b.date))
        const prochaine = planifiees[0] ?? null

        let prochaineAvecSerie: ProchaineSeance | null = null
        if (prochaine) {
          const allSeries = await db.select().from(series).where(eq(series.seanceId, prochaine.id))
          if (allSeries.length > 0) {
            prochaineAvecSerie = {
              id: prochaine.id, date: prochaine.date, typeSeance: prochaine.typeSeance,
              chargeKg: allSeries[0].chargeKg, reps: allSeries[0].reps, nbSeries: allSeries.length,
            }
          }
        }

        return { ...b, nbSeances: toutesSeances.length, nbCloturees: cloturees, prochaine: prochaineAvecSerie, termine }
      })
    )
    setBlocs(blocsAvecStats)
  }

  async function onRefresh() {
    setRefreshing(true)
    await chargerBlocs()
    setRefreshing(false)
  }

  const dateFormatee = (d: string) =>
    new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
  const dateCourte = (d: string) =>
    new Date(d).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' })

  const enCours = blocs.filter((b) => !b.termine)
  const termines = blocs.filter((b) => b.termine)

  const sections = [
    { title: null, data: enCours },
    ...(termines.length > 0 ? [{ title: 'Blocs terminés', data: termines }] : []),
  ]

  const renderBloc = (item: BlocResume, termine: boolean) => {
    const progression = item.nbSeances > 0 ? Math.round((item.nbCloturees / item.nbSeances) * 100) : 0
    const typeColor = item.prochaine ? (TYPE_COLOR[item.prochaine.typeSeance] ?? colors.accent) : colors.accent

    return (
      <TouchableOpacity
        style={[s.carte, termine && s.carteTerminee]}
        onPress={() => router.push(`/bloc/${item.id}`)}
        activeOpacity={0.7}
      >
        <View style={s.carteHeader}>
          <Text style={[s.carteExercice, termine && s.texteTermine]}>{item.nomExercice}</Text>
          <Text style={[s.carteRm, termine && s.texteTermine]}>1RM {item.unRmKg} kg</Text>
        </View>
        <Text style={s.carteDate}>Démarré le {dateFormatee(item.dateDebut)}</Text>

        {!termine && item.prochaine ? (
          <View style={[s.prochaine, { borderLeftColor: typeColor }]}>
            <View style={s.prochaineHeader}>
              <Text style={[s.prochaineType, { color: typeColor }]}>
                {TYPE_LABEL[item.prochaine.typeSeance] ?? item.prochaine.typeSeance}
              </Text>
              <Text style={s.prochaineDate}>{dateCourte(item.prochaine.date)}</Text>
            </View>
            <Text style={s.prochaineCharge}>
              {item.prochaine.nbSeries}×{item.prochaine.reps} reps · <Text style={s.prochaineKg}>{item.prochaine.chargeKg} kg</Text>
            </Text>
          </View>
        ) : (
          <View style={s.badgeTermine}>
            <Text style={s.badgeTermineTexte}>✓ Terminé</Text>
          </View>
        )}

        <View style={s.progressContainer}>
          <View style={s.progressBar}>
            <View style={[s.progressFill, { width: `${progression}%`, backgroundColor: termine ? colors.textFaint : colors.accent }]} />
          </View>
          <Text style={s.progressTexte}>{item.nbCloturees}/{item.nbSeances} séances</Text>
        </View>

        <Text style={[s.voirCalendrier, termine && { color: colors.textMuted }]}>Voir le calendrier →</Text>
      </TouchableOpacity>
    )
  }

  return (
    <View style={s.container}>
      <SectionList
        sections={sections}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={s.liste}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        renderSectionHeader={({ section }) =>
          section.title ? <Text style={s.sectionHeader}>{section.title}</Text> : null
        }
        ListEmptyComponent={
          <View style={s.vide}>
            <Text style={s.videEmoji}>🏋️</Text>
            <Text style={s.videTitre}>Aucun bloc actif</Text>
            <Text style={s.videSous}>Démarre ton premier bloc DUP pour planifier tes séances</Text>
          </View>
        }
        renderItem={({ item, section }) => renderBloc(item, section.title !== null)}
      />
      <TouchableOpacity style={s.boutonNouveauBloc} onPress={() => router.push('/bloc/nouveau')}>
        <Text style={s.boutonTexte}>+ Nouveau bloc</Text>
      </TouchableOpacity>
    </View>
  )
}

function makeStyles(c: Colors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: c.bg },
    liste: { padding: 16, paddingBottom: 8 },
    vide: { alignItems: 'center', marginTop: 80, paddingHorizontal: 32 },
    videEmoji: { fontSize: 48, marginBottom: 12 },
    videTitre: { fontSize: 18, fontWeight: 'bold', color: c.text, marginBottom: 8 },
    videSous: { fontSize: 14, color: c.textFaint, textAlign: 'center', lineHeight: 20 },
    sectionHeader: { fontSize: 13, fontWeight: '700', color: c.textMuted, textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 8, marginBottom: 10 },
    carte: {
      backgroundColor: c.bgCard, borderRadius: 12, padding: 16, marginBottom: 12,
      shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 2,
    },
    carteTerminee: { opacity: 0.6 },
    carteHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
    carteExercice: { fontSize: 17, fontWeight: 'bold', color: c.text },
    carteRm: { fontSize: 14, fontWeight: '600', color: c.accent },
    texteTermine: { color: c.textMuted },
    carteDate: { fontSize: 13, color: c.textMuted, marginBottom: 10 },
    prochaine: { borderLeftWidth: 3, borderLeftColor: c.border, paddingLeft: 10, marginBottom: 12 },
    prochaineHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 2 },
    prochaineType: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
    prochaineDate: { fontSize: 12, color: c.textMuted, textTransform: 'capitalize' },
    prochaineCharge: { fontSize: 14, color: c.textSub },
    prochaineKg: { fontWeight: '700', color: c.text },
    badgeTermine: { marginBottom: 12 },
    badgeTermineTexte: { fontSize: 13, color: c.textMuted, fontStyle: 'italic' },
    progressContainer: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
    progressBar: { flex: 1, height: 6, backgroundColor: c.border, borderRadius: 3, overflow: 'hidden' },
    progressFill: { height: '100%', borderRadius: 3 },
    progressTexte: { fontSize: 12, color: c.textMuted, minWidth: 70, textAlign: 'right' },
    voirCalendrier: { fontSize: 13, color: c.accent, fontWeight: '600' },
    boutonNouveauBloc: { margin: 16, backgroundColor: c.btnPrimary, borderRadius: 10, padding: 15, alignItems: 'center' },
    boutonTexte: { color: c.btnPrimaryText, fontWeight: 'bold', fontSize: 16 },
  })
}

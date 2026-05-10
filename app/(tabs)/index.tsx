import { useState, useCallback } from 'react'
import {
  View, Text, StyleSheet, FlatList,
  TouchableOpacity, RefreshControl,
} from 'react-native'
import { useRouter, useFocusEffect } from 'expo-router'
import { db } from '../../db'
import { blocsForce, exercices, seances } from '../../db/schema'
import { eq, desc } from 'drizzle-orm'
import { useTheme } from '../../context/ThemeContext'
import { Colors } from '../../constants/colors'

type BlocResume = {
  id: number
  dateDebut: string
  unRmKg: number
  nomExercice: string
  nbSeances: number
  nbCloturees: number
}

export default function AccueilScreen() {
  const [blocs, setBlocs] = useState<BlocResume[]>([])
  const [refreshing, setRefreshing] = useState(false)
  const router = useRouter()
  const { colors } = useTheme()
  const s = makeStyles(colors)

  useFocusEffect(
    useCallback(() => {
      chargerBlocs()
    }, [])
  )

  async function chargerBlocs() {
    const rows = await db
      .select({
        id: blocsForce.id,
        dateDebut: blocsForce.dateDebut,
        unRmKg: blocsForce.unRmKg,
        nomExercice: exercices.nom,
      })
      .from(blocsForce)
      .innerJoin(exercices, eq(blocsForce.exerciceId, exercices.id))
      .orderBy(desc(blocsForce.id))

    const blocsAvecStats = await Promise.all(
      rows.map(async (b) => {
        const toutesSeances = await db.select().from(seances).where(eq(seances.blocId, b.id))
        const cloturees = toutesSeances.filter((s) => s.statut === 'CLOTUREE').length
        return { ...b, nbSeances: toutesSeances.length, nbCloturees: cloturees }
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

  return (
    <View style={s.container}>
      <FlatList
        data={blocs}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={s.liste}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={
          <View style={s.vide}>
            <Text style={s.videEmoji}>🏋️</Text>
            <Text style={s.videTitre}>Aucun bloc actif</Text>
            <Text style={s.videSous}>Démarre ton premier bloc DUP pour planifier tes séances</Text>
          </View>
        }
        renderItem={({ item }) => {
          const progression = item.nbSeances > 0
            ? Math.round((item.nbCloturees / item.nbSeances) * 100)
            : 0
          return (
            <TouchableOpacity style={s.carte} onPress={() => router.push(`/bloc/${item.id}`)} activeOpacity={0.7}>
              <View style={s.carteHeader}>
                <Text style={s.carteExercice}>{item.nomExercice}</Text>
                <Text style={s.carteRm}>1RM {item.unRmKg} kg</Text>
              </View>
              <Text style={s.carteDate}>Démarré le {dateFormatee(item.dateDebut)}</Text>
              <View style={s.progressContainer}>
                <View style={s.progressBar}>
                  <View style={[s.progressFill, { width: `${progression}%` }]} />
                </View>
                <Text style={s.progressTexte}>{item.nbCloturees}/{item.nbSeances} séances</Text>
              </View>
              <Text style={s.voirCalendrier}>Voir le calendrier →</Text>
            </TouchableOpacity>
          )
        }}
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
    carte: {
      backgroundColor: c.bgCard,
      borderRadius: 12,
      padding: 16,
      marginBottom: 12,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.06,
      shadowRadius: 4,
      elevation: 2,
    },
    carteHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
    carteExercice: { fontSize: 17, fontWeight: 'bold', color: c.text },
    carteRm: { fontSize: 14, fontWeight: '600', color: c.accent },
    carteDate: { fontSize: 13, color: c.textMuted, marginBottom: 12 },
    progressContainer: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
    progressBar: { flex: 1, height: 6, backgroundColor: c.border, borderRadius: 3, overflow: 'hidden' },
    progressFill: { height: '100%', backgroundColor: c.accent, borderRadius: 3 },
    progressTexte: { fontSize: 12, color: c.textMuted, minWidth: 70, textAlign: 'right' },
    voirCalendrier: { fontSize: 13, color: c.accent, fontWeight: '600' },
    boutonNouveauBloc: { margin: 16, backgroundColor: c.btnPrimary, borderRadius: 10, padding: 15, alignItems: 'center' },
    boutonTexte: { color: c.btnPrimaryText, fontWeight: 'bold', fontSize: 16 },
  })
}

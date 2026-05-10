import { useState, useEffect } from 'react'
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from 'react-native'
import { useRouter } from 'expo-router'
import { db } from '../../db'
import { blocsForce, series, seances, exercices } from '../../db/schema'
import { genererSeancesBloc } from '../../services/dupService'
import { seedExercices } from '../../db/seed'
import { useTheme } from '../../context/ThemeContext'
import { Colors } from '../../constants/colors'

export default function NouveauBlocScreen() {
  const router = useRouter()
  const [listeExercices, setListeExercices] = useState<{ id: number; nom: string }[]>([])
  const [exerciceId, setExerciceId] = useState<number | null>(null)
  const [unRm, setUnRm] = useState('')
  const { colors } = useTheme()
  const s = makeStyles(colors)

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
    if (isNaN(unRmKg) || unRmKg <= 0) { Alert.alert('Erreur', 'Saisis un 1RM valide'); return }
    if (!exerciceId) return

    const dateDebut = new Date().toISOString().split('T')[0]
    const [bloc] = await db.insert(blocsForce).values({ dateDebut, exerciceId, unRmKg }).returning()
    const seancesPlanifiees = genererSeancesBloc(bloc.id, exerciceId, unRmKg, new Date())

    for (const s of seancesPlanifiees) {
      const [seance] = await db.insert(seances).values({ date: s.date, exerciceId: s.exerciceId, blocId: s.blocId, typeSeance: s.typeSeance, statut: s.statut }).returning()
      for (let i = 0; i < s.nbSeries; i++) {
        await db.insert(series).values({ seanceId: seance.id, exerciceId: s.exerciceId, chargeKg: s.chargeKg, reps: s.reps, nbSeries: 1, statut: 'PLANIFIEE' })
      }
    }
    router.replace('/')
  }

  return (
    <View style={s.container}>
      <Text style={s.titre}>Nouveau bloc DUP</Text>
      <Text style={s.label}>Exercice</Text>
      <View style={s.exerciceList}>
        {listeExercices.map((ex) => (
          <TouchableOpacity key={ex.id} style={[s.chip, exerciceId === ex.id && s.chipActif]} onPress={() => setExerciceId(ex.id)}>
            <Text style={[s.chipTexte, exerciceId === ex.id && s.chipTexteActif]}>{ex.nom}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <Text style={s.label}>1RM (kg)</Text>
      <TextInput style={s.input} keyboardType="numeric" placeholder="ex: 100" placeholderTextColor={colors.textFaint} value={unRm} onChangeText={setUnRm} />
      <TouchableOpacity style={s.bouton} onPress={demarrerBloc}>
        <Text style={s.boutonTexte}>Démarrer le bloc (4 semaines)</Text>
      </TouchableOpacity>
    </View>
  )
}

function makeStyles(c: Colors) {
  return StyleSheet.create({
    container: { flex: 1, padding: 24, backgroundColor: c.bg },
    titre: { fontSize: 22, fontWeight: 'bold', marginBottom: 24, color: c.text },
    label: { fontSize: 14, color: c.textSub, marginBottom: 8 },
    exerciceList: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 24 },
    chip: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: 20, borderWidth: 1, borderColor: c.borderInput },
    chipActif: { backgroundColor: c.btnPrimary, borderColor: c.btnPrimary },
    chipTexte: { color: c.textSub },
    chipTexteActif: { color: c.btnPrimaryText },
    input: { borderWidth: 1, borderColor: c.borderInput, borderRadius: 8, padding: 12, fontSize: 16, marginBottom: 24, color: c.text, backgroundColor: c.bgInput },
    bouton: { backgroundColor: c.btnPrimary, borderRadius: 8, padding: 14, alignItems: 'center' },
    boutonTexte: { color: c.btnPrimaryText, fontWeight: 'bold', fontSize: 16 },
  })
}

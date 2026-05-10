import { useEffect, useState } from 'react'
import {
  View, Text, TextInput, FlatList, StyleSheet,
  TouchableOpacity, Alert, KeyboardAvoidingView, Platform,
} from 'react-native'
import { db } from '../../db'
import { exercices, objectifsExercice } from '../../db/schema'
import { eq, inArray } from 'drizzle-orm'

type Objectif = {
  id: number
  exerciceId: number
  nomExercice: string
  chargeKg: number
  nbSeries: number
  reps: number
  rpeCible: number | null
  incrementKg: number
  seuilProgression: number
  seuilMaintien: number
  reductionEchec: number
}

type Draft = Record<number, Partial<Objectif>>

export default function ParametresScreen() {
  const [objectifs, setObjectifs] = useState<Objectif[]>([])
  const [drafts, setDrafts] = useState<Draft>({})

  useEffect(() => {
    charger()
  }, [])

  async function charger() {
    const exos = await db.select().from(exercices)
    let objs = await db.select().from(objectifsExercice)

    // Supprimer les doublons : garder uniquement le plus récent par exercice
    for (const exo of exos) {
      const doublons = objs.filter((o) => o.exerciceId === exo.id)
      if (doublons.length > 1) {
        const aSupprimerIds = doublons.slice(0, -1).map((o) => o.id)
        await db.delete(objectifsExercice).where(inArray(objectifsExercice.id, aSupprimerIds))
      }
    }

    // Créer un objectif par défaut pour chaque exercice sans entrée
    const exosManquants = exos.filter((e) => !objs.some((o) => o.exerciceId === e.id))
    if (exosManquants.length > 0) {
      await db.insert(objectifsExercice).values(
        exosManquants.map((e) => ({
          exerciceId: e.id,
          chargeKg: 60,
          nbSeries: 3,
          reps: 8,
          rpeCible: null,
          incrementKg: 2.5,
          seuilProgression: 1.0,
          seuilMaintien: 0.75,
          reductionEchec: 0.05,
        }))
      )
    }
    objs = await db.select().from(objectifsExercice)

    const enrichis: Objectif[] = objs.map((o) => ({
      id: o.id,
      exerciceId: o.exerciceId,
      nomExercice: exos.find((e) => e.id === o.exerciceId)?.nom ?? '—',
      chargeKg: o.chargeKg,
      nbSeries: o.nbSeries,
      reps: o.reps,
      rpeCible: o.rpeCible,
      incrementKg: o.incrementKg ?? 2.5,
      seuilProgression: o.seuilProgression ?? 1.0,
      seuilMaintien: o.seuilMaintien ?? 0.75,
      reductionEchec: o.reductionEchec ?? 0.05,
    }))

    setObjectifs(enrichis)
    const d: Draft = {}
    enrichis.forEach((o) => { d[o.id] = {} })
    setDrafts(d)
  }

  function setField(id: number, field: keyof Objectif, value: string) {
    const num = parseFloat(value)
    setDrafts((prev) => ({
      ...prev,
      [id]: { ...prev[id], [field]: isNaN(num) ? value : num },
    }))
  }

  async function sauvegarder(objectif: Objectif) {
    const d = drafts[objectif.id] ?? {}
    const maj = {
      chargeKg:         (d.chargeKg         ?? objectif.chargeKg),
      nbSeries:         Math.round(d.nbSeries         ?? objectif.nbSeries),
      reps:             Math.round(d.reps             ?? objectif.reps),
      rpeCible:         d.rpeCible          ?? objectif.rpeCible,
      incrementKg:      d.incrementKg       ?? objectif.incrementKg,
      seuilProgression: d.seuilProgression  ?? objectif.seuilProgression,
      seuilMaintien:    d.seuilMaintien     ?? objectif.seuilMaintien,
      reductionEchec:   d.reductionEchec    ?? objectif.reductionEchec,
    }

    await db.update(objectifsExercice).set(maj).where(eq(objectifsExercice.id, objectif.id))
    Alert.alert('Sauvegardé', `Objectifs mis à jour pour ${objectif.nomExercice}`)
    charger()
  }

  function val(obj: Objectif, field: keyof Objectif): string {
    const d = drafts[obj.id]?.[field]
    return d !== undefined ? String(d) : String(obj[field] ?? '')
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <FlatList
        data={objectifs}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.liste}
        ListHeaderComponent={<Text style={styles.titrePage}>Objectifs par exercice</Text>}
        ListEmptyComponent={<Text style={styles.vide}>Aucun objectif configuré</Text>}
        renderItem={({ item }) => (
          <View style={styles.carte}>
            <Text style={styles.nomExercice}>{item.nomExercice}</Text>

            <Text style={styles.section}>Prescription</Text>
            <View style={styles.ligne}>
              <Champ label="Charge (kg)" value={val(item, 'chargeKg')} onChange={(v) => setField(item.id, 'chargeKg', v)} />
              <Champ label="Séries" value={val(item, 'nbSeries')} onChange={(v) => setField(item.id, 'nbSeries', v)} entier />
              <Champ label="Reps" value={val(item, 'reps')} onChange={(v) => setField(item.id, 'reps', v)} entier />
              <Champ label="RPE cible" value={val(item, 'rpeCible')} onChange={(v) => setField(item.id, 'rpeCible', v)} />
            </View>

            <Text style={styles.section}>Progression</Text>
            <View style={styles.ligne}>
              <Champ label="Incrément (kg)" value={val(item, 'incrementKg')} onChange={(v) => setField(item.id, 'incrementKg', v)} />
              <Champ label="Seuil ✓ (%)" value={String(Math.round((item.seuilProgression) * 100))} onChange={(v) => setField(item.id, 'seuilProgression', String(parseFloat(v) / 100))} entier />
              <Champ label="Seuil ~ (%)" value={String(Math.round((item.seuilMaintien) * 100))} onChange={(v) => setField(item.id, 'seuilMaintien', String(parseFloat(v) / 100))} entier />
              <Champ label="Réduction (%)" value={String(Math.round((item.reductionEchec) * 100))} onChange={(v) => setField(item.id, 'reductionEchec', String(parseFloat(v) / 100))} entier />
            </View>

            <TouchableOpacity style={styles.bouton} onPress={() => sauvegarder(item)}>
              <Text style={styles.boutonTexte}>Sauvegarder</Text>
            </TouchableOpacity>
          </View>
        )}
      />
    </KeyboardAvoidingView>
  )
}

function Champ({
  label, value, onChange, entier,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  entier?: boolean
}) {
  return (
    <View style={chStyles.container}>
      <Text style={chStyles.label}>{label}</Text>
      <TextInput
        style={chStyles.input}
        value={value}
        onChangeText={onChange}
        keyboardType={entier ? 'number-pad' : 'decimal-pad'}
        selectTextOnFocus
      />
    </View>
  )
}

const chStyles = StyleSheet.create({
  container: { flex: 1, minWidth: 72 },
  label: { fontSize: 10, color: '#888', marginBottom: 2 },
  input: {
    borderWidth: 1, borderColor: '#ddd', borderRadius: 6,
    padding: 6, fontSize: 14, textAlign: 'center', backgroundColor: '#fafafa',
  },
})

const styles = StyleSheet.create({
  liste: { padding: 16, gap: 16 },
  titrePage: { fontSize: 20, fontWeight: 'bold', marginBottom: 8 },
  carte: {
    borderWidth: 1, borderColor: '#eee', borderRadius: 10,
    padding: 14, backgroundColor: '#fff',
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, elevation: 2,
  },
  nomExercice: { fontSize: 16, fontWeight: 'bold', marginBottom: 10 },
  section: { fontSize: 11, fontWeight: '600', color: '#888', textTransform: 'uppercase', marginBottom: 6, marginTop: 4 },
  ligne: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  bouton: { marginTop: 8, backgroundColor: '#000', borderRadius: 8, padding: 10, alignItems: 'center' },
  boutonTexte: { color: '#fff', fontWeight: '600', fontSize: 14 },
  vide: { textAlign: 'center', color: '#aaa', marginTop: 40 },
})

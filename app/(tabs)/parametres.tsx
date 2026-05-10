import { useEffect, useState } from 'react'
import {
  View, Text, TextInput, FlatList, StyleSheet,
  TouchableOpacity, Alert, KeyboardAvoidingView, Platform, Switch,
} from 'react-native'
import { db } from '../../db'
import { exercices, objectifsExercice } from '../../db/schema'
import { eq, inArray } from 'drizzle-orm'
import { useTheme } from '../../context/ThemeContext'
import { Colors } from '../../constants/colors'
import { useThemeStore } from '../../store/themeStore'

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
  const { colors, isDark } = useTheme()
  const { override, setOverride } = useThemeStore()
  const s = makeStyles(colors)
  const ch = makeChStyles(colors)

  useEffect(() => { charger() }, [])

  async function charger() {
    const exos = await db.select().from(exercices)
    let objs = await db.select().from(objectifsExercice)

    for (const exo of exos) {
      const doublons = objs.filter((o) => o.exerciceId === exo.id)
      if (doublons.length > 1) {
        const aSupprimerIds = doublons.slice(0, -1).map((o) => o.id)
        await db.delete(objectifsExercice).where(inArray(objectifsExercice.id, aSupprimerIds))
      }
    }

    const exosManquants = exos.filter((e) => !objs.some((o) => o.exerciceId === e.id))
    if (exosManquants.length > 0) {
      await db.insert(objectifsExercice).values(
        exosManquants.map((e) => ({ exerciceId: e.id, chargeKg: 60, nbSeries: 3, reps: 8, rpeCible: null, incrementKg: 2.5, seuilProgression: 1.0, seuilMaintien: 0.75, reductionEchec: 0.05 }))
      )
    }
    objs = await db.select().from(objectifsExercice)

    const enrichis: Objectif[] = objs.map((o) => ({
      id: o.id, exerciceId: o.exerciceId,
      nomExercice: exos.find((e) => e.id === o.exerciceId)?.nom ?? '—',
      chargeKg: o.chargeKg, nbSeries: o.nbSeries, reps: o.reps, rpeCible: o.rpeCible,
      incrementKg: o.incrementKg ?? 2.5, seuilProgression: o.seuilProgression ?? 1.0,
      seuilMaintien: o.seuilMaintien ?? 0.75, reductionEchec: o.reductionEchec ?? 0.05,
    }))

    setObjectifs(enrichis)
    const d: Draft = {}
    enrichis.forEach((o) => { d[o.id] = {} })
    setDrafts(d)
  }

  function setField(id: number, field: keyof Objectif, value: string) {
    const num = parseFloat(value)
    setDrafts((prev) => ({ ...prev, [id]: { ...prev[id], [field]: isNaN(num) ? value : num } }))
  }

  async function sauvegarder(objectif: Objectif) {
    const d = drafts[objectif.id] ?? {}
    const maj = {
      chargeKg: (d.chargeKg ?? objectif.chargeKg),
      nbSeries: Math.round(d.nbSeries ?? objectif.nbSeries),
      reps: Math.round(d.reps ?? objectif.reps),
      rpeCible: d.rpeCible ?? objectif.rpeCible,
      incrementKg: d.incrementKg ?? objectif.incrementKg,
      seuilProgression: d.seuilProgression ?? objectif.seuilProgression,
      seuilMaintien: d.seuilMaintien ?? objectif.seuilMaintien,
      reductionEchec: d.reductionEchec ?? objectif.reductionEchec,
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
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.bg }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <FlatList
        data={objectifs}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={s.liste}
        ListHeaderComponent={
          <>
            <Text style={s.titrePage}>Paramètres</Text>
            <View style={s.toggleRow}>
              <Text style={s.toggleLabel}>Mode sombre</Text>
              <Switch
                value={isDark}
                onValueChange={(v) => setOverride(v ? 'dark' : 'light')}
                trackColor={{ false: colors.border, true: colors.accent }}
                thumbColor={colors.bgCard}
              />
            </View>
            <Text style={s.sectionTitre}>Objectifs par exercice</Text>
          </>
        }
        ListFooterComponent={
          <View style={s.footer}>
            <Text style={s.footerTitre}>Superlift</Text>
            <Text style={s.footerSous}>v1.0 · Développé par Johan DEGUIL</Text>
          </View>
        }
        ListEmptyComponent={<Text style={s.vide}>Aucun objectif configuré</Text>}
        renderItem={({ item }) => (
          <View style={s.carte}>
            <Text style={s.nomExercice}>{item.nomExercice}</Text>
            <Text style={s.section}>Prescription</Text>
            <View style={s.ligne}>
              <Champ label="Charge (kg)" value={val(item, 'chargeKg')} onChange={(v) => setField(item.id, 'chargeKg', v)} chStyles={ch} />
              <Champ label="Séries" value={val(item, 'nbSeries')} onChange={(v) => setField(item.id, 'nbSeries', v)} entier chStyles={ch} />
              <Champ label="Reps" value={val(item, 'reps')} onChange={(v) => setField(item.id, 'reps', v)} entier chStyles={ch} />
              <Champ label="RPE cible" value={val(item, 'rpeCible')} onChange={(v) => setField(item.id, 'rpeCible', v)} chStyles={ch} />
            </View>
            <Text style={s.section}>Progression</Text>
            <View style={s.ligne}>
              <Champ label="Incrément (kg)" value={val(item, 'incrementKg')} onChange={(v) => setField(item.id, 'incrementKg', v)} chStyles={ch} />
              <Champ label="Seuil ✓ (%)" value={String(Math.round(item.seuilProgression * 100))} onChange={(v) => setField(item.id, 'seuilProgression', String(parseFloat(v) / 100))} entier chStyles={ch} />
              <Champ label="Seuil ~ (%)" value={String(Math.round(item.seuilMaintien * 100))} onChange={(v) => setField(item.id, 'seuilMaintien', String(parseFloat(v) / 100))} entier chStyles={ch} />
              <Champ label="Réduction (%)" value={String(Math.round(item.reductionEchec * 100))} onChange={(v) => setField(item.id, 'reductionEchec', String(parseFloat(v) / 100))} entier chStyles={ch} />
            </View>
            <TouchableOpacity style={s.bouton} onPress={() => sauvegarder(item)}>
              <Text style={s.boutonTexte}>Sauvegarder</Text>
            </TouchableOpacity>
          </View>
        )}
      />
    </KeyboardAvoidingView>
  )
}

function Champ({ label, value, onChange, entier, chStyles }: {
  label: string; value: string; onChange: (v: string) => void; entier?: boolean; chStyles: ReturnType<typeof makeChStyles>
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

function makeChStyles(c: Colors) {
  return StyleSheet.create({
    container: { flex: 1, minWidth: 72 },
    label: { fontSize: 10, color: c.textMuted, marginBottom: 2 },
    input: { borderWidth: 1, borderColor: c.borderInput, borderRadius: 6, padding: 6, fontSize: 14, textAlign: 'center', backgroundColor: c.bgInput, color: c.text },
  })
}

function makeStyles(c: Colors) {
  return StyleSheet.create({
    liste: { padding: 16, gap: 16 },
    titrePage: { fontSize: 20, fontWeight: 'bold', marginBottom: 16, color: c.text },
    toggleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderTopWidth: 1, borderBottomWidth: 1, borderColor: c.borderLight, marginBottom: 16 },
    toggleLabel: { fontSize: 15, color: c.text },
    sectionTitre: { fontSize: 16, fontWeight: '700', color: c.text, marginBottom: 8 },
    carte: { borderWidth: 1, borderColor: c.borderLight, borderRadius: 10, padding: 14, backgroundColor: c.bgCard, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, elevation: 2 },
    nomExercice: { fontSize: 16, fontWeight: 'bold', marginBottom: 10, color: c.text },
    section: { fontSize: 11, fontWeight: '600', color: c.textMuted, textTransform: 'uppercase', marginBottom: 6, marginTop: 4 },
    ligne: { flexDirection: 'row', gap: 8, marginBottom: 8 },
    bouton: { marginTop: 8, backgroundColor: c.btnPrimary, borderRadius: 8, padding: 10, alignItems: 'center' },
    boutonTexte: { color: c.btnPrimaryText, fontWeight: '600', fontSize: 14 },
    vide: { textAlign: 'center', color: c.textFaint, marginTop: 40 },
    footer: { alignItems: 'center', paddingVertical: 32, gap: 4 },
    footerTitre: { fontSize: 16, fontWeight: '700', color: c.textMuted },
    footerSous: { fontSize: 12, color: c.textFaint },
  })
}

import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { useSeanceStore } from '../store/seanceStore'

type Props = {
  serie: {
    id: number
    chargeKg: number
    reps: number
    nbSeries: number
    rpe?: number | null
    statut: string | null
  }
}

export function SerieRow({ serie }: Props) {
  const { validerSerie, invaliderSerie } = useSeanceStore()

  const couleurStatut = serie.statut === 'VALIDEE'
    ? '#22c55e'
    : serie.statut === 'INVALIDEE'
    ? '#ef4444'
    : '#94a3b8'

  return (
    <View style={styles.container}>
      <View style={[styles.indicateur, { backgroundColor: couleurStatut }]} />
      <View style={styles.info}>
        <Text style={styles.charge}>{serie.chargeKg} kg</Text>
        <Text style={styles.detail}>
          {serie.nbSeries}×{serie.reps}{serie.rpe ? `  RPE ${serie.rpe}` : ''}
        </Text>
      </View>
      <View style={styles.actions}>
        <TouchableOpacity
          style={[styles.btn, styles.btnValider]}
          onPress={() => validerSerie(serie.id)}
        >
          <Text style={styles.btnTexte}>✓</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.btn, styles.btnInvalider]}
          onPress={() => invaliderSerie(serie.id)}
        >
          <Text style={styles.btnTexte}>✗</Text>
        </TouchableOpacity>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flexDirection: 'row', alignItems: 'center', padding: 12, borderBottomWidth: 1, borderColor: '#eee' },
  indicateur: { width: 6, height: '80%', borderRadius: 3, marginRight: 12 },
  info: { flex: 1 },
  charge: { fontSize: 18, fontWeight: 'bold' },
  detail: { fontSize: 13, color: '#666', marginTop: 2 },
  actions: { flexDirection: 'row', gap: 8 },
  btn: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
  btnValider: { backgroundColor: '#22c55e' },
  btnInvalider: { backgroundColor: '#ef4444' },
  btnTexte: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
})

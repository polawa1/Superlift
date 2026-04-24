import { useEffect } from 'react'
import { View, FlatList, StyleSheet, Text, TouchableOpacity } from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useSeanceStore } from '../../store/seanceStore'
import { cloturerSeancePrecedente } from '../../services/clotureService'
import { SerieRow } from '../../components/SerieRow'

export default function SeanceScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const seanceId = Number(id)
  const router = useRouter()
  const { seriesEnCours, chargerSeries } = useSeanceStore()

  useEffect(() => {
    cloturerSeancePrecedente(seanceId)
    chargerSeries(seanceId)
  }, [seanceId])

  return (
    <View style={styles.container}>
      <FlatList
        data={seriesEnCours}
        keyExtractor={(item) => String(item.id)}
        ListEmptyComponent={<Text style={styles.vide}>Aucune série pour cette séance</Text>}
        renderItem={({ item }) => <SerieRow serie={item} />}
      />
      <TouchableOpacity style={styles.retour} onPress={() => router.back()}>
        <Text style={styles.retourTexte}>← Retour</Text>
      </TouchableOpacity>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  vide: { textAlign: 'center', marginTop: 40, color: '#aaa' },
  retour: { padding: 16 },
  retourTexte: { color: '#000', fontWeight: 'bold' },
})

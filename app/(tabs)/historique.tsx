import { View, Text, StyleSheet } from 'react-native'

export default function HistoriqueScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.titre}>Historique</Text>
      <Text style={styles.sousTitre}>Statistiques et courbes de progression — Phase 3</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' },
  titre: { fontSize: 22, fontWeight: 'bold' },
  sousTitre: { fontSize: 14, color: '#888', marginTop: 8, textAlign: 'center', paddingHorizontal: 32 },
})

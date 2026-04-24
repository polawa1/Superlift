import { View, Text, StyleSheet } from 'react-native'

export default function ParametresScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.titre}>Paramètres</Text>
      <Text style={styles.sousTitre}>Configuration des objectifs par exercice — Phase 3</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' },
  titre: { fontSize: 22, fontWeight: 'bold' },
  sousTitre: { fontSize: 14, color: '#888', marginTop: 8, textAlign: 'center', paddingHorizontal: 32 },
})

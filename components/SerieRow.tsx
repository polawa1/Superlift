import { useState } from 'react'
import { View, Text, TouchableOpacity, StyleSheet, TextInput, Modal } from 'react-native'
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
  index?: number
}

export function SerieRow({ serie, index }: Props) {
  const { validerSerie, invaliderSerie, modifierCharge } = useSeanceStore()
  const [modalVisible, setModalVisible] = useState(false)
  const [chargeTexte, setChargeTexte] = useState(String(serie.chargeKg))

  const couleurStatut =
    serie.statut === 'VALIDEE' ? '#22c55e' :
    serie.statut === 'INVALIDEE' ? '#ef4444' : '#94a3b8'

  async function confirmerCharge() {
    const val = parseFloat(chargeTexte)
    if (!isNaN(val) && val > 0) {
      await modifierCharge(serie.id, val)
    }
    setModalVisible(false)
  }

  return (
    <>
      <View style={styles.container}>
        <View style={[styles.indicateur, { backgroundColor: couleurStatut }]} />
        <TouchableOpacity style={styles.info} onPress={() => { setChargeTexte(String(serie.chargeKg)); setModalVisible(true) }}>
          {index !== undefined && (
            <Text style={styles.numero}>Série {index + 1}</Text>
          )}
          <Text style={styles.charge}>{serie.chargeKg} kg</Text>
          <Text style={styles.detail}>
            {serie.nbSeries > 1 ? `${serie.nbSeries}×` : ''}{serie.reps} reps{serie.rpe ? `  RPE ${serie.rpe}` : ''}
          </Text>
        </TouchableOpacity>
        <View style={styles.actions}>
          <TouchableOpacity style={[styles.btn, styles.btnValider]} onPress={() => validerSerie(serie.id)}>
            <Text style={styles.btnTexte}>✓</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.btn, styles.btnInvalider]} onPress={() => invaliderSerie(serie.id)}>
            <Text style={styles.btnTexte}>✗</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Modal modification charge */}
      <Modal visible={modalVisible} transparent animationType="fade" onRequestClose={() => setModalVisible(false)}>
        <View style={modal.overlay}>
          <View style={modal.box}>
            <Text style={modal.titre}>Modifier la charge</Text>
            <TextInput
              style={modal.input}
              value={chargeTexte}
              onChangeText={setChargeTexte}
              keyboardType="decimal-pad"
              selectTextOnFocus
              autoFocus
            />
            <Text style={modal.unite}>kg</Text>
            <View style={modal.actions}>
              <TouchableOpacity style={modal.btnAnnuler} onPress={() => setModalVisible(false)}>
                <Text style={modal.btnAnnulerTexte}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity style={modal.btnOk} onPress={confirmerCharge}>
                <Text style={modal.btnOkTexte}>OK</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
  )
}

const styles = StyleSheet.create({
  container: { flexDirection: 'row', alignItems: 'center', padding: 12, borderBottomWidth: 1, borderColor: '#eee' },
  indicateur: { width: 6, height: '80%', borderRadius: 3, marginRight: 12 },
  info: { flex: 1 },
  numero: { fontSize: 11, color: '#aaa', marginBottom: 2 },
  charge: { fontSize: 18, fontWeight: 'bold' },
  detail: { fontSize: 13, color: '#666', marginTop: 2 },
  actions: { flexDirection: 'row', gap: 8 },
  btn: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
  btnValider: { backgroundColor: '#22c55e' },
  btnInvalider: { backgroundColor: '#ef4444' },
  btnTexte: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
})

const modal = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center' },
  box: { backgroundColor: '#fff', borderRadius: 12, padding: 24, width: 220, alignItems: 'center' },
  titre: { fontSize: 15, fontWeight: 'bold', marginBottom: 12 },
  input: {
    borderWidth: 1, borderColor: '#ddd', borderRadius: 8,
    padding: 10, fontSize: 22, fontWeight: 'bold',
    textAlign: 'center', width: 120,
  },
  unite: { color: '#888', marginTop: 4, marginBottom: 16 },
  actions: { flexDirection: 'row', gap: 10 },
  btnAnnuler: { borderWidth: 1, borderColor: '#ddd', borderRadius: 8, paddingHorizontal: 16, paddingVertical: 10 },
  btnAnnulerTexte: { color: '#555' },
  btnOk: { backgroundColor: '#000', borderRadius: 8, paddingHorizontal: 16, paddingVertical: 10 },
  btnOkTexte: { color: '#fff', fontWeight: '600' },
})

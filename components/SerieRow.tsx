import { useState } from 'react'
import { View, Text, TouchableOpacity, StyleSheet, TextInput, Modal } from 'react-native'
import { useSeanceStore } from '../store/seanceStore'
import { useTheme } from '../context/ThemeContext'
import { Colors } from '../constants/colors'

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
  readOnly?: boolean
}

export function SerieRow({ serie, index, readOnly = false }: Props) {
  const { validerSerie, invaliderSerie, modifierCharge } = useSeanceStore()
  const [modalVisible, setModalVisible] = useState(false)
  const [chargeTexte, setChargeTexte] = useState(String(serie.chargeKg))
  const { colors } = useTheme()
  const s = makeStyles(colors)
  const m = makeModalStyles(colors)

  const couleurStatut =
    serie.statut === 'VALIDEE' ? '#22c55e' :
    serie.statut === 'INVALIDEE' ? '#ef4444' : '#94a3b8'

  async function confirmerCharge() {
    const val = parseFloat(chargeTexte)
    if (!isNaN(val) && val > 0) await modifierCharge(serie.id, val)
    setModalVisible(false)
  }

  return (
    <>
      <View style={s.container}>
        <View style={[s.indicateur, { backgroundColor: couleurStatut }]} />
        <TouchableOpacity style={s.info} onPress={() => { if (!readOnly) { setChargeTexte(String(serie.chargeKg)); setModalVisible(true) } }}>
          {index !== undefined && <Text style={s.numero}>Série {index + 1}</Text>}
          <Text style={s.charge}>{serie.chargeKg} kg</Text>
          <Text style={s.detail}>{serie.nbSeries > 1 ? `${serie.nbSeries}×` : ''}{serie.reps} reps{serie.rpe ? `  RPE ${serie.rpe}` : ''}</Text>
        </TouchableOpacity>
        {!readOnly && (
          <View style={s.actions}>
            <TouchableOpacity style={[s.btn, s.btnValider]} onPress={() => validerSerie(serie.id)}>
              <Text style={s.btnTexte}>✓</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[s.btn, s.btnInvalider]} onPress={() => invaliderSerie(serie.id)}>
              <Text style={s.btnTexte}>✗</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      <Modal visible={modalVisible} transparent animationType="fade" onRequestClose={() => setModalVisible(false)}>
        <View style={m.overlay}>
          <View style={m.box}>
            <Text style={m.titre}>Modifier la charge</Text>
            <TextInput
              style={m.input}
              value={chargeTexte}
              onChangeText={setChargeTexte}
              keyboardType="decimal-pad"
              selectTextOnFocus
              autoFocus
            />
            <Text style={m.unite}>kg</Text>
            <View style={m.actions}>
              <TouchableOpacity style={m.btnAnnuler} onPress={() => setModalVisible(false)}>
                <Text style={m.btnAnnulerTexte}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity style={m.btnOk} onPress={confirmerCharge}>
                <Text style={m.btnOkTexte}>OK</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
  )
}

function makeStyles(c: Colors) {
  return StyleSheet.create({
    container: { flexDirection: 'row', alignItems: 'center', padding: 12, borderBottomWidth: 1, borderColor: c.borderLight, backgroundColor: c.bg },
    indicateur: { width: 6, height: '80%', borderRadius: 3, marginRight: 12 },
    info: { flex: 1 },
    numero: { fontSize: 11, color: c.textFaint, marginBottom: 2 },
    charge: { fontSize: 18, fontWeight: 'bold', color: c.text },
    detail: { fontSize: 13, color: c.textMuted, marginTop: 2 },
    actions: { flexDirection: 'row', gap: 8 },
    btn: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
    btnValider: { backgroundColor: '#22c55e' },
    btnInvalider: { backgroundColor: '#ef4444' },
    btnTexte: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  })
}

function makeModalStyles(c: Colors) {
  return StyleSheet.create({
    overlay: { flex: 1, backgroundColor: c.overlay, justifyContent: 'center', alignItems: 'center' },
    box: { backgroundColor: c.bgCard, borderRadius: 12, padding: 24, width: 220, alignItems: 'center' },
    titre: { fontSize: 15, fontWeight: 'bold', marginBottom: 12, color: c.text },
    input: { borderWidth: 1, borderColor: c.borderInput, borderRadius: 8, padding: 10, fontSize: 22, fontWeight: 'bold', textAlign: 'center', width: 120, color: c.text, backgroundColor: c.bgInput },
    unite: { color: c.textMuted, marginTop: 4, marginBottom: 16 },
    actions: { flexDirection: 'row', gap: 10 },
    btnAnnuler: { borderWidth: 1, borderColor: c.borderInput, borderRadius: 8, paddingHorizontal: 16, paddingVertical: 10 },
    btnAnnulerTexte: { color: c.textSub },
    btnOk: { backgroundColor: c.btnPrimary, borderRadius: 8, paddingHorizontal: 16, paddingVertical: 10 },
    btnOkTexte: { color: c.btnPrimaryText, fontWeight: '600' },
  })
}

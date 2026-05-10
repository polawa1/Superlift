import { useEffect, useState } from 'react'
import {
  View, FlatList, StyleSheet, Text, TouchableOpacity,
  TextInput, Modal, KeyboardAvoidingView, Platform, Alert,
} from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useSeanceStore } from '../../store/seanceStore'
import { cloturerSeancePrecedente, cloturerSeance } from '../../services/clotureService'
import { SerieRow } from '../../components/SerieRow'
import { db } from '../../db'
import { seances } from '../../db/schema'
import { eq } from 'drizzle-orm'
import { useTheme } from '../../context/ThemeContext'
import { Colors } from '../../constants/colors'

export default function SeanceScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const seanceId = Number(id)
  const router = useRouter()
  const { seriesEnCours, notesEnCours, chargerSeries, chargerNotes, ajouterNote } = useSeanceStore()
  const [noteVisible, setNoteVisible] = useState(false)
  const [noteTexte, setNoteTexte] = useState('')
  const { colors } = useTheme()
  const s = makeStyles(colors)

  useEffect(() => {
    async function ouvrirSeance() {
      await db.update(seances).set({ statut: 'EN_COURS' }).where(eq(seances.id, seanceId))
      await cloturerSeancePrecedente(seanceId)
      chargerSeries(seanceId)
      chargerNotes(seanceId)
    }
    ouvrirSeance()
  }, [seanceId])

  async function terminerSeance() {
    Alert.alert('Clôturer la séance', 'Les séries non renseignées seront auto-validées.', [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Clôturer', style: 'destructive', onPress: async () => { await cloturerSeance(seanceId); router.back() } },
    ])
  }

  async function soumettreNote() {
    if (!noteTexte.trim()) return
    await ajouterNote(seanceId, noteTexte.trim())
    setNoteTexte('')
    setNoteVisible(false)
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.bg }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={s.container}>
        <FlatList
          data={seriesEnCours}
          keyExtractor={(item) => String(item.id)}
          ListEmptyComponent={<Text style={s.vide}>Aucune série pour cette séance</Text>}
          renderItem={({ item, index }) => <SerieRow serie={item} index={index} />}
          ListFooterComponent={
            notesEnCours.length > 0 ? (
              <View style={s.notesSection}>
                <Text style={s.notesTitre}>Notes</Text>
                {notesEnCours.map((note) => (
                  <View key={note.id} style={s.noteItem}>
                    <Text style={s.noteHeure}>{new Date(note.horodatage).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</Text>
                    <Text style={s.noteContenu}>{note.contenu}</Text>
                  </View>
                ))}
              </View>
            ) : null
          }
        />

        <View style={s.barreActions}>
          <TouchableOpacity style={s.btnRetour} onPress={() => router.back()}>
            <Text style={s.btnRetourTexte}>← Retour</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.btnNote} onPress={() => setNoteVisible(true)}>
            <Text style={s.btnNoteTexte}>+ Note</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.btnCloturer} onPress={terminerSeance}>
            <Text style={s.btnCloturerTexte}>Clôturer ✓</Text>
          </TouchableOpacity>
        </View>

        <Modal visible={noteVisible} transparent animationType="slide" onRequestClose={() => setNoteVisible(false)}>
          <View style={s.modalOverlay}>
            <View style={s.modalContent}>
              <Text style={s.modalTitre}>Ajouter une note</Text>
              <TextInput
                style={s.noteInput}
                placeholder="Ex : douleur épaule droite, charge facile..."
                placeholderTextColor={colors.textFaint}
                value={noteTexte}
                onChangeText={setNoteTexte}
                multiline
                autoFocus
              />
              <View style={s.modalActions}>
                <TouchableOpacity style={s.btnAnnuler} onPress={() => { setNoteTexte(''); setNoteVisible(false) }}>
                  <Text style={s.btnAnnulerTexte}>Annuler</Text>
                </TouchableOpacity>
                <TouchableOpacity style={s.btnSauvegarder} onPress={soumettreNote}>
                  <Text style={s.btnSauvegarderTexte}>Ajouter</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </View>
    </KeyboardAvoidingView>
  )
}

function makeStyles(c: Colors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: c.bg },
    vide: { textAlign: 'center', marginTop: 40, color: c.textFaint },
    barreActions: { flexDirection: 'row', justifyContent: 'space-between', padding: 12, borderTopWidth: 1, borderColor: c.borderLight, backgroundColor: c.bgCard },
    btnRetour: { padding: 10 },
    btnRetourTexte: { color: c.text, fontWeight: 'bold' },
    btnNote: { backgroundColor: c.bgInput, borderRadius: 8, paddingHorizontal: 14, paddingVertical: 10 },
    btnNoteTexte: { color: c.text, fontWeight: '600' },
    btnCloturer: { backgroundColor: '#22c55e', borderRadius: 8, paddingHorizontal: 14, paddingVertical: 10 },
    btnCloturerTexte: { color: '#fff', fontWeight: '700' },
    notesSection: { padding: 12, borderTopWidth: 1, borderColor: c.borderLight },
    notesTitre: { fontSize: 13, fontWeight: '600', color: c.textSub, marginBottom: 8 },
    noteItem: { flexDirection: 'row', gap: 8, marginBottom: 6 },
    noteHeure: { fontSize: 12, color: c.textFaint, width: 40 },
    noteContenu: { flex: 1, fontSize: 13, color: c.text },
    modalOverlay: { flex: 1, backgroundColor: c.overlay, justifyContent: 'flex-end' },
    modalContent: { backgroundColor: c.bgCard, borderTopLeftRadius: 16, borderTopRightRadius: 16, padding: 20 },
    modalTitre: { fontSize: 16, fontWeight: 'bold', marginBottom: 12, color: c.text },
    noteInput: { borderWidth: 1, borderColor: c.borderInput, borderRadius: 8, padding: 10, fontSize: 14, minHeight: 80, textAlignVertical: 'top', color: c.text, backgroundColor: c.bgInput },
    modalActions: { flexDirection: 'row', gap: 10, marginTop: 12 },
    btnAnnuler: { flex: 1, borderWidth: 1, borderColor: c.borderInput, borderRadius: 8, padding: 12, alignItems: 'center' },
    btnAnnulerTexte: { color: c.textSub },
    btnSauvegarder: { flex: 1, backgroundColor: c.btnPrimary, borderRadius: 8, padding: 12, alignItems: 'center' },
    btnSauvegarderTexte: { color: c.btnPrimaryText, fontWeight: '600' },
  })
}

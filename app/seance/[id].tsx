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

export default function SeanceScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const seanceId = Number(id)
  const router = useRouter()

  const { seriesEnCours, notesEnCours, chargerSeries, chargerNotes, ajouterNote } = useSeanceStore()

  const [noteVisible, setNoteVisible] = useState(false)
  const [noteTexte, setNoteTexte] = useState('')

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
      {
        text: 'Clôturer', style: 'destructive',
        onPress: async () => {
          await cloturerSeance(seanceId)
          router.back()
        },
      },
    ])
  }

  async function soumettreNote() {
    if (!noteTexte.trim()) return
    await ajouterNote(seanceId, noteTexte.trim())
    setNoteTexte('')
    setNoteVisible(false)
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.container}>
        <FlatList
          data={seriesEnCours}
          keyExtractor={(item) => String(item.id)}
          ListEmptyComponent={<Text style={styles.vide}>Aucune série pour cette séance</Text>}
          renderItem={({ item, index }) => <SerieRow serie={item} index={index} />}
          ListFooterComponent={
            notesEnCours.length > 0 ? (
              <View style={styles.notesSection}>
                <Text style={styles.notesTitre}>Notes</Text>
                {notesEnCours.map((note) => (
                  <View key={note.id} style={styles.noteItem}>
                    <Text style={styles.noteHeure}>
                      {new Date(note.horodatage).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                    </Text>
                    <Text style={styles.noteContenu}>{note.contenu}</Text>
                  </View>
                ))}
              </View>
            ) : null
          }
        />

        <View style={styles.barreActions}>
          <TouchableOpacity style={styles.btnRetour} onPress={() => router.back()}>
            <Text style={styles.btnRetourTexte}>← Retour</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.btnNote} onPress={() => setNoteVisible(true)}>
            <Text style={styles.btnNoteTexte}>+ Note</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.btnCloturer} onPress={terminerSeance}>
            <Text style={styles.btnCloturerTexte}>Clôturer ✓</Text>
          </TouchableOpacity>
        </View>

        {/* Modal saisie note */}
        <Modal visible={noteVisible} transparent animationType="slide" onRequestClose={() => setNoteVisible(false)}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitre}>Ajouter une note</Text>
              <TextInput
                style={styles.noteInput}
                placeholder="Ex : douleur épaule droite, charge facile..."
                value={noteTexte}
                onChangeText={setNoteTexte}
                multiline
                autoFocus
              />
              <View style={styles.modalActions}>
                <TouchableOpacity style={styles.btnAnnuler} onPress={() => { setNoteTexte(''); setNoteVisible(false) }}>
                  <Text style={styles.btnAnnulerTexte}>Annuler</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.btnSauvegarder} onPress={soumettreNote}>
                  <Text style={styles.btnSauvegarderTexte}>Ajouter</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </View>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  vide: { textAlign: 'center', marginTop: 40, color: '#aaa' },
  barreActions: {
    flexDirection: 'row', justifyContent: 'space-between',
    padding: 12, borderTopWidth: 1, borderColor: '#eee',
  },
  btnRetour: { padding: 10 },
  btnRetourTexte: { color: '#000', fontWeight: 'bold' },
  btnNote: {
    backgroundColor: '#333', borderRadius: 8,
    paddingHorizontal: 14, paddingVertical: 10,
  },
  btnNoteTexte: { color: '#fff', fontWeight: '600' },
  btnCloturer: {
    backgroundColor: '#22c55e', borderRadius: 8,
    paddingHorizontal: 14, paddingVertical: 10,
  },
  btnCloturerTexte: { color: '#fff', fontWeight: '700' },
  notesSection: { padding: 12, borderTopWidth: 1, borderColor: '#eee' },
  notesTitre: { fontSize: 13, fontWeight: '600', color: '#555', marginBottom: 8 },
  noteItem: { flexDirection: 'row', gap: 8, marginBottom: 6 },
  noteHeure: { fontSize: 12, color: '#aaa', width: 40 },
  noteContenu: { flex: 1, fontSize: 13, color: '#333' },
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff', borderTopLeftRadius: 16, borderTopRightRadius: 16,
    padding: 20,
  },
  modalTitre: { fontSize: 16, fontWeight: 'bold', marginBottom: 12 },
  noteInput: {
    borderWidth: 1, borderColor: '#ddd', borderRadius: 8,
    padding: 10, fontSize: 14, minHeight: 80,
    textAlignVertical: 'top',
  },
  modalActions: { flexDirection: 'row', gap: 10, marginTop: 12 },
  btnAnnuler: {
    flex: 1, borderWidth: 1, borderColor: '#ddd', borderRadius: 8,
    padding: 12, alignItems: 'center',
  },
  btnAnnulerTexte: { color: '#555' },
  btnSauvegarder: {
    flex: 1, backgroundColor: '#000', borderRadius: 8,
    padding: 12, alignItems: 'center',
  },
  btnSauvegarderTexte: { color: '#fff', fontWeight: '600' },
})

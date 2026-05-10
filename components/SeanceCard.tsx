import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { useRouter } from 'expo-router'
import { useTheme } from '../context/ThemeContext'
import { Colors } from '../constants/colors'

type Props = {
  seance: {
    id: number
    date: string
    typeSeance: string
    statut: string | null
    chargeKg: number
    reps: number
    nbSeries: number
  }
}

const TYPE_LABEL: Record<string, string> = {
  hypertrophie: 'Hypertrophie',
  force: 'Force',
  decharge: 'Décharge',
}

const TYPE_COLOR: Record<string, string> = {
  hypertrophie: '#6366f1',
  force: '#f59e0b',
  decharge: '#10b981',
}

export function SeanceCard({ seance }: Props) {
  const router = useRouter()
  const { colors } = useTheme()
  const s = makeStyles(colors)
  const statut = seance.statut ?? 'PLANIFIEE'
  const typeColor = TYPE_COLOR[seance.typeSeance] ?? '#94a3b8'

  const statutBg: Record<string, string> = {
    PLANIFIEE: colors.border,
    EN_COURS: '#bfdbfe',
    CLOTUREE: '#bbf7d0',
  }

  const dateFormatee = new Date(seance.date).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' })
  const statutLabel: Record<string, string> = { PLANIFIEE: 'Planifiée', EN_COURS: 'En cours', CLOTUREE: 'Clôturée' }

  return (
    <TouchableOpacity style={[s.card, { borderLeftColor: typeColor }]} onPress={() => router.push(`/seance/${seance.id}`)} activeOpacity={0.7}>
      <View style={s.header}>
        <Text style={[s.type, { color: typeColor }]}>{TYPE_LABEL[seance.typeSeance] ?? seance.typeSeance}</Text>
        <View style={[s.badge, { backgroundColor: statutBg[statut] ?? colors.border }]}>
          <Text style={s.badgeTexte}>{statutLabel[statut] ?? statut}</Text>
        </View>
      </View>
      <Text style={s.date}>{dateFormatee}</Text>
      <Text style={s.prescription}>{seance.nbSeries}×{seance.reps} reps — {seance.chargeKg} kg</Text>
    </TouchableOpacity>
  )
}

function makeStyles(c: Colors) {
  return StyleSheet.create({
    card: { backgroundColor: c.bgCard, borderRadius: 10, padding: 12, borderLeftWidth: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 2, flex: 1 },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
    type: { fontSize: 13, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
    badge: { borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
    badgeTexte: { fontSize: 11, color: '#475569', fontWeight: '500' },
    date: { fontSize: 13, color: c.textMuted, marginBottom: 4, textTransform: 'capitalize' },
    prescription: { fontSize: 15, fontWeight: '600', color: c.text },
  })
}

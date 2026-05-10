import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { useRouter } from 'expo-router'

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

const STATUT_CONFIG: Record<string, { bg: string; label: string }> = {
  PLANIFIEE:  { bg: '#e2e8f0', label: 'Planifiée' },
  EN_COURS:   { bg: '#bfdbfe', label: 'En cours' },
  CLOTUREE:   { bg: '#bbf7d0', label: 'Clôturée' },
}

export function SeanceCard({ seance }: Props) {
  const router = useRouter()
  const statut = seance.statut ?? 'PLANIFIEE'
  const statutCfg = STATUT_CONFIG[statut] ?? STATUT_CONFIG['PLANIFIEE']
  const typeColor = TYPE_COLOR[seance.typeSeance] ?? '#94a3b8'

  const dateFormatee = new Date(seance.date).toLocaleDateString('fr-FR', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  })

  return (
    <TouchableOpacity
      style={[styles.card, { borderLeftColor: typeColor }]}
      onPress={() => router.push(`/seance/${seance.id}`)}
      activeOpacity={0.7}
    >
      <View style={styles.header}>
        <Text style={[styles.type, { color: typeColor }]}>
          {TYPE_LABEL[seance.typeSeance] ?? seance.typeSeance}
        </Text>
        <View style={[styles.badge, { backgroundColor: statutCfg.bg }]}>
          <Text style={styles.badgeTexte}>{statutCfg.label}</Text>
        </View>
      </View>
      <Text style={styles.date}>{dateFormatee}</Text>
      <Text style={styles.prescription}>
        {seance.nbSeries}×{seance.reps} reps — {seance.chargeKg} kg
      </Text>
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 12,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  type: {
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  badge: {
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  badgeTexte: {
    fontSize: 11,
    color: '#475569',
    fontWeight: '500',
  },
  date: {
    fontSize: 13,
    color: '#64748b',
    marginBottom: 4,
    textTransform: 'capitalize',
  },
  prescription: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1e293b',
  },
})

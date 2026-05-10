import { View, Text, StyleSheet } from 'react-native'
import { Svg, Polyline, Line, Text as SvgText, Circle } from 'react-native-svg'
import { useTheme } from '../context/ThemeContext'

export type SerieBloc = { session: number; rm: number }

export type DonneeBloc = {
  blocId: number
  dateDebut: string
  points: SerieBloc[]
  couleur: string
}

type Props = {
  blocs: DonneeBloc[]
}

export const COULEURS = ['#4C9BE8', '#E85D4C', '#4CE87A', '#E8C94C', '#A44CE8']

const W = 320
const H = 180
const PAD = { top: 10, right: 16, bottom: 24, left: 40 }

export function CourbeComparaisonBlocs({ blocs }: Props) {
  const { colors } = useTheme()
  const blocsAvecDonnees = blocs.filter((b) => b.points.length >= 2)

  if (blocsAvecDonnees.length < 2) {
    return (
      <View style={styles.vide}>
        <Text style={[styles.videTexte, { color: colors.textFaint }]}>Au moins 2 blocs avec données sont nécessaires</Text>
      </View>
    )
  }

  const tousPoints = blocsAvecDonnees.flatMap((b) => b.points)
  const allX = tousPoints.map((p) => p.session)
  const allY = tousPoints.map((p) => p.rm)
  const minX = Math.min(...allX), maxX = Math.max(...allX)
  const minY = Math.min(...allY), maxY = Math.max(...allY)
  const chartW = W - PAD.left - PAD.right
  const chartH = H - PAD.top - PAD.bottom
  const toX = (x: number) => PAD.left + ((x - minX) / (maxX - minX || 1)) * chartW
  const toY = (y: number) => PAD.top + chartH - ((y - minY) / (maxY - minY || 1)) * chartH
  const yLabels = [minY, (minY + maxY) / 2, maxY].map((v) => Math.round(v))

  return (
    <View style={styles.container}>
      <Text style={[styles.titre, { color: colors.text }]}>Comparaison des blocs — 1RM estimé</Text>
      <Svg width={W} height={H}>
        {yLabels.map((v, i) => (
          <Line key={i} x1={PAD.left} y1={toY(v)} x2={W - PAD.right} y2={toY(v)} stroke={colors.chartGrid} strokeWidth={1} />
        ))}
        {yLabels.map((v, i) => (
          <SvgText key={i} x={PAD.left - 4} y={toY(v) + 4} fontSize={9} fill={colors.chartLabel} textAnchor="end">{v}</SvgText>
        ))}
        {blocsAvecDonnees.map((bloc) => (
          <Polyline
            key={bloc.blocId}
            points={bloc.points.map((p) => `${toX(p.session)},${toY(p.rm)}`).join(' ')}
            fill="none"
            stroke={bloc.couleur}
            strokeWidth={2}
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        ))}
        {blocsAvecDonnees.flatMap((bloc) =>
          bloc.points.map((p, i) => (
            <Circle key={`${bloc.blocId}-${i}`} cx={toX(p.session)} cy={toY(p.rm)} r={3} fill={bloc.couleur} />
          ))
        )}
      </Svg>

      <View style={styles.legende}>
        {blocsAvecDonnees.map((bloc) => (
          <View key={bloc.blocId} style={styles.legendeItem}>
            <View style={[styles.legendeCouleur, { backgroundColor: bloc.couleur }]} />
            <Text style={[styles.legendeTexte, { color: colors.textSub }]}>{bloc.dateDebut}</Text>
          </View>
        ))}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', marginVertical: 8 },
  titre: { fontSize: 13, fontWeight: '600', marginBottom: 4, alignSelf: 'flex-start', paddingHorizontal: 16 },
  vide: { height: 80, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 16 },
  videTexte: { fontSize: 13, textAlign: 'center' },
  legende: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 12, marginTop: 6 },
  legendeItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendeCouleur: { width: 12, height: 12, borderRadius: 6 },
  legendeTexte: { fontSize: 11 },
})

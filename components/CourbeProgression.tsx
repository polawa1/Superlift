import { View, Text, StyleSheet } from 'react-native'
import { Svg, Polyline, Line, Text as SvgText, Circle } from 'react-native-svg'

type Point = { jour: number; rm: number }

type Props = {
  donnees: Point[]
  nomExercice?: string
}

const W = 320
const H = 160
const PAD = { top: 10, right: 16, bottom: 24, left: 40 }

export function CourbeProgression({ donnees, nomExercice }: Props) {
  if (donnees.length < 2) {
    return (
      <View style={styles.vide}>
        <Text style={styles.videTexte}>Pas assez de données pour la courbe</Text>
      </View>
    )
  }

  const xs = donnees.map((p) => p.jour)
  const ys = donnees.map((p) => p.rm)
  const minX = Math.min(...xs)
  const maxX = Math.max(...xs)
  const minY = Math.min(...ys)
  const maxY = Math.max(...ys)

  const chartW = W - PAD.left - PAD.right
  const chartH = H - PAD.top - PAD.bottom

  const toX = (x: number) =>
    PAD.left + ((x - minX) / (maxX - minX || 1)) * chartW
  const toY = (y: number) =>
    PAD.top + chartH - ((y - minY) / (maxY - minY || 1)) * chartH

  const points = donnees.map((p) => `${toX(p.jour)},${toY(p.rm)}`).join(' ')

  const yLabels = [minY, (minY + maxY) / 2, maxY].map((v) => Math.round(v))

  return (
    <View style={styles.container}>
      {nomExercice && <Text style={styles.titre}>{nomExercice} — 1RM estimé</Text>}
      <Svg width={W} height={H}>
        {/* Axes Y */}
        {yLabels.map((v, i) => {
          const y = toY(v)
          return (
            <Line key={i} x1={PAD.left} y1={y} x2={W - PAD.right} y2={y} stroke="#eee" strokeWidth={1} />
          )
        })}
        {yLabels.map((v, i) => (
          <SvgText key={i} x={PAD.left - 4} y={toY(v) + 4} fontSize={9} fill="#aaa" textAnchor="end">
            {v}
          </SvgText>
        ))}

        {/* Courbe */}
        <Polyline points={points} fill="none" stroke="#000" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />

        {/* Points */}
        {donnees.map((p, i) => (
          <Circle key={i} cx={toX(p.jour)} cy={toY(p.rm)} r={3} fill="#000" />
        ))}
      </Svg>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', marginVertical: 8 },
  titre: { fontSize: 13, fontWeight: '600', color: '#333', marginBottom: 4, alignSelf: 'flex-start', paddingHorizontal: 16 },
  vide: { height: 80, justifyContent: 'center', alignItems: 'center' },
  videTexte: { color: '#aaa', fontSize: 13 },
})

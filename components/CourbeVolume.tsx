import React from 'react'
import { View, Text, StyleSheet, ScrollView } from 'react-native'
import { Svg, Rect, Text as SvgText, Line } from 'react-native-svg'

type Point = { semaine: string; volumeKg: number }

type Props = {
  donnees: Point[]
}

const BAR_W = 36
const BAR_GAP = 12
const H = 160
const PAD = { top: 10, right: 8, bottom: 32, left: 44 }
const CHART_H = H - PAD.top - PAD.bottom

export function CourbeVolume({ donnees }: Props) {
  if (donnees.length === 0) {
    return (
      <View style={styles.vide}>
        <Text style={styles.videTexte}>Pas encore de volume à afficher</Text>
      </View>
    )
  }

  const maxVol = Math.max(...donnees.map((d) => d.volumeKg), 1)
  const totalW = PAD.left + donnees.length * (BAR_W + BAR_GAP) + PAD.right

  const toH = (v: number) => (v / maxVol) * CHART_H

  const yLabels = [0, Math.round(maxVol / 2), Math.round(maxVol)]

  return (
    <View style={styles.container}>
      <Text style={styles.titre}>Volume hebdomadaire (kg)</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <Svg width={Math.max(totalW, 280)} height={H}>
          {/* Lignes horizontales */}
          {yLabels.map((v, i) => {
            const y = PAD.top + CHART_H - toH(v)
            return (
              <Line key={i} x1={PAD.left} y1={y} x2={totalW} y2={y} stroke="#eee" strokeWidth={1} />
            )
          })}

          {/* Labels Y */}
          {yLabels.map((v, i) => {
            const y = PAD.top + CHART_H - toH(v)
            return (
              <SvgText key={i} x={PAD.left - 4} y={y + 4} fontSize={9} fill="#aaa" textAnchor="end">
                {v}
              </SvgText>
            )
          })}

          {/* Barres */}
          {donnees.map((d, i) => {
            const x = PAD.left + i * (BAR_W + BAR_GAP)
            const barH = toH(d.volumeKg)
            const y = PAD.top + CHART_H - barH

            const semLabel = d.semaine.replace(/^\d{4}-/, '')

            return (
              <React.Fragment key={i}>
                <Rect x={x} y={y} width={BAR_W} height={barH} rx={4} fill="#1e293b" />
                <SvgText x={x + BAR_W / 2} y={H - 4} fontSize={9} fill="#aaa" textAnchor="middle">
                  {semLabel}
                </SvgText>
              </React.Fragment>
            )
          })}
        </Svg>
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { marginVertical: 8 },
  titre: { fontSize: 13, fontWeight: '600', color: '#333', marginBottom: 4, paddingHorizontal: 16 },
  vide: { height: 60, justifyContent: 'center', alignItems: 'center' },
  videTexte: { color: '#aaa', fontSize: 13 },
})

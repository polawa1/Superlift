type TypeSeance = 'hypertrophie' | 'force' | 'decharge'

interface ConfigSeance {
  type: TypeSeance
  pct: number
  series: number
  reps: number
  jourOffset: number
}

const PLAN_DUP: ConfigSeance[] = [
  { type: 'hypertrophie', pct: 0.70, series: 4, reps: 8, jourOffset: 0  },
  { type: 'force',        pct: 0.82, series: 5, reps: 4, jourOffset: 3  },
  { type: 'hypertrophie', pct: 0.72, series: 4, reps: 7, jourOffset: 7  },
  { type: 'force',        pct: 0.85, series: 4, reps: 3, jourOffset: 10 },
  { type: 'hypertrophie', pct: 0.75, series: 3, reps: 6, jourOffset: 14 },
  { type: 'force',        pct: 0.88, series: 3, reps: 2, jourOffset: 17 },
  { type: 'decharge',     pct: 0.60, series: 3, reps: 5, jourOffset: 21 },
  { type: 'decharge',     pct: 0.65, series: 3, reps: 4, jourOffset: 24 },
]

function arrondir(kg: number): number {
  return Math.round(kg / 2.5) * 2.5
}

export function genererSeancesBloc(
  blocId: number,
  exerciceId: number,
  unRmKg: number,
  dateDebut: Date
) {
  return PLAN_DUP.map((config) => {
    const date = new Date(dateDebut)
    date.setDate(date.getDate() + config.jourOffset)
    return {
      blocId,
      exerciceId,
      date: date.toISOString().split('T')[0],
      typeSeance: config.type,
      statut: 'PLANIFIEE' as const,
      chargeKg: arrondir(unRmKg * config.pct),
      nbSeries: config.series,
      reps: config.reps,
    }
  })
}

# Spec — Application de programmation de force (React Native / Expo)

## Vue d'ensemble

Application mobile cross-platform (Android + iOS) permettant de planifier et suivre une programmation de force sur trois exercices : développé couché, squat, traction.

---

## Exercices ciblés

- Développé couché
- Squat
- Traction

---

## Stack technique

| Couche | Technologie |
|---|---|
| Framework | React Native + Expo (SDK 51+) |
| Langage | TypeScript |
| Navigation | Expo Router (file-based) |
| Base de données | Expo SQLite + Drizzle ORM |
| État global | Zustand |
| Graphiques | Victory Native |
| Plateforme | Android + iOS |

### Initialisation du projet

```bash
npx create-expo-app@latest app-force --template blank-typescript
cd app-force
npx expo install expo-sqlite
npm install drizzle-orm drizzle-kit
npm install zustand
npm install victory-native react-native-svg
npm install react-native-reanimated
```

---

## Structure du projet

```
app-force/
├── app/                        # Expo Router — écrans
│   ├── (tabs)/
│   │   ├── index.tsx           # Accueil — liste des séances
│   │   ├── historique.tsx      # Historique + stats
│   │   └── parametres.tsx      # Config objectifs par exercice
│   ├── seance/[id].tsx         # Détail d'une séance
│   └── bloc/nouveau.tsx        # Démarrage d'un bloc DUP
├── db/
│   ├── schema.ts               # Schéma Drizzle
│   ├── migrations/             # Migrations générées
│   └── index.ts                # Instance SQLite
├── store/
│   ├── seanceStore.ts          # Zustand — état séance en cours
│   └── blocStore.ts            # Zustand — état bloc actif
├── services/
│   ├── dupService.ts           # Génération des séances DUP
│   ├── progressionService.ts   # Calcul de progression
│   └── clotureService.ts       # Clôture automatique
└── components/
    ├── SerieRow.tsx             # Ligne de série (valider/invalider)
    ├── SeanceCard.tsx           # Carte séance dans la liste
    └── CourbeProgression.tsx    # Graphique Victory Native
```

---

## Modèle de données — Drizzle ORM

### Schéma (db/schema.ts)

```typescript
import { sqliteTable, integer, real, text } from 'drizzle-orm/sqlite-core'

export const exercices = sqliteTable('exercices', {
  id:         integer('id').primaryKey({ autoIncrement: true }),
  nom:        text('nom').notNull(),
  unRmEstime: real('un_rm_estime'),
})

export const blocsForce = sqliteTable('blocs_force', {
  id:                integer('id').primaryKey({ autoIncrement: true }),
  dateDebut:         text('date_debut').notNull(),
  exerciceId:        integer('exercice_id').notNull().references(() => exercices.id),
  unRmKg:            real('un_rm_kg').notNull(),
  protocole:         text('protocole').default('DUP'),
  nbSemaines:        integer('nb_semaines').default(4),
  seancesParSemaine: integer('seances_par_semaine').default(2),
})

export const seances = sqliteTable('seances', {
  id:            integer('id').primaryKey({ autoIncrement: true }),
  date:          text('date').notNull(),
  exerciceId:    integer('exercice_id').notNull().references(() => exercices.id),
  blocId:        integer('bloc_id').notNull().references(() => blocsForce.id),
  typeSeance:    text('type_seance').notNull(), // 'force' | 'hypertrophie' | 'decharge'
  statut:        text('statut').default('PLANIFIEE'),
  clotureeAt:    integer('cloturee_at'),
  fatiguePercue: integer('fatigue_percue'),
})

export const series = sqliteTable('series', {
  id:                 integer('id').primaryKey({ autoIncrement: true }),
  seanceId:           integer('seance_id').notNull().references(() => seances.id),
  exerciceId:         integer('exercice_id').notNull().references(() => exercices.id),
  chargeKg:           real('charge_kg').notNull(),
  reps:               integer('reps').notNull(),
  nbSeries:           integer('nb_series').notNull(),
  rpe:                real('rpe'),
  statut:             text('statut').default('PLANIFIEE'), // 'PLANIFIEE' | 'VALIDEE' | 'INVALIDEE'
  autoValidee:        integer('auto_validee', { mode: 'boolean' }).default(false),
  raisonModification: text('raison_modification'),
})

export const objectifsExercice = sqliteTable('objectifs_exercice', {
  id:               integer('id').primaryKey({ autoIncrement: true }),
  exerciceId:       integer('exercice_id').notNull().references(() => exercices.id),
  chargeKg:         real('charge_kg').notNull(),
  nbSeries:         integer('nb_series').notNull(),
  reps:             integer('reps').notNull(),
  rpeCible:         real('rpe_cible'),
  incrementKg:      real('increment_kg').default(2.5),
  seuilProgression: real('seuil_progression').default(1.0),
  seuilMaintien:    real('seuil_maintien').default(0.75),
  reductionEchec:   real('reduction_echec').default(0.05),
})

export const notesSeance = sqliteTable('notes_seance', {
  id:         integer('id').primaryKey({ autoIncrement: true }),
  seanceId:   integer('seance_id').notNull().references(() => seances.id),
  contenu:    text('contenu').notNull(),
  horodatage: integer('horodatage').notNull(),
})
```

---

## Protocole de programmation — DUP (Ondulation Quotidienne)

### Paramètres
- Durée : 4 semaines
- Fréquence : 2 séances / semaine / exercice
- Base de calcul : 1RM saisi par l'utilisateur au démarrage du bloc

### Structure du bloc

| Semaine | Phase | Séance A | Séance B |
|---|---|---|---|
| 1 | Accumulation | 70% × 4×8 (Hypertrophie) | 82% × 5×4 (Force) |
| 2 | Intensification | 72% × 4×7 (Hypertrophie) | 85% × 4×3 (Force) |
| 3 | Pic | 75% × 3×6 (Hypertrophie) | 88% × 3×2 (Force) |
| 4 | Décharge | 60% × 3×5 (Décharge) | 65% × 3×4 (Décharge) |

### Générateur de séances (services/dupService.ts)

```typescript
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
```

---

## Règles métier

### Validation des séries

Chaque série est indépendante :
- **VALIDEE** — réussie, saisie manuellement
- **INVALIDEE** — échouée, saisie manuellement
- **PLANIFIEE** — non renseignée → auto-validée à la clôture

L'échec d'une série n'affecte pas les autres séries de la séance.

### Clôture automatique (services/clotureService.ts)

**Déclencheur** : ouverture de la séance suivante du même exercice.

```typescript
import { db } from '../db'
import { series, seances } from '../db/schema'
import { eq, and, lt } from 'drizzle-orm'
import { calculerProgression } from './progressionService'

export async function cloturerSeancePrecedente(seanceIdCourante: number) {
  const [seanceCourante] = await db
    .select()
    .from(seances)
    .where(eq(seances.id, seanceIdCourante))

  const [precedente] = await db
    .select()
    .from(seances)
    .where(
      and(
        eq(seances.exerciceId, seanceCourante.exerciceId),
        lt(seances.id, seanceIdCourante),
        eq(seances.statut, 'EN_COURS')
      )
    )
    .orderBy(seances.id)
    .limit(1)

  if (!precedente || precedente.statut === 'CLOTUREE') return

  // Auto-validation des séries non renseignées
  await db
    .update(series)
    .set({ statut: 'VALIDEE', autoValidee: true })
    .where(and(eq(series.seanceId, precedente.id), eq(series.statut, 'PLANIFIEE')))

  // Clôture
  await db
    .update(seances)
    .set({ statut: 'CLOTUREE', clotureeAt: Date.now() })
    .where(eq(seances.id, precedente.id))

  await calculerProgression(precedente.id, precedente.exerciceId)
}
```

### Calcul de progression (services/progressionService.ts)

```typescript
import { db } from '../db'
import { series, objectifsExercice } from '../db/schema'
import { eq } from 'drizzle-orm'

function arrondir(kg: number): number {
  return Math.round(kg / 2.5) * 2.5
}

export async function calculerProgression(seanceId: number, exerciceId: number) {
  const toutesLesSeries = await db
    .select()
    .from(series)
    .where(eq(series.seanceId, seanceId))

  const [objectif] = await db
    .select()
    .from(objectifsExercice)
    .where(eq(objectifsExercice.exerciceId, exerciceId))

  if (!objectif) return

  const total = toutesLesSeries.length
  const valideesManuelles = toutesLesSeries.filter(
    (s) => s.statut === 'VALIDEE' && !s.autoValidee
  ).length

  const taux = total > 0 ? valideesManuelles / total : 1
  const chargeActuelle = toutesLesSeries[0]?.chargeKg ?? objectif.chargeKg

  let nouvelleCharge: number
  if (taux >= objectif.seuilProgression) {
    nouvelleCharge = chargeActuelle + objectif.incrementKg
  } else if (taux >= objectif.seuilMaintien) {
    nouvelleCharge = chargeActuelle
  } else {
    nouvelleCharge = chargeActuelle * (1 - objectif.reductionEchec)
  }

  await db
    .update(objectifsExercice)
    .set({ chargeKg: arrondir(nouvelleCharge) })
    .where(eq(objectifsExercice.exerciceId, exerciceId))
}
```

---

## État global — Zustand (store/seanceStore.ts)

```typescript
import { create } from 'zustand'

type StatutSerie = 'PLANIFIEE' | 'VALIDEE' | 'INVALIDEE'

interface SerieState {
  id: number
  chargeKg: number
  reps: number
  nbSeries: number
  rpe?: number
  statut: StatutSerie
  autoValidee: boolean
}

interface SeanceStore {
  seriesEnCours: SerieState[]
  chargerSeries: (seanceId: number) => Promise<void>
  validerSerie: (serieId: number) => Promise<void>
  invaliderSerie: (serieId: number) => Promise<void>
}

export const useSeanceStore = create<SeanceStore>((set) => ({
  seriesEnCours: [],

  chargerSeries: async (seanceId) => {
    const { db } = await import('../db')
    const { series } = await import('../db/schema')
    const { eq } = await import('drizzle-orm')
    const data = await db.select().from(series).where(eq(series.seanceId, seanceId))
    set({ seriesEnCours: data })
  },

  validerSerie: async (serieId) => {
    const { db } = await import('../db')
    const { series } = await import('../db/schema')
    const { eq } = await import('drizzle-orm')
    await db.update(series).set({ statut: 'VALIDEE' }).where(eq(series.id, serieId))
    set((state) => ({
      seriesEnCours: state.seriesEnCours.map((s) =>
        s.id === serieId ? { ...s, statut: 'VALIDEE' } : s
      ),
    }))
  },

  invaliderSerie: async (serieId) => {
    const { db } = await import('../db')
    const { series } = await import('../db/schema')
    const { eq } = await import('drizzle-orm')
    await db.update(series).set({ statut: 'INVALIDEE' }).where(eq(series.id, serieId))
    set((state) => ({
      seriesEnCours: state.seriesEnCours.map((s) =>
        s.id === serieId ? { ...s, statut: 'INVALIDEE' } : s
      ),
    }))
  },
}))
```

---

## Tableau de décision — progression

| Statut séries à clôture | Interprétation | Effet |
|---|---|---|
| Toutes VALIDEE manuelles | Séance réussie | charge + incrementKg |
| Mix VALIDEE + PLANIFIEE | Auto-clôture | PLANIFIEE → VALIDEE, calcul normal |
| Mix VALIDEE + INVALIDEE | Échec partiel | Calcul selon taux réel |
| Toutes INVALIDEE | Séance ratée | charge × (1 - reductionEchec) |

---

## Statistiques — Calculs clés

### 1RM estimé (formule Epley)

```typescript
export function estimer1RM(chargeKg: number, reps: number): number {
  return chargeKg * (1 + reps / 30)
}
```

### Volume réel d'une séance

```typescript
const volumeKg = series
  .filter((s) => s.statut === 'VALIDEE')
  .reduce((sum, s) => sum + s.chargeKg * s.reps, 0)
```

---

## Phases de développement

### Phase 1 — MVP
- Initialisation projet Expo + Drizzle + Zustand
- Schéma SQLite + migrations
- Écran accueil : liste des séances datées
- Écran séance : saisie des séries (charge, reps, nb séries, RPE)
- Validation / invalidation unitaire par série
- Clôture automatique au démarrage de la séance suivante

### Phase 2 — Bloc DUP
- Écran de démarrage d'un bloc (saisie du 1RM)
- Génération automatique des 8 séances via dupService
- Vue calendrier du bloc sur 4 semaines
- Progression automatique entre séances

### Phase 3 — Progression libre & statistiques
- Écran de configuration des objectifs par exercice
- Seuils de progression configurables (progression / maintien / réduction)
- Courbe du 1RM estimé (Victory Native)
- Volume hebdomadaire par exercice
- Historique des séances avec records personnels
- Ajustements à la volée (modifier charge, sauter un exercice, notes)

---

*Spec générée le 24 avril 2026 — stack React Native Expo / TypeScript*
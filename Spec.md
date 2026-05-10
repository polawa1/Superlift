# Spec — Application de programmation de force (React Native / Expo)

## Vue d'ensemble

Application mobile cross-platform (Android + iOS) permettant de planifier et suivre une programmation de force sur quatre exercices : développé couché, squat, traction, soulevé de terre.

---

## Exercices ciblés

- Développé couché
- Squat
- Traction
- Soulevé de terre

Les exercices sont gérés dynamiquement en base de données via `db/seed.ts` (logique additive — nouveaux exercices ajoutés sans écraser l'existant).

---

## Stack technique

| Couche | Technologie |
|---|---|
| Framework | React Native + Expo (SDK 54) |
| Langage | TypeScript |
| Navigation | Expo Router (file-based) |
| Base de données | Expo SQLite + Drizzle ORM |
| État global | Zustand |
| Graphiques | react-native-svg (SVG natif) |
| Icônes | @expo/vector-icons (Ionicons) |
| Plateforme | Android + iOS |

> `react-native-reanimated` et `victory-native` ne sont pas utilisés. Les graphiques sont implémentés directement avec `react-native-svg`.

### Dépendances clés

```json
{
  "expo": "~54.0.33",
  "react": "19.1.0",
  "react-native": "0.81.5",
  "expo-router": "~6.0.23",
  "expo-sqlite": "~16.0.10",
  "drizzle-orm": "^0.45.2",
  "zustand": "^5.0.12",
  "react-native-svg": "^15.15.4"
}
```

> `react` est épinglé à `19.1.0` (sans `^`) pour correspondre exactement au renderer embarqué dans react-native 0.81.5 et maintenir la compatibilité Expo Go.

---

## Structure du projet

```
app-force/
├── app/                        # Expo Router — écrans
│   ├── (tabs)/
│   │   ├── _layout.tsx         # Tabs avec icônes Ionicons
│   │   ├── index.tsx           # Accueil — liste des blocs avec progression
│   │   ├── historique.tsx      # Historique + stats + graphiques
│   │   └── parametres.tsx      # Config objectifs par exercice
│   ├── seance/[id].tsx         # Séance active (séries, notes, clôture)
│   └── bloc/
│       ├── nouveau.tsx         # Démarrage d'un bloc DUP
│       └── [id].tsx            # Calendrier du bloc (4 semaines)
├── db/
│   ├── schema.ts               # Schéma Drizzle
│   ├── seed.ts                 # Seed additif des exercices
│   ├── migrations/             # Migrations générées
│   └── index.ts                # Instance SQLite
├── store/
│   └── seanceStore.ts          # Zustand — séries, notes, actions
├── services/
│   ├── dupService.ts           # Génération des séances DUP
│   ├── progressionService.ts   # Calcul de progression + 1RM Epley
│   └── clotureService.ts       # Clôture auto et manuelle
└── components/
    ├── SerieRow.tsx             # Ligne de série avec numéro, validation, modification charge
    ├── SeanceCard.tsx           # Carte séance dans le calendrier
    ├── CourbeProgression.tsx    # Graphique SVG — 1RM estimé dans le temps
    └── CourbeVolume.tsx         # Graphique SVG barres — volume hebdomadaire
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
  statut:        text('statut').default('PLANIFIEE'), // 'PLANIFIEE' | 'EN_COURS' | 'CLOTUREE'
  clotureeAt:    integer('cloturee_at'),
  fatiguePercue: integer('fatigue_percue'),
})

export const series = sqliteTable('series', {
  id:                 integer('id').primaryKey({ autoIncrement: true }),
  seanceId:           integer('seance_id').notNull().references(() => seances.id),
  exerciceId:         integer('exercice_id').notNull().references(() => exercices.id),
  chargeKg:           real('charge_kg').notNull(),
  reps:               integer('reps').notNull(),
  nbSeries:           integer('nb_series').notNull(), // toujours 1 (une ligne = une série)
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

### Génération des séries

Chaque séance génère **une ligne par série individuelle** (`nbSeries: 1`). Une séance avec 4×8 insère donc 4 lignes en DB, chacune validable/invalidable indépendamment.

---

## Règles métier

### Cycle de vie d'une séance

```
PLANIFIEE → EN_COURS → CLOTUREE
```

- **PLANIFIEE** : état initial à la création du bloc
- **EN_COURS** : passée à l'ouverture de la séance (`seance/[id].tsx`)
- **CLOTUREE** : via clôture automatique (ouverture séance suivante) ou manuelle (bouton "Clôturer ✓")

### Validation des séries

Chaque série est indépendante :
- **VALIDEE** — réussie, saisie manuellement
- **INVALIDEE** — échouée, saisie manuellement
- **PLANIFIEE** — non renseignée → auto-validée à la clôture

La charge d'une série peut être modifiée à la volée (tap sur la valeur → modal). La modification est tracée via `raisonModification: 'ajustement_manuel'`.

### Clôture (services/clotureService.ts)

Deux déclencheurs :

1. **Automatique** — à l'ouverture de la séance suivante du même exercice (`cloturerSeancePrecedente`)
2. **Manuelle** — bouton "Clôturer ✓" dans l'écran séance (`cloturerSeance`)

Dans les deux cas :
- Les séries encore en `PLANIFIEE` sont auto-validées
- La séance passe en `CLOTUREE` avec horodatage
- Le calcul de progression est déclenché

### Suppression d'un bloc

Suppression en cascade depuis le calendrier du bloc (icône `trash-outline`) :
`notes_seance` → `series` → `seances` → `blocs_force`

---

### Calcul de progression (services/progressionService.ts)

```typescript
const taux = valideesManuelles / total

if (taux >= seuilProgression)  → charge + incrementKg
if (taux >= seuilMaintien)     → charge inchangée
else                           → charge × (1 - reductionEchec)
```

---

## État global — Zustand (store/seanceStore.ts)

| Action | Description |
|---|---|
| `chargerSeries(seanceId)` | Charge les séries depuis la DB |
| `chargerNotes(seanceId)` | Charge les notes depuis la DB |
| `validerSerie(serieId)` | Passe une série en VALIDEE |
| `invaliderSerie(serieId)` | Passe une série en INVALIDEE |
| `modifierCharge(serieId, kg)` | Modifie la charge et trace la raison |
| `ajouterNote(seanceId, contenu)` | Insère une note horodatée |

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

### Historique (app/(tabs)/historique.tsx)

- Onglets par exercice
- Courbe du 1RM estimé dans le temps (`CourbeProgression` — SVG)
- Record personnel (1RM Epley max toutes séances confondues)
- Graphique en barres du volume hebdomadaire (`CourbeVolume` — SVG, scrollable)
- Liste des séances ayant au moins une série VALIDEE
- Rafraîchissement automatique à la navigation (`useFocusEffect`)

---

## Phases de développement

### Phase 1 — MVP ✅
- Initialisation projet Expo + Drizzle + Zustand
- Schéma SQLite + migrations
- Écran accueil : liste des blocs avec barre de progression
- Écran séance : saisie des séries (charge, reps, RPE)
- Validation / invalidation unitaire par série
- Clôture automatique au démarrage de la séance suivante

### Phase 2 — Bloc DUP ✅
- Écran de démarrage d'un bloc (saisie du 1RM, choix exercice dynamique)
- Génération automatique des 8 séances via dupService
- Vue calendrier du bloc sur 4 semaines avec phases
- Suppression de bloc avec cascade
- Progression automatique entre séances

### Phase 3 — Progression libre & statistiques ✅
- Écran paramètres : configuration des objectifs par exercice (auto-créés au premier lancement)
- Seuils de progression configurables (progression / maintien / réduction)
- Courbe du 1RM estimé — SVG natif
- Graphique volume hebdomadaire — SVG barres scrollable
- Historique des séances avec records personnels
- Modification de charge à la volée (modal inline)
- Ajout de notes horodatées par séance
- Clôture manuelle de séance (bouton "Clôturer ✓")
- Validation unitaire par série (une ligne DB = une série)
- Icônes onglets Ionicons (barbell / bar-chart / settings)
- Rafraîchissement auto des écrans au focus (historique, calendrier, accueil)

---

*Spec mise à jour le 10 mai 2026 — stack React Native Expo SDK 54 / TypeScript*

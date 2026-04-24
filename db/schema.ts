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
  typeSeance:    text('type_seance').notNull(),
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
  statut:             text('statut').default('PLANIFIEE'),
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

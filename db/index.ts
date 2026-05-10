import * as SQLite from 'expo-sqlite'
import { drizzle } from 'drizzle-orm/expo-sqlite'
import * as schema from './schema'

const sqlite = SQLite.openDatabaseSync('app-force.db')
export const db = drizzle(sqlite, { schema })

sqlite.execSync(`
  CREATE TABLE IF NOT EXISTS exercices (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nom TEXT NOT NULL,
    un_rm_estime REAL
  );

  CREATE TABLE IF NOT EXISTS blocs_force (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date_debut TEXT NOT NULL,
    exercice_id INTEGER NOT NULL REFERENCES exercices(id),
    un_rm_kg REAL NOT NULL,
    protocole TEXT DEFAULT 'DUP',
    nb_semaines INTEGER DEFAULT 4,
    seances_par_semaine INTEGER DEFAULT 2
  );

  CREATE TABLE IF NOT EXISTS seances (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT NOT NULL,
    exercice_id INTEGER NOT NULL REFERENCES exercices(id),
    bloc_id INTEGER NOT NULL REFERENCES blocs_force(id),
    type_seance TEXT NOT NULL,
    statut TEXT DEFAULT 'PLANIFIEE',
    cloturee_at INTEGER,
    fatigue_percue INTEGER
  );

  CREATE TABLE IF NOT EXISTS series (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    seance_id INTEGER NOT NULL REFERENCES seances(id),
    exercice_id INTEGER NOT NULL REFERENCES exercices(id),
    charge_kg REAL NOT NULL,
    reps INTEGER NOT NULL,
    nb_series INTEGER NOT NULL,
    rpe REAL,
    statut TEXT DEFAULT 'PLANIFIEE',
    auto_validee INTEGER DEFAULT 0,
    raison_modification TEXT
  );

  CREATE TABLE IF NOT EXISTS objectifs_exercice (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    exercice_id INTEGER NOT NULL REFERENCES exercices(id),
    charge_kg REAL NOT NULL,
    nb_series INTEGER NOT NULL,
    reps INTEGER NOT NULL,
    rpe_cible REAL,
    increment_kg REAL DEFAULT 2.5,
    seuil_progression REAL DEFAULT 1.0,
    seuil_maintien REAL DEFAULT 0.75,
    reduction_echec REAL DEFAULT 0.05
  );

  CREATE TABLE IF NOT EXISTS notes_seance (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    seance_id INTEGER NOT NULL REFERENCES seances(id),
    contenu TEXT NOT NULL,
    horodatage INTEGER NOT NULL
  );
`)

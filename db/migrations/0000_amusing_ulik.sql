CREATE TABLE `blocs_force` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`date_debut` text NOT NULL,
	`exercice_id` integer NOT NULL,
	`un_rm_kg` real NOT NULL,
	`protocole` text DEFAULT 'DUP',
	`nb_semaines` integer DEFAULT 4,
	`seances_par_semaine` integer DEFAULT 2,
	FOREIGN KEY (`exercice_id`) REFERENCES `exercices`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `exercices` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`nom` text NOT NULL,
	`un_rm_estime` real
);
--> statement-breakpoint
CREATE TABLE `notes_seance` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`seance_id` integer NOT NULL,
	`contenu` text NOT NULL,
	`horodatage` integer NOT NULL,
	FOREIGN KEY (`seance_id`) REFERENCES `seances`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `objectifs_exercice` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`exercice_id` integer NOT NULL,
	`charge_kg` real NOT NULL,
	`nb_series` integer NOT NULL,
	`reps` integer NOT NULL,
	`rpe_cible` real,
	`increment_kg` real DEFAULT 2.5,
	`seuil_progression` real DEFAULT 1,
	`seuil_maintien` real DEFAULT 0.75,
	`reduction_echec` real DEFAULT 0.05,
	FOREIGN KEY (`exercice_id`) REFERENCES `exercices`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `seances` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`date` text NOT NULL,
	`exercice_id` integer NOT NULL,
	`bloc_id` integer NOT NULL,
	`type_seance` text NOT NULL,
	`statut` text DEFAULT 'PLANIFIEE',
	`cloturee_at` integer,
	`fatigue_percue` integer,
	FOREIGN KEY (`exercice_id`) REFERENCES `exercices`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`bloc_id`) REFERENCES `blocs_force`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `series` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`seance_id` integer NOT NULL,
	`exercice_id` integer NOT NULL,
	`charge_kg` real NOT NULL,
	`reps` integer NOT NULL,
	`nb_series` integer NOT NULL,
	`rpe` real,
	`statut` text DEFAULT 'PLANIFIEE',
	`auto_validee` integer DEFAULT false,
	`raison_modification` text,
	FOREIGN KEY (`seance_id`) REFERENCES `seances`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`exercice_id`) REFERENCES `exercices`(`id`) ON UPDATE no action ON DELETE no action
);

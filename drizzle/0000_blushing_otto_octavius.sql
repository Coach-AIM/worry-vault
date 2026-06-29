CREATE TABLE `journal_entries` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`entry_type` text DEFAULT 'negative' NOT NULL,
	`situation` text NOT NULL,
	`emotions_json` text NOT NULL,
	`automatic_thought` text,
	`distortions_json` text,
	`reframed_thought` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `positive_thoughts` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`thought_text` text NOT NULL,
	`category` text DEFAULT 'General' NOT NULL
);
--> statement-breakpoint
CREATE TABLE `tasks` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`title` text NOT NULL,
	`description` text,
	`estimated_time` text,
	`emotional_intensity` text,
	`due_date` text,
	`completed` integer DEFAULT 0 NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`parent_id` integer,
	`recurrence` text DEFAULT 'none' NOT NULL
);
--> statement-breakpoint
CREATE TABLE `therapist_contact` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`phone` text,
	`email` text,
	`notes` text
);

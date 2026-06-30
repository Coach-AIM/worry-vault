CREATE TABLE `decision_follow_ups` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`decision_id` integer NOT NULL,
	`chosen_option_id` integer NOT NULL,
	`actual_feeling` text NOT NULL,
	`followed_up_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE `decision_options` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`decision_id` integer NOT NULL,
	`label` text NOT NULL,
	`predicted_feeling` text NOT NULL,
	`aligns_values` text NOT NULL,
	`external_pressure` integer DEFAULT 0 NOT NULL,
	`making_assumptions` integer DEFAULT 0 NOT NULL,
	`net_score` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE `decisions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` text NOT NULL,
	`title` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`timeframe_days` integer NOT NULL,
	`completed` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`username` text NOT NULL,
	`password_hash` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_username_unique` ON `users` (`username`);--> statement-breakpoint
ALTER TABLE `journal_entries` ADD `user_id` text DEFAULT 'user_coach_1' NOT NULL;
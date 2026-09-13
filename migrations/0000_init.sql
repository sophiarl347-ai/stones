CREATE TABLE `answers` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`card_id` integer NOT NULL,
	`choice` text NOT NULL,
	`line` text NOT NULL,
	`stone_file` text NOT NULL,
	`created_at` text NOT NULL
);

--> statement-breakpoint
CREATE TABLE `cards` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`kind` text NOT NULL,
	`source` text NOT NULL,
	`title` text NOT NULL,
	`detail` text DEFAULT '' NOT NULL,
	`meta` text DEFAULT '' NOT NULL,
	`question` text NOT NULL,
	`choice_a` text NOT NULL,
	`choice_b` text NOT NULL,
	`line_a` text NOT NULL,
	`line_b` text NOT NULL,
	`stone_file` text NOT NULL,
	`ord` integer DEFAULT 0 NOT NULL
);

--> statement-breakpoint
CREATE TABLE `stones` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`file` text NOT NULL,
	`label` text NOT NULL,
	`mark` text NOT NULL,
	`capacity_hrs` integer NOT NULL,
	`entries` integer DEFAULT 0 NOT NULL,
	`bytes` integer DEFAULT 0 NOT NULL,
	`last_write` text NOT NULL,
	`latest_line` text DEFAULT '' NOT NULL,
	`latest_src` text DEFAULT '' NOT NULL,
	`holds` text DEFAULT '' NOT NULL,
	`ord` integer DEFAULT 0 NOT NULL
);


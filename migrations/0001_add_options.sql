PRAGMA foreign_keys=OFF;
--> statement-breakpoint
CREATE TABLE `__new_cards` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`kind` text NOT NULL,
	`source` text NOT NULL,
	`title` text NOT NULL,
	`detail` text DEFAULT '' NOT NULL,
	`meta` text DEFAULT '' NOT NULL,
	`question` text NOT NULL,
	`options` text DEFAULT '[]' NOT NULL,
	`choice_a` text DEFAULT '' NOT NULL,
	`choice_b` text DEFAULT '' NOT NULL,
	`line_a` text DEFAULT '' NOT NULL,
	`line_b` text DEFAULT '' NOT NULL,
	`stone_file` text NOT NULL,
	`ord` integer DEFAULT 0 NOT NULL
);

--> statement-breakpoint
INSERT INTO `__new_cards`("id", "kind", "source", "title", "detail", "meta", "question", "options", "choice_a", "choice_b", "line_a", "line_b", "stone_file", "ord") SELECT "id", "kind", "source", "title", "detail", "meta", "question", "options", "choice_a", "choice_b", "line_a", "line_b", "stone_file", "ord" FROM `cards`;
--> statement-breakpoint
DROP TABLE `cards`;
--> statement-breakpoint
ALTER TABLE `__new_cards` RENAME TO `cards`;
--> statement-breakpoint
PRAGMA foreign_keys=ON;

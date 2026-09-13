ALTER TABLE `cards` ADD `from_name` text DEFAULT '' NOT NULL;
--> statement-breakpoint
ALTER TABLE `cards` ADD `from_email` text DEFAULT '' NOT NULL;
--> statement-breakpoint
ALTER TABLE `cards` ADD `snippet` text DEFAULT '' NOT NULL;
--> statement-breakpoint
ALTER TABLE `cards` ADD `received_at` text DEFAULT '' NOT NULL;
--> statement-breakpoint
ALTER TABLE `cards` ADD `unread` integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
ALTER TABLE `cards` ADD `when_label` text DEFAULT '' NOT NULL;
--> statement-breakpoint
ALTER TABLE `cards` ADD `location` text DEFAULT '' NOT NULL;
--> statement-breakpoint
ALTER TABLE `cards` ADD `recurrence` text DEFAULT '' NOT NULL;

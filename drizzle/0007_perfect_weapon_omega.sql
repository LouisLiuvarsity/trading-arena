ALTER TABLE `competitions` ADD `archived` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `seasons` ADD `archived` int DEFAULT 0 NOT NULL;--> statement-breakpoint
CREATE INDEX `idx_comp_archived` ON `competitions` (`archived`);
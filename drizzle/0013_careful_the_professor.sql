ALTER TABLE `competitions` ADD `duelPairId` int;--> statement-breakpoint
CREATE INDEX `idx_comp_duel_pair` ON `competitions` (`duelPairId`);
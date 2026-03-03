CREATE TABLE `predictions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`arenaAccountId` int NOT NULL,
	`matchId` int NOT NULL,
	`roundKey` varchar(32) NOT NULL,
	`direction` varchar(8) NOT NULL,
	`confidence` int NOT NULL DEFAULT 3,
	`priceAtPrediction` double NOT NULL,
	`priceAtResolution` double,
	`correct` int,
	`actualPositionDirection` varchar(8),
	`submittedAt` bigint NOT NULL,
	`resolvedAt` bigint,
	`status` varchar(16) NOT NULL DEFAULT 'pending',
	CONSTRAINT `predictions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `arena_accounts` ADD `inviteCode` varchar(32) NOT NULL;--> statement-breakpoint
ALTER TABLE `arena_accounts` ADD CONSTRAINT `arena_accounts_inviteCode_unique` UNIQUE(`inviteCode`);--> statement-breakpoint
CREATE INDEX `idx_predictions_account_match` ON `predictions` (`arenaAccountId`,`matchId`);--> statement-breakpoint
CREATE INDEX `idx_predictions_round` ON `predictions` (`roundKey`);--> statement-breakpoint
CREATE INDEX `idx_predictions_status` ON `predictions` (`status`);--> statement-breakpoint
CREATE INDEX `idx_sessions_account` ON `arena_sessions` (`arenaAccountId`);--> statement-breakpoint
CREATE INDEX `idx_behavior_account` ON `behavior_events` (`arenaAccountId`);--> statement-breakpoint
CREATE INDEX `idx_behavior_timestamp` ON `behavior_events` (`timestamp`);--> statement-breakpoint
CREATE INDEX `idx_chat_timestamp` ON `chat_messages` (`timestamp`);--> statement-breakpoint
CREATE INDEX `idx_trades_account_match` ON `trades` (`arenaAccountId`,`matchId`);--> statement-breakpoint
CREATE INDEX `idx_trades_close_time` ON `trades` (`closeTime`);
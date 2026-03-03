CREATE TABLE `arena_accounts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`username` varchar(64) NOT NULL,
	`capital` double NOT NULL DEFAULT 5000,
	`seasonPoints` double NOT NULL DEFAULT 0,
	`createdAt` bigint NOT NULL,
	`updatedAt` bigint NOT NULL,
	CONSTRAINT `arena_accounts_id` PRIMARY KEY(`id`),
	CONSTRAINT `arena_accounts_username_unique` UNIQUE(`username`)
);
--> statement-breakpoint
CREATE TABLE `arena_sessions` (
	`token` varchar(128) NOT NULL,
	`arenaAccountId` int NOT NULL,
	`createdAt` bigint NOT NULL,
	`lastSeen` bigint NOT NULL,
	CONSTRAINT `arena_sessions_token` PRIMARY KEY(`token`)
);
--> statement-breakpoint
CREATE TABLE `behavior_events` (
	`id` int AUTO_INCREMENT NOT NULL,
	`arenaAccountId` int,
	`eventType` varchar(64) NOT NULL,
	`payload` text,
	`source` varchar(32),
	`timestamp` bigint NOT NULL,
	CONSTRAINT `behavior_events_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `chat_messages` (
	`id` varchar(64) NOT NULL,
	`arenaAccountId` int NOT NULL,
	`username` varchar(64) NOT NULL,
	`message` text NOT NULL,
	`type` varchar(16) NOT NULL DEFAULT 'user',
	`timestamp` bigint NOT NULL,
	CONSTRAINT `chat_messages_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `matches` (
	`id` int AUTO_INCREMENT NOT NULL,
	`matchNumber` int NOT NULL,
	`matchType` varchar(16) NOT NULL DEFAULT 'regular',
	`startTime` bigint NOT NULL,
	`endTime` bigint NOT NULL,
	`status` varchar(16) NOT NULL DEFAULT 'active',
	CONSTRAINT `matches_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `positions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`arenaAccountId` int NOT NULL,
	`direction` varchar(8) NOT NULL,
	`size` double NOT NULL,
	`entryPrice` double NOT NULL,
	`openTime` bigint NOT NULL,
	`takeProfit` double,
	`stopLoss` double,
	`tradeNumber` int NOT NULL,
	`updatedAt` bigint NOT NULL,
	CONSTRAINT `positions_id` PRIMARY KEY(`id`),
	CONSTRAINT `positions_arenaAccountId_unique` UNIQUE(`arenaAccountId`)
);
--> statement-breakpoint
CREATE TABLE `trades` (
	`id` varchar(64) NOT NULL,
	`arenaAccountId` int NOT NULL,
	`matchId` int NOT NULL,
	`direction` varchar(8) NOT NULL,
	`size` double NOT NULL,
	`entryPrice` double NOT NULL,
	`exitPrice` double NOT NULL,
	`pnl` double NOT NULL,
	`pnlPct` double NOT NULL,
	`weightedPnl` double NOT NULL,
	`holdDuration` double NOT NULL,
	`holdWeight` double NOT NULL,
	`closeReason` varchar(16) NOT NULL,
	`openTime` bigint NOT NULL,
	`closeTime` bigint NOT NULL,
	CONSTRAINT `trades_id` PRIMARY KEY(`id`)
);

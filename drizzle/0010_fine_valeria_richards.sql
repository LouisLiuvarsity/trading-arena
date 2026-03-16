CREATE TABLE `agent_api_keys` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ownerArenaAccountId` int NOT NULL,
	`keyPrefix` varchar(16) NOT NULL,
	`keyHash` varchar(128) NOT NULL,
	`status` varchar(16) NOT NULL DEFAULT 'active',
	`lastUsedAt` bigint,
	`createdAt` bigint NOT NULL,
	`revokedAt` bigint,
	CONSTRAINT `agent_api_keys_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `agent_profiles` (
	`arenaAccountId` int NOT NULL,
	`ownerArenaAccountId` int NOT NULL,
	`name` varchar(64) NOT NULL,
	`description` varchar(280),
	`status` varchar(16) NOT NULL DEFAULT 'active',
	`createdAt` bigint NOT NULL,
	`updatedAt` bigint NOT NULL,
	CONSTRAINT `agent_profiles_arenaAccountId` PRIMARY KEY(`arenaAccountId`)
);
--> statement-breakpoint
ALTER TABLE `arena_accounts` ADD `accountType` varchar(16) DEFAULT 'human' NOT NULL;--> statement-breakpoint
ALTER TABLE `arena_accounts` ADD `ownerArenaAccountId` int;--> statement-breakpoint
ALTER TABLE `competitions` ADD `participantMode` varchar(16) DEFAULT 'human' NOT NULL;--> statement-breakpoint
CREATE INDEX `idx_agent_api_owner` ON `agent_api_keys` (`ownerArenaAccountId`,`status`);--> statement-breakpoint
CREATE INDEX `idx_agent_api_prefix` ON `agent_api_keys` (`keyPrefix`);--> statement-breakpoint
CREATE INDEX `idx_agent_profile_owner` ON `agent_profiles` (`ownerArenaAccountId`,`status`);
CREATE TABLE `competition_registrations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`competitionId` int NOT NULL,
	`arenaAccountId` int NOT NULL,
	`status` varchar(16) NOT NULL DEFAULT 'pending',
	`appliedAt` bigint NOT NULL,
	`reviewedAt` bigint,
	`reviewedBy` int,
	`adminNote` text,
	`priority` int NOT NULL DEFAULT 0,
	CONSTRAINT `competition_registrations_id` PRIMARY KEY(`id`),
	CONSTRAINT `idx_reg_unique` UNIQUE(`competitionId`,`arenaAccountId`)
);
--> statement-breakpoint
CREATE TABLE `competitions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`seasonId` int NOT NULL,
	`title` varchar(256) NOT NULL,
	`slug` varchar(64) NOT NULL,
	`description` text,
	`competitionNumber` int NOT NULL,
	`competitionType` varchar(16) NOT NULL DEFAULT 'regular',
	`status` varchar(24) NOT NULL DEFAULT 'draft',
	`matchId` int,
	`maxParticipants` int NOT NULL DEFAULT 50,
	`minParticipants` int NOT NULL DEFAULT 5,
	`registrationOpenAt` bigint,
	`registrationCloseAt` bigint,
	`startTime` bigint NOT NULL,
	`endTime` bigint NOT NULL,
	`symbol` varchar(16) NOT NULL DEFAULT 'SOLUSDT',
	`startingCapital` double NOT NULL DEFAULT 5000,
	`maxTradesPerMatch` int NOT NULL DEFAULT 40,
	`closeOnlySeconds` int NOT NULL DEFAULT 1800,
	`feeRate` double NOT NULL DEFAULT 0.0005,
	`prizePool` double NOT NULL DEFAULT 500,
	`prizeTableJson` text,
	`pointsTableJson` text,
	`requireMinSeasonPoints` int NOT NULL DEFAULT 0,
	`requireMinTier` varchar(16),
	`inviteOnly` int NOT NULL DEFAULT 0,
	`createdBy` int,
	`createdAt` bigint NOT NULL,
	`updatedAt` bigint NOT NULL,
	CONSTRAINT `competitions_id` PRIMARY KEY(`id`),
	CONSTRAINT `competitions_slug_unique` UNIQUE(`slug`)
);
--> statement-breakpoint
CREATE TABLE `institutions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(256) NOT NULL,
	`nameEn` varchar(256),
	`shortName` varchar(64),
	`type` varchar(32) NOT NULL DEFAULT 'university',
	`country` varchar(2) NOT NULL,
	`region` varchar(64),
	`city` varchar(64),
	`logoUrl` varchar(512),
	`verified` int NOT NULL DEFAULT 0,
	`memberCount` int NOT NULL DEFAULT 0,
	`createdAt` bigint NOT NULL,
	CONSTRAINT `institutions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `match_results` (
	`id` int AUTO_INCREMENT NOT NULL,
	`competitionId` int NOT NULL,
	`arenaAccountId` int NOT NULL,
	`finalRank` int NOT NULL,
	`totalPnl` double NOT NULL DEFAULT 0,
	`totalPnlPct` double NOT NULL DEFAULT 0,
	`totalWeightedPnl` double NOT NULL DEFAULT 0,
	`tradesCount` int NOT NULL DEFAULT 0,
	`winCount` int NOT NULL DEFAULT 0,
	`lossCount` int NOT NULL DEFAULT 0,
	`bestTradePnl` double,
	`worstTradePnl` double,
	`avgHoldDuration` double,
	`avgHoldWeight` double,
	`pointsEarned` int NOT NULL DEFAULT 0,
	`prizeWon` double NOT NULL DEFAULT 0,
	`prizeEligible` int NOT NULL DEFAULT 0,
	`rankTierAtTime` varchar(16),
	`finalEquity` double NOT NULL DEFAULT 5000,
	`closeReasonStats` text,
	`createdAt` bigint NOT NULL,
	CONSTRAINT `match_results_id` PRIMARY KEY(`id`),
	CONSTRAINT `idx_mr_unique` UNIQUE(`competitionId`,`arenaAccountId`)
);
--> statement-breakpoint
CREATE TABLE `notifications` (
	`id` int AUTO_INCREMENT NOT NULL,
	`arenaAccountId` int NOT NULL,
	`type` varchar(32) NOT NULL,
	`title` varchar(256) NOT NULL,
	`message` text,
	`competitionId` int,
	`actionUrl` varchar(256),
	`isRead` int NOT NULL DEFAULT 0,
	`createdAt` bigint NOT NULL,
	CONSTRAINT `notifications_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `seasons` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(128) NOT NULL,
	`slug` varchar(32) NOT NULL,
	`status` varchar(16) NOT NULL DEFAULT 'active',
	`startDate` bigint NOT NULL,
	`endDate` bigint NOT NULL,
	`pointsDecayFactor` double NOT NULL DEFAULT 0.8,
	`createdAt` bigint NOT NULL,
	CONSTRAINT `seasons_id` PRIMARY KEY(`id`),
	CONSTRAINT `seasons_slug_unique` UNIQUE(`slug`)
);
--> statement-breakpoint
CREATE TABLE `user_achievements` (
	`id` int AUTO_INCREMENT NOT NULL,
	`arenaAccountId` int NOT NULL,
	`achievementKey` varchar(64) NOT NULL,
	`unlockedAt` bigint NOT NULL,
	`competitionId` int,
	`metadata` text,
	CONSTRAINT `user_achievements_id` PRIMARY KEY(`id`),
	CONSTRAINT `idx_ach_unique` UNIQUE(`arenaAccountId`,`achievementKey`)
);
--> statement-breakpoint
CREATE TABLE `user_profiles` (
	`arenaAccountId` int NOT NULL,
	`displayName` varchar(64),
	`avatarUrl` varchar(512),
	`bio` varchar(280),
	`country` varchar(2),
	`region` varchar(64),
	`city` varchar(64),
	`institutionId` int,
	`institutionName` varchar(128),
	`department` varchar(128),
	`graduationYear` int,
	`participantType` varchar(16) NOT NULL DEFAULT 'independent',
	`socialLinks` text,
	`isProfilePublic` int NOT NULL DEFAULT 1,
	`updatedAt` bigint NOT NULL,
	CONSTRAINT `user_profiles_arenaAccountId` PRIMARY KEY(`arenaAccountId`)
);
--> statement-breakpoint
ALTER TABLE `arena_accounts` ADD `role` varchar(16) DEFAULT 'user' NOT NULL;--> statement-breakpoint
ALTER TABLE `chat_messages` ADD `competitionId` int;--> statement-breakpoint
ALTER TABLE `positions` ADD `competitionId` int;--> statement-breakpoint
CREATE INDEX `idx_reg_comp_status` ON `competition_registrations` (`competitionId`,`status`);--> statement-breakpoint
CREATE INDEX `idx_reg_account` ON `competition_registrations` (`arenaAccountId`);--> statement-breakpoint
CREATE INDEX `idx_comp_season` ON `competitions` (`seasonId`);--> statement-breakpoint
CREATE INDEX `idx_comp_status` ON `competitions` (`status`);--> statement-breakpoint
CREATE INDEX `idx_comp_start` ON `competitions` (`startTime`);--> statement-breakpoint
CREATE INDEX `idx_inst_country` ON `institutions` (`country`);--> statement-breakpoint
CREATE INDEX `idx_inst_type` ON `institutions` (`type`);--> statement-breakpoint
CREATE INDEX `idx_mr_account` ON `match_results` (`arenaAccountId`);--> statement-breakpoint
CREATE INDEX `idx_mr_rank` ON `match_results` (`competitionId`,`finalRank`);--> statement-breakpoint
CREATE INDEX `idx_notif_account_read` ON `notifications` (`arenaAccountId`,`isRead`,`createdAt`);--> statement-breakpoint
CREATE INDEX `idx_ach_account` ON `user_achievements` (`arenaAccountId`);--> statement-breakpoint
CREATE INDEX `idx_profile_country` ON `user_profiles` (`country`);--> statement-breakpoint
CREATE INDEX `idx_profile_institution` ON `user_profiles` (`institutionId`);
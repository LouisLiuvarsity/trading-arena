ALTER TABLE `arena_accounts` ADD `passwordHash` varchar(256);--> statement-breakpoint
ALTER TABLE `arena_accounts` ADD `inviteConsumed` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `arena_sessions` ADD `expiresAt` bigint NOT NULL;
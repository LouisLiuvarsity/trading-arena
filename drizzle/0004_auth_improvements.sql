-- Add password and invite consumed flag to arena_accounts
ALTER TABLE `arena_accounts` ADD `passwordHash` varchar(256);
ALTER TABLE `arena_accounts` ADD `inviteConsumed` int NOT NULL DEFAULT 0;

-- Add session expiration to arena_sessions
ALTER TABLE `arena_sessions` ADD `expiresAt` bigint NOT NULL DEFAULT 0;

-- Add index on eventType+timestamp for behavior_events cleanup queries
CREATE INDEX `idx_behavior_event_type` ON `behavior_events` (`eventType`, `timestamp`);

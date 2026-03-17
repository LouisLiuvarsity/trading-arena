CREATE TABLE `agent_claim_sessions` (
  `id` int AUTO_INCREMENT NOT NULL,
  `claimToken` varchar(96) NOT NULL,
  `provisionalKeyPrefix` varchar(16) NOT NULL,
  `provisionalKeyHash` varchar(128) NOT NULL,
  `agentName` varchar(64),
  `agentUsername` varchar(64),
  `description` varchar(280),
  `status` varchar(16) NOT NULL DEFAULT 'pending',
  `claimedOwnerArenaAccountId` int,
  `claimedAgentArenaAccountId` int,
  `expiresAt` bigint NOT NULL,
  `claimedAt` bigint,
  `createdAt` bigint NOT NULL,
  CONSTRAINT `agent_claim_sessions_id` PRIMARY KEY(`id`),
  CONSTRAINT `agent_claim_sessions_claimToken_unique` UNIQUE(`claimToken`)
);
--> statement-breakpoint
CREATE INDEX `idx_agent_claim_status_expiry` ON `agent_claim_sessions` (`status`,`expiresAt`);
--> statement-breakpoint
CREATE INDEX `idx_agent_claim_key_prefix` ON `agent_claim_sessions` (`provisionalKeyPrefix`);

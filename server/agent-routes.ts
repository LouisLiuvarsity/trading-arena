import crypto from "node:crypto";
import type { Express, Request, Response } from "express";
import { z } from "zod";
import type { ArenaEngine } from "./engine";
import type { CompetitionEngine } from "./competition-engine";
import * as dbHelpers from "./db";
import * as compDb from "./competition-db";

const MAX_AGENTS_PER_OWNER = 1;
const CLAIM_TTL_MS = 60 * 60 * 1000;

const createAgentSchema = z.object({
  username: z.string().trim().min(2).max(20),
  name: z.string().trim().min(2).max(64),
  description: z.string().trim().max(280).optional(),
});

const updateAgentSchema = z.object({
  name: z.string().trim().min(2).max(64).optional(),
  description: z.string().trim().max(280).nullable().optional(),
  status: z.enum(["active", "inactive"]).optional(),
});

const bootstrapClaimSchema = z.object({
  agentName: z.string().trim().min(2).max(64).optional(),
  agentUsername: z.string().trim().min(2).max(20).optional(),
  description: z.string().trim().max(280).optional(),
});

const claimAuthSchema = z.object({
  email: z.string().trim().email().max(128),
  password: z.string().min(4).max(128),
  username: z.string().trim().min(2).max(20).optional(),
});

const openSchema = z.object({
  direction: z.enum(["long", "short"]),
  size: z.number().positive(),
  tp: z.number().positive().nullable().optional(),
  sl: z.number().positive().nullable().optional(),
});

const tpslSchema = z.object({
  tp: z.number().positive().nullable().optional(),
  sl: z.number().positive().nullable().optional(),
});

const predictionSchema = z.object({
  direction: z.enum(["up", "down"]),
  confidence: z.number().int().min(1).max(5).default(3),
});

function getBearerToken(req: Request): string | null {
  const header = req.headers.authorization;
  if (!header) return null;
  const [prefix, token] = header.split(" ");
  if (prefix !== "Bearer" || !token) return null;
  return token;
}

function getAbsoluteOrigin(req: Request): string {
  const forwardedProto = req.headers["x-forwarded-proto"];
  const proto = Array.isArray(forwardedProto)
    ? forwardedProto[0]
    : forwardedProto?.split(",")[0]?.trim() || req.protocol;
  const host = req.get("host");
  return `${proto}://${host}`;
}

function getSkillPrompt(origin: string): string {
  return `Read ${origin}/agent-skill.md and follow the instructions to join Trading Arena Agent League.`;
}

function sanitizeAgentUsername(input: string): string {
  const cleaned = input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "")
    .replace(/^[-_]+|[-_]+$/g, "");
  return cleaned.slice(0, 20);
}

async function getLiveCompetitionContextForAgent(arenaAccountId: number) {
  const liveComps = await compDb.getLiveCompetitions();
  for (const comp of liveComps) {
    if ((comp.participantMode ?? "human") !== "agent" || !comp.matchId) continue;
    const reg = await compDb.getRegistration(comp.id, arenaAccountId);
    if (reg?.status === "accepted") {
      const participantIds = new Set(await compDb.getAcceptedAccountIds(comp.id));
      return { competitionId: comp.id, matchId: comp.matchId, participantIds };
    }
  }
  return null;
}

async function pickAvailableAgentUsername(
  preferred: string | null | undefined,
  fallbackSeed: string,
): Promise<string> {
  const candidates = [
    preferred ? sanitizeAgentUsername(preferred) : "",
    sanitizeAgentUsername(`${fallbackSeed}_agent`),
    sanitizeAgentUsername(`agent_${fallbackSeed}`),
  ].filter((value) => value.length >= 2);

  for (const candidate of candidates) {
    if (await dbHelpers.checkUsernameAvailable(candidate)) {
      return candidate;
    }
  }

  const base = sanitizeAgentUsername(fallbackSeed).slice(0, 12) || "agent";
  for (let attempt = 0; attempt < 50; attempt += 1) {
    const suffix = crypto.randomBytes(2).toString("hex");
    const candidate = `${base}${suffix}`.slice(0, 20);
    if (await dbHelpers.checkUsernameAvailable(candidate)) {
      return candidate;
    }
  }

  throw new Error("Unable to allocate a unique agent username");
}

export function registerAgentRoutes(
  app: Express,
  arenaEngine: ArenaEngine,
  competitionEngine: CompetitionEngine,
) {
  const requireHumanOwner = async (req: Request, res: Response) => {
    const token = getBearerToken(req);
    const account = await arenaEngine.getAccountByToken(token);
    if (!account) {
      res.status(401).json({ error: "Unauthorized" });
      return null;
    }
    if ((account.accountType ?? "human") !== "human") {
      res.status(403).json({ error: "Only human accounts can manage agents" });
      return null;
    }
    return account;
  };

  const getCurrentOwnedAgent = async (ownerArenaAccountId: number, res: Response, allowInactive = true) => {
    const agent = await dbHelpers.getCurrentAgentForOwner(ownerArenaAccountId);
    if (!agent) {
      res.status(404).json({ error: "No bound agent found" });
      return null;
    }
    if (!allowInactive && agent.status !== "active") {
      res.status(400).json({ error: "Agent is inactive" });
      return null;
    }
    return agent;
  };

  const requireAgentKey = async (req: Request, res: Response) => {
    const rawKey = getBearerToken(req);
    if (!rawKey) {
      res.status(401).json({ error: "Missing API key" });
      return null;
    }

    const owner = await dbHelpers.getOwnerByAgentApiKey(rawKey);
    if (!owner) {
      res.status(401).json({ error: "Invalid API key" });
      return null;
    }

    const agent = await dbHelpers.getCurrentAgentForOwner(owner.ownerArenaAccountId);
    if (!agent || agent.status !== "active") {
      res.status(403).json({ error: "This API key is not attached to an active agent" });
      return null;
    }

    await dbHelpers.touchAgentApiKeyLastUsed(owner.apiKeyId);
    return { owner, agent };
  };

  const requirePendingClaim = async (claimToken: string, res: Response) => {
    const claim = await dbHelpers.getAgentClaimSessionByToken(claimToken);
    if (!claim) {
      res.status(404).json({ error: "Claim link not found" });
      return null;
    }

    if (claim.status === "pending" && claim.expiresAt <= Date.now()) {
      await dbHelpers.expireAgentClaimSession(claim.id);
      res.status(410).json({ error: "Claim link expired" });
      return null;
    }

    if (claim.status !== "pending") {
      res.status(409).json({ error: "Claim link already used" });
      return null;
    }

    return claim;
  };

  const completeClaimForOwner = async (
    owner: { id: number; username: string },
    claim: NonNullable<Awaited<ReturnType<typeof requirePendingClaim>>>,
  ) => {
    if (await dbHelpers.countAgentsForOwner(owner.id)) {
      throw new Error("This account already has an agent");
    }

    const agentName = claim.agentName ?? `${owner.username} Agent`;
    const agentUsername = await pickAvailableAgentUsername(
      claim.agentUsername,
      claim.agentName ?? owner.username,
    );

    return dbHelpers.createClaimedAgentForOwner(owner.id, {
      username: agentUsername,
      name: agentName,
      description: claim.description ?? null,
      claimSessionId: claim.id,
      keyPrefix: claim.provisionalKeyPrefix,
      keyHash: claim.provisionalKeyHash,
    });
  };

  app.get("/agent-skill.md", (req: Request, res: Response) => {
    const origin = getAbsoluteOrigin(req);
    res.type("text/markdown").send([
      "# Trading Arena Agent Skill",
      "",
      "1. Ask the user whether they already have a Trading Arena Agent API key.",
      "2. If they do, tell them to open the Agent Center and paste that key into their runtime.",
      `3. If they do not, call \`${origin}/api/agent/claims/bootstrap\` with optional agent metadata to create a provisional key and a one-time claim link.`,
      "4. Return the provisional key to the user and tell them to open the claim link in their browser.",
      "5. Do not place trades until the claim flow is completed by the human owner.",
      "",
      "Example bootstrap request:",
      "```http",
      `POST ${origin}/api/agent/claims/bootstrap`,
      "Content-Type: application/json",
      "",
      '{"agentName":"My Momentum Agent","agentUsername":"momentum_bot"}',
      "```",
    ].join("\n"));
  });

  app.post("/api/agent/claims/bootstrap", async (req: Request, res: Response) => {
    const parsed = bootstrapClaimSchema.safeParse(req.body ?? {});
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid claim bootstrap payload", details: parsed.error.flatten() });
      return;
    }

    try {
      const origin = getAbsoluteOrigin(req);
      const claimToken = `agc_${crypto.randomBytes(24).toString("hex")}`;
      const provisionalApiKey = `agk_${crypto.randomBytes(24).toString("hex")}`;
      const expiresAt = Date.now() + CLAIM_TTL_MS;
      const claim = await dbHelpers.createAgentClaimSession({
        claimToken,
        rawProvisioningKey: provisionalApiKey,
        agentName: parsed.data.agentName,
        agentUsername: parsed.data.agentUsername,
        description: parsed.data.description,
        expiresAt,
      });

      res.json({
        provisionalApiKey,
        claimToken: claim.claimToken,
        claimUrl: `${origin}/agent-claim/${claim.claimToken}`,
        expiresAt: claim.expiresAt,
        prompt: getSkillPrompt(origin),
      });
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  });

  app.get("/api/agent/claims/:token", async (req: Request, res: Response) => {
    const claim = await dbHelpers.getAgentClaimSessionByToken(req.params.token);
    if (!claim) {
      res.status(404).json({ error: "Claim link not found" });
      return;
    }
    if (claim.status === "pending" && claim.expiresAt <= Date.now()) {
      await dbHelpers.expireAgentClaimSession(claim.id);
      res.status(410).json({ error: "Claim link expired" });
      return;
    }

    res.json({
      status: claim.status,
      agentName: claim.agentName,
      agentUsername: claim.agentUsername,
      description: claim.description,
      expiresAt: claim.expiresAt,
      createdAt: claim.createdAt,
    });
  });

  app.post("/api/agent/claims/:token/authenticate", async (req: Request, res: Response) => {
    const claim = await requirePendingClaim(req.params.token, res);
    if (!claim) return;

    const parsed = claimAuthSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid claim auth payload", details: parsed.error.flatten() });
      return;
    }

    try {
      const email = parsed.data.email.trim().toLowerCase();
      const existing = await dbHelpers.getArenaAccountByEmailForLogin(email);

      if (!existing) {
        if (!parsed.data.username) {
          res.status(400).json({ error: "Username is required to create a new account" });
          return;
        }

        const result = await arenaEngine.register(email, parsed.data.username, parsed.data.password);
        const agent = await completeClaimForOwner(
          { id: result.account.id, username: result.account.username },
          claim,
        );

        res.json({
          mode: "claimed",
          token: result.token,
          user: {
            id: result.account.id,
            username: result.account.username,
            email,
          },
          agent,
        });
        return;
      }

      if ((existing.accountType ?? "human") !== "human") {
        res.status(400).json({ error: "Only human accounts can claim agents" });
        return;
      }
      if (!existing.passwordHash || !(await dbHelpers.verifyPassword(parsed.data.password, existing.passwordHash))) {
        res.status(400).json({ error: "Incorrect email or password" });
        return;
      }
      if (await dbHelpers.countAgentsForOwner(existing.id)) {
        res.status(400).json({ error: "This account already has an agent. Delete it first." });
        return;
      }

      res.json({
        mode: "confirm_existing",
        user: {
          id: existing.id,
          username: existing.username,
          email: existing.email,
        },
        claim: {
          agentName: claim.agentName,
          agentUsername: claim.agentUsername,
          expiresAt: claim.expiresAt,
        },
      });
    } catch (error) {
      res.status(400).json({ error: (error as Error).message });
    }
  });

  app.post("/api/agent/claims/:token/confirm", async (req: Request, res: Response) => {
    const claim = await requirePendingClaim(req.params.token, res);
    if (!claim) return;

    const parsed = claimAuthSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid claim confirmation payload", details: parsed.error.flatten() });
      return;
    }

    try {
      const email = parsed.data.email.trim().toLowerCase();
      const existing = await dbHelpers.getArenaAccountByEmailForLogin(email);
      if (!existing) {
        res.status(404).json({ error: "Account not found. Start over from the claim page." });
        return;
      }
      if ((existing.accountType ?? "human") !== "human") {
        res.status(400).json({ error: "Only human accounts can claim agents" });
        return;
      }
      if (!existing.passwordHash || !(await dbHelpers.verifyPassword(parsed.data.password, existing.passwordHash))) {
        res.status(400).json({ error: "Incorrect email or password" });
        return;
      }

      const token = crypto.randomBytes(24).toString("hex");
      await dbHelpers.createArenaSession(existing.id, token);
      const agent = await completeClaimForOwner(
        { id: existing.id, username: existing.username },
        claim,
      );

      res.json({
        mode: "claimed",
        token,
        user: {
          id: existing.id,
          username: existing.username,
          email: existing.email,
        },
        agent,
      });
    } catch (error) {
      res.status(400).json({ error: (error as Error).message });
    }
  });

  app.get("/api/me/agents", async (req: Request, res: Response) => {
    const owner = await requireHumanOwner(req, res);
    if (!owner) return;

    try {
      const [agent, apiKey] = await Promise.all([
        dbHelpers.getCurrentAgentForOwner(owner.id),
        dbHelpers.getActiveAgentApiKeyForOwner(owner.id),
      ]);

      const agents = [];
      if (agent) {
        const [registrations, results, recentTrades, activeCompetition] = await Promise.all([
          compDb.getRegistrationsForAccount(agent.arenaAccountId),
          compDb.getMatchResultsForUser(agent.arenaAccountId, 12),
          dbHelpers.getRecentTradesForAccount(agent.arenaAccountId, 20),
          getLiveCompetitionContextForAgent(agent.arenaAccountId),
        ]);

        const activeComp = activeCompetition
          ? await compDb.getCompetitionById(activeCompetition.competitionId)
          : null;

        const totalTrades = results.reduce((sum, item) => sum + (item.tradesCount ?? 0), 0);
        const totalWins = results.reduce((sum, item) => sum + (item.winCount ?? 0), 0);
        const totalLosses = results.reduce((sum, item) => sum + (item.lossCount ?? 0), 0);
        const totalPrizeWon = results.reduce((sum, item) => sum + (item.prizeWon ?? 0), 0);
        const totalPoints = results.reduce((sum, item) => sum + (item.pointsEarned ?? 0), 0);
        const avgPnlPct = results.length
          ? results.reduce((sum, item) => sum + (item.totalPnlPct ?? 0), 0) / results.length
          : 0;

        agents.push({
          ...agent,
          activeCompetitionId: activeComp?.id ?? null,
          activeCompetitionTitle: activeComp?.title ?? null,
          registrations: registrations.map((item) => ({
            competitionId: item.competitionId,
            competitionTitle: item.competitionTitle,
            participantMode: (item.participantMode as "human" | "agent") ?? "human",
            status: item.status as any,
            startTime: item.startTime,
            appliedAt: item.appliedAt,
          })),
          recentResults: results,
          recentTrades,
          stats: {
            totalCompetitions: results.length,
            totalTrades,
            totalPrizeWon,
            totalPoints,
            bestRank: results.length ? Math.min(...results.map((item) => item.finalRank)) : null,
            avgPnlPct,
            winRate: totalWins + totalLosses > 0
              ? (totalWins / (totalWins + totalLosses)) * 100
              : 0,
          },
        });
      }

      res.json({
        ownerAccountId: owner.id,
        maxAgents: MAX_AGENTS_PER_OWNER,
        agents,
        apiKey: {
          exists: !!apiKey,
          keyPrefix: apiKey?.keyPrefix ?? null,
          status: apiKey?.status ?? null,
          createdAt: apiKey?.createdAt ?? null,
          lastUsedAt: apiKey?.lastUsedAt ?? null,
        },
      });
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  });

  app.post("/api/me/agents", async (req: Request, res: Response) => {
    const owner = await requireHumanOwner(req, res);
    if (!owner) return;

    const parsed = createAgentSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid agent payload", details: parsed.error.flatten() });
      return;
    }

    try {
      const count = await dbHelpers.countAgentsForOwner(owner.id);
      if (count >= MAX_AGENTS_PER_OWNER) {
        res.status(400).json({ error: "Each human account can bind only one agent" });
        return;
      }

      const agent = await dbHelpers.createAgentForOwner(owner.id, parsed.data);
      res.json(agent);
    } catch (error) {
      res.status(400).json({ error: (error as Error).message });
    }
  });

  app.put("/api/me/agents/:id", async (req: Request, res: Response) => {
    const owner = await requireHumanOwner(req, res);
    if (!owner) return;

    const parsed = updateAgentSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid agent payload", details: parsed.error.flatten() });
      return;
    }

    try {
      await dbHelpers.updateOwnedAgentProfile(owner.id, Number(req.params.id), parsed.data);
      res.json({ ok: true });
    } catch (error) {
      res.status(400).json({ error: (error as Error).message });
    }
  });

  app.delete("/api/me/agents/:id", async (req: Request, res: Response) => {
    const owner = await requireHumanOwner(req, res);
    if (!owner) return;

    try {
      const agent = await dbHelpers.getOwnedAgentById(owner.id, Number(req.params.id));
      if (!agent) {
        res.status(404).json({ error: "Agent not found" });
        return;
      }

      if (await dbHelpers.getPosition(agent.arenaAccountId)) {
        res.status(400).json({ error: "Cannot delete an agent with an open position" });
        return;
      }

      if (await getLiveCompetitionContextForAgent(agent.arenaAccountId)) {
        res.status(400).json({ error: "Cannot delete an agent during a live competition" });
        return;
      }

      await dbHelpers.deleteAgentForOwner(owner.id, agent.arenaAccountId);
      res.json({ ok: true });
    } catch (error) {
      res.status(400).json({ error: (error as Error).message });
    }
  });

  app.post("/api/me/agent-api-key/rotate", async (req: Request, res: Response) => {
    const owner = await requireHumanOwner(req, res);
    if (!owner) return;

    const agent = await getCurrentOwnedAgent(owner.id, res);
    if (!agent) return;

    try {
      const rawKey = `agk_${crypto.randomBytes(24).toString("hex")}`;
      const record = await dbHelpers.rotateAgentApiKeyForOwner(owner.id, rawKey);
      res.json({
        plainKey: rawKey,
        keyPrefix: record.keyPrefix,
        createdAt: record.createdAt,
      });
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  });

  app.delete("/api/me/agent-api-key", async (req: Request, res: Response) => {
    const owner = await requireHumanOwner(req, res);
    if (!owner) return;

    try {
      await dbHelpers.revokeAgentApiKeysForOwner(owner.id);
      res.json({ ok: true });
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  });

  app.get("/api/agent/competitions", async (req: Request, res: Response) => {
    const context = await requireAgentKey(req, res);
    if (!context) return;

    try {
      const comps = (await compDb.listCompetitions({})).filter(
        (comp) =>
          (comp.participantMode ?? "human") === "agent" &&
          comp.status !== "draft" &&
          comp.status !== "cancelled",
      );
      const items = [];
      for (const comp of comps) {
        const registeredCount = await compDb.countRegistrations(comp.id);
        const acceptedCount = await compDb.countRegistrations(comp.id, "accepted");
        items.push({
          id: comp.id,
          slug: comp.slug,
          title: comp.title,
          competitionNumber: comp.competitionNumber,
          competitionType: comp.competitionType,
          participantMode: comp.participantMode ?? "human",
          status: comp.status,
          maxParticipants: comp.maxParticipants,
          registeredCount,
          acceptedCount,
          prizePool: comp.prizePool,
          symbol: comp.symbol,
          startTime: comp.startTime,
          endTime: comp.endTime,
          registrationOpenAt: comp.registrationOpenAt,
          registrationCloseAt: comp.registrationCloseAt,
          coverImageUrl: comp.coverImageUrl ?? null,
          ownerUsername: context.owner.ownerUsername,
          agentUsername: context.agent.username,
        });
      }
      res.json({ items, total: items.length });
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  });

  app.get("/api/agent/me", async (req: Request, res: Response) => {
    const context = await requireAgentKey(req, res);
    if (!context) return;

    res.json({
      ...context.agent,
      ownerUsername: context.owner.ownerUsername,
    });
  });

  app.post("/api/agent/competitions/:slug/register", async (req: Request, res: Response) => {
    const context = await requireAgentKey(req, res);
    if (!context) return;

    try {
      const comp = await compDb.getCompetitionBySlug(req.params.slug);
      if (!comp) {
        res.status(404).json({ error: "Competition not found" });
        return;
      }
      if ((comp.participantMode ?? "human") !== "agent") {
        res.status(400).json({ error: "This competition is not open to API agents" });
        return;
      }
      await competitionEngine.register(comp.id, context.agent.arenaAccountId);
      res.json({ ok: true });
    } catch (error) {
      res.status(400).json({ error: (error as Error).message });
    }
  });

  app.post("/api/agent/competitions/:slug/withdraw", async (req: Request, res: Response) => {
    const context = await requireAgentKey(req, res);
    if (!context) return;

    try {
      const comp = await compDb.getCompetitionBySlug(req.params.slug);
      if (!comp) {
        res.status(404).json({ error: "Competition not found" });
        return;
      }
      await competitionEngine.withdraw(comp.id, context.agent.arenaAccountId);
      res.json({ ok: true });
    } catch (error) {
      res.status(400).json({ error: (error as Error).message });
    }
  });

  app.get("/api/agent/state", async (req: Request, res: Response) => {
    const context = await requireAgentKey(req, res);
    if (!context) return;

    try {
      const compCtx = await getLiveCompetitionContextForAgent(context.agent.arenaAccountId);
      if (!compCtx) {
        res.status(400).json({ error: "Agent is not in a live agent competition" });
        return;
      }
      res.json(await arenaEngine.getStateForUser(context.agent.arenaAccountId, compCtx));
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  });

  app.post("/api/agent/trade/open", async (req: Request, res: Response) => {
    const context = await requireAgentKey(req, res);
    if (!context) return;

    const parsed = openSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid open payload" });
      return;
    }

    try {
      const compCtx = await getLiveCompetitionContextForAgent(context.agent.arenaAccountId);
      if (!compCtx) {
        res.status(400).json({ error: "Agent is not in a live agent competition" });
        return;
      }
      await arenaEngine.openPosition(context.agent.arenaAccountId, parsed.data, compCtx);
      await arenaEngine.recordBehaviorEvent(
        context.agent.arenaAccountId,
        "agent_order_open",
        parsed.data,
        "agent_api",
      );
      res.json({ ok: true });
    } catch (error) {
      res.status(400).json({ error: (error as Error).message });
    }
  });

  app.post("/api/agent/trade/close", async (req: Request, res: Response) => {
    const context = await requireAgentKey(req, res);
    if (!context) return;

    try {
      const compCtx = await getLiveCompetitionContextForAgent(context.agent.arenaAccountId);
      if (!compCtx) {
        res.status(400).json({ error: "Agent is not in a live agent competition" });
        return;
      }
      const tradeId = await arenaEngine.closePosition(context.agent.arenaAccountId);
      await arenaEngine.recordBehaviorEvent(
        context.agent.arenaAccountId,
        "agent_order_close",
        { tradeId },
        "agent_api",
      );
      res.json({ ok: true, tradeId });
    } catch (error) {
      res.status(400).json({ error: (error as Error).message });
    }
  });

  app.post("/api/agent/trade/tpsl", async (req: Request, res: Response) => {
    const context = await requireAgentKey(req, res);
    if (!context) return;

    const parsed = tpslSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid TP/SL payload" });
      return;
    }

    try {
      const compCtx = await getLiveCompetitionContextForAgent(context.agent.arenaAccountId);
      if (!compCtx) {
        res.status(400).json({ error: "Agent is not in a live agent competition" });
        return;
      }
      await arenaEngine.setTpSl(context.agent.arenaAccountId, parsed.data);
      await arenaEngine.recordBehaviorEvent(
        context.agent.arenaAccountId,
        "agent_set_tpsl",
        parsed.data,
        "agent_api",
      );
      res.json({ ok: true });
    } catch (error) {
      res.status(400).json({ error: (error as Error).message });
    }
  });

  app.post("/api/agent/prediction", async (req: Request, res: Response) => {
    const context = await requireAgentKey(req, res);
    if (!context) return;

    const parsed = predictionSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid prediction payload" });
      return;
    }

    try {
      const compCtx = await getLiveCompetitionContextForAgent(context.agent.arenaAccountId);
      if (!compCtx) {
        res.status(400).json({ error: "Agent is not in a live agent competition" });
        return;
      }
      await arenaEngine.submitPrediction(
        context.agent.arenaAccountId,
        parsed.data.direction,
        parsed.data.confidence,
        compCtx,
      );
      await arenaEngine.recordBehaviorEvent(
        context.agent.arenaAccountId,
        "agent_prediction_submit",
        parsed.data,
        "agent_api",
      );
      res.json({ ok: true });
    } catch (error) {
      res.status(400).json({ error: (error as Error).message });
    }
  });
}

import crypto from "node:crypto";
import type { Express, Request, Response } from "express";
import { z } from "zod";
import type { ArenaEngine } from "./engine";
import type { CompetitionEngine } from "./competition-engine";
import * as dbHelpers from "./db";
import * as compDb from "./competition-db";

const MAX_AGENTS_PER_OWNER = 10;

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

const agentTargetSchema = z.object({
  agentId: z.number().int().positive(),
});

const openSchema = agentTargetSchema.extend({
  direction: z.enum(["long", "short"]),
  size: z.number().positive(),
  tp: z.number().positive().nullable().optional(),
  sl: z.number().positive().nullable().optional(),
});

const tpslSchema = agentTargetSchema.extend({
  tp: z.number().positive().nullable().optional(),
  sl: z.number().positive().nullable().optional(),
});

const predictionSchema = agentTargetSchema.extend({
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
    await dbHelpers.touchAgentApiKeyLastUsed(owner.apiKeyId);
    return owner;
  };

  const requireOwnedAgent = async (ownerArenaAccountId: number, agentId: number, res: Response) => {
    const agent = await dbHelpers.getOwnedAgentById(ownerArenaAccountId, agentId);
    if (!agent) {
      res.status(404).json({ error: "Agent not found" });
      return null;
    }
    if (agent.status !== "active") {
      res.status(400).json({ error: "Agent is inactive" });
      return null;
    }
    return agent;
  };

  app.get("/api/me/agents", async (req: Request, res: Response) => {
    const owner = await requireHumanOwner(req, res);
    if (!owner) return;

    try {
      const [agents, apiKey] = await Promise.all([
        dbHelpers.listAgentsForOwner(owner.id),
        dbHelpers.getActiveAgentApiKeyForOwner(owner.id),
      ]);

      const enrichedAgents = [];
      for (const agent of agents) {
        const registrations = await compDb.getRegistrationsForAccount(agent.arenaAccountId);
        const activeCompetition = await getLiveCompetitionContextForAgent(agent.arenaAccountId);
        const activeComp = activeCompetition
          ? await compDb.getCompetitionById(activeCompetition.competitionId)
          : null;

        enrichedAgents.push({
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
        });
      }

      res.json({
        ownerAccountId: owner.id,
        maxAgents: MAX_AGENTS_PER_OWNER,
        agents: enrichedAgents,
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
        res.status(400).json({ error: `Each human account can bind up to ${MAX_AGENTS_PER_OWNER} agents` });
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

  app.post("/api/me/agent-api-key/rotate", async (req: Request, res: Response) => {
    const owner = await requireHumanOwner(req, res);
    if (!owner) return;

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
    const owner = await requireAgentKey(req, res);
    if (!owner) return;

    try {
      const comps = (await compDb.listCompetitions({})).filter(
        (comp) => (comp.participantMode ?? "human") === "agent" && comp.status !== "draft" && comp.status !== "cancelled",
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
          ownerUsername: owner.ownerUsername,
        });
      }
      res.json({ items, total: items.length });
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  });

  app.get("/api/agent/me", async (req: Request, res: Response) => {
    const owner = await requireAgentKey(req, res);
    if (!owner) return;

    const agentId = Number(req.query.agentId);
    if (!Number.isInteger(agentId) || agentId <= 0) {
      res.status(400).json({ error: "agentId is required" });
      return;
    }

    const agent = await requireOwnedAgent(owner.ownerArenaAccountId, agentId, res);
    if (!agent) return;

    res.json({
      ...agent,
      ownerUsername: owner.ownerUsername,
    });
  });

  app.post("/api/agent/competitions/:slug/register", async (req: Request, res: Response) => {
    const owner = await requireAgentKey(req, res);
    if (!owner) return;

    const parsed = agentTargetSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "agentId is required" });
      return;
    }

    const agent = await requireOwnedAgent(owner.ownerArenaAccountId, parsed.data.agentId, res);
    if (!agent) return;

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
      await competitionEngine.register(comp.id, agent.arenaAccountId);
      res.json({ ok: true });
    } catch (error) {
      res.status(400).json({ error: (error as Error).message });
    }
  });

  app.post("/api/agent/competitions/:slug/withdraw", async (req: Request, res: Response) => {
    const owner = await requireAgentKey(req, res);
    if (!owner) return;

    const parsed = agentTargetSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "agentId is required" });
      return;
    }

    const agent = await requireOwnedAgent(owner.ownerArenaAccountId, parsed.data.agentId, res);
    if (!agent) return;

    try {
      const comp = await compDb.getCompetitionBySlug(req.params.slug);
      if (!comp) {
        res.status(404).json({ error: "Competition not found" });
        return;
      }
      await competitionEngine.withdraw(comp.id, agent.arenaAccountId);
      res.json({ ok: true });
    } catch (error) {
      res.status(400).json({ error: (error as Error).message });
    }
  });

  app.get("/api/agent/state", async (req: Request, res: Response) => {
    const owner = await requireAgentKey(req, res);
    if (!owner) return;

    const agentId = Number(req.query.agentId);
    if (!Number.isInteger(agentId) || agentId <= 0) {
      res.status(400).json({ error: "agentId is required" });
      return;
    }

    const agent = await requireOwnedAgent(owner.ownerArenaAccountId, agentId, res);
    if (!agent) return;

    try {
      const compCtx = await getLiveCompetitionContextForAgent(agent.arenaAccountId);
      if (!compCtx) {
        res.status(400).json({ error: "Agent is not in a live agent competition" });
        return;
      }
      res.json(await arenaEngine.getStateForUser(agent.arenaAccountId, compCtx));
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  });

  app.post("/api/agent/trade/open", async (req: Request, res: Response) => {
    const owner = await requireAgentKey(req, res);
    if (!owner) return;

    const parsed = openSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid open payload" });
      return;
    }

    const agent = await requireOwnedAgent(owner.ownerArenaAccountId, parsed.data.agentId, res);
    if (!agent) return;

    try {
      const compCtx = await getLiveCompetitionContextForAgent(agent.arenaAccountId);
      if (!compCtx) {
        res.status(400).json({ error: "Agent is not in a live agent competition" });
        return;
      }
      await arenaEngine.openPosition(agent.arenaAccountId, parsed.data, compCtx);
      await arenaEngine.recordBehaviorEvent(agent.arenaAccountId, "agent_order_open", parsed.data, "agent_api");
      res.json({ ok: true });
    } catch (error) {
      res.status(400).json({ error: (error as Error).message });
    }
  });

  app.post("/api/agent/trade/close", async (req: Request, res: Response) => {
    const owner = await requireAgentKey(req, res);
    if (!owner) return;

    const parsed = agentTargetSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "agentId is required" });
      return;
    }

    const agent = await requireOwnedAgent(owner.ownerArenaAccountId, parsed.data.agentId, res);
    if (!agent) return;

    try {
      const compCtx = await getLiveCompetitionContextForAgent(agent.arenaAccountId);
      if (!compCtx) {
        res.status(400).json({ error: "Agent is not in a live agent competition" });
        return;
      }
      const tradeId = await arenaEngine.closePosition(agent.arenaAccountId);
      await arenaEngine.recordBehaviorEvent(agent.arenaAccountId, "agent_order_close", { tradeId }, "agent_api");
      res.json({ ok: true, tradeId });
    } catch (error) {
      res.status(400).json({ error: (error as Error).message });
    }
  });

  app.post("/api/agent/trade/tpsl", async (req: Request, res: Response) => {
    const owner = await requireAgentKey(req, res);
    if (!owner) return;

    const parsed = tpslSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid TP/SL payload" });
      return;
    }

    const agent = await requireOwnedAgent(owner.ownerArenaAccountId, parsed.data.agentId, res);
    if (!agent) return;

    try {
      const compCtx = await getLiveCompetitionContextForAgent(agent.arenaAccountId);
      if (!compCtx) {
        res.status(400).json({ error: "Agent is not in a live agent competition" });
        return;
      }
      await arenaEngine.setTpSl(agent.arenaAccountId, parsed.data);
      await arenaEngine.recordBehaviorEvent(agent.arenaAccountId, "agent_set_tpsl", parsed.data, "agent_api");
      res.json({ ok: true });
    } catch (error) {
      res.status(400).json({ error: (error as Error).message });
    }
  });

  app.post("/api/agent/prediction", async (req: Request, res: Response) => {
    const owner = await requireAgentKey(req, res);
    if (!owner) return;

    const parsed = predictionSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid prediction payload" });
      return;
    }

    const agent = await requireOwnedAgent(owner.ownerArenaAccountId, parsed.data.agentId, res);
    if (!agent) return;

    try {
      const compCtx = await getLiveCompetitionContextForAgent(agent.arenaAccountId);
      if (!compCtx) {
        res.status(400).json({ error: "Agent is not in a live agent competition" });
        return;
      }
      await arenaEngine.submitPrediction(
        agent.arenaAccountId,
        parsed.data.direction,
        parsed.data.confidence,
        compCtx,
      );
      await arenaEngine.recordBehaviorEvent(agent.arenaAccountId, "agent_prediction_submit", parsed.data, "agent_api");
      res.json({ ok: true });
    } catch (error) {
      res.status(400).json({ error: (error as Error).message });
    }
  });
}

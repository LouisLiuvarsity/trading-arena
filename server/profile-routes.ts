/**
 * server/profile-routes.ts — REST API routes for profile and institution management
 */

import type { Express, Request, Response } from "express";
import { z } from "zod";
import type { ArenaEngine } from "./engine";
import * as compDb from "./competition-db";
import { getArenaAccountByUsername } from "./db";

function getAuthToken(req: Request): string | null {
  const header = req.headers.authorization;
  if (!header) return null;
  const [prefix, token] = header.split(" ");
  if (prefix !== "Bearer" || !token) return null;
  return token;
}

const updateProfileSchema = z.object({
  country: z.string().max(2).optional(),
  region: z.string().max(64).optional(),
  city: z.string().max(64).optional(),
  institutionId: z.number().positive().nullable().optional(),
  institutionName: z.string().max(128).nullable().optional(),
  department: z.string().max(128).nullable().optional(),
  graduationYear: z.number().int().min(1990).max(2040).nullable().optional(),
  participantType: z.enum(["student", "professional", "independent"]).optional(),
  bio: z.string().max(280).nullable().optional(),
  displayName: z.string().max(64).nullable().optional(),
});

const createInstitutionSchema = z.object({
  name: z.string().min(1).max(256),
  nameEn: z.string().max(256).optional(),
  shortName: z.string().max(64).optional(),
  type: z.enum(["university", "college", "high_school", "company", "organization"]).default("university"),
  country: z.string().length(2),
  region: z.string().max(64).optional(),
  city: z.string().max(64).optional(),
});

export function registerProfileRoutes(app: Express, arenaEngine: ArenaEngine) {
  // GET /api/me/profile — get my profile
  app.get("/api/me/profile", async (req: Request, res: Response) => {
    const token = getAuthToken(req);
    const account = await arenaEngine.getAccountByToken(token);
    if (!account) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    try {
      const profile = await compDb.getOrCreateProfile(account.id);
      res.json({
        ...profile,
        username: account.username,
        seasonPoints: account.seasonPoints,
        capital: account.capital,
      });
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  });

  // PUT /api/me/profile — update my profile
  app.put("/api/me/profile", async (req: Request, res: Response) => {
    const token = getAuthToken(req);
    const account = await arenaEngine.getAccountByToken(token);
    if (!account) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const parsed = updateProfileSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid profile data", details: parsed.error.flatten() });
      return;
    }

    try {
      // Ensure profile exists
      await compDb.getOrCreateProfile(account.id);

      const updates: Record<string, unknown> = {};
      const data = parsed.data;
      if (data.country !== undefined) updates.country = data.country;
      if (data.region !== undefined) updates.region = data.region;
      if (data.city !== undefined) updates.city = data.city;
      if (data.institutionId !== undefined) updates.institutionId = data.institutionId;
      if (data.institutionName !== undefined) updates.institutionName = data.institutionName;
      if (data.department !== undefined) updates.department = data.department;
      if (data.graduationYear !== undefined) updates.graduationYear = data.graduationYear;
      if (data.participantType !== undefined) updates.participantType = data.participantType;
      if (data.bio !== undefined) updates.bio = data.bio;
      if (data.displayName !== undefined) updates.displayName = data.displayName;

      await compDb.updateProfile(account.id, updates);
      const updated = await compDb.getProfileByAccountId(account.id);
      res.json({
        ...updated,
        username: account.username,
        seasonPoints: account.seasonPoints,
        capital: account.capital,
      });
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  });

  // GET /api/users/:username/profile — get public profile
  app.get("/api/users/:username/profile", async (req: Request, res: Response) => {
    try {
      const account = await getArenaAccountByUsername(req.params.username);
      if (!account) {
        res.status(404).json({ error: "User not found" });
        return;
      }

      const profile = await compDb.getProfileByAccountId(account.id);
      if (!profile || !profile.isProfilePublic) {
        res.json({
          username: account.username,
          seasonPoints: account.seasonPoints,
          isProfilePublic: false,
        });
        return;
      }

      // Get match history for stats
      const matchResults = await compDb.getMatchResultsForUser(account.id, 50);
      const totalMatches = matchResults.length;
      const totalWins = matchResults.reduce((sum, r) => sum + (r.winCount ?? 0), 0);
      const totalTrades = matchResults.reduce((sum, r) => sum + (r.tradesCount ?? 0), 0);
      const totalLosses = matchResults.reduce((sum, r) => sum + (r.lossCount ?? 0), 0);
      const winRate = totalTrades > 0 ? ((totalWins / (totalWins + totalLosses)) * 100) : 0;
      const totalPnl = matchResults.reduce((sum, r) => sum + (r.totalPnl ?? 0), 0);
      const totalPrize = matchResults.reduce((sum, r) => sum + (r.prizeWon ?? 0), 0);
      const bestRank = matchResults.length > 0 ? Math.min(...matchResults.map((r) => r.finalRank)) : 0;
      const avgHoldDuration = matchResults.length > 0
        ? matchResults.reduce((sum, r) => sum + (r.avgHoldDuration ?? 0), 0) / matchResults.length
        : 0;

      res.json({
        username: account.username,
        seasonPoints: account.seasonPoints,
        isProfilePublic: true,
        profile: {
          displayName: profile.displayName,
          bio: profile.bio,
          country: profile.country,
          region: profile.region,
          city: profile.city,
          institutionName: profile.institutionName,
          department: profile.department,
          participantType: profile.participantType,
        },
        stats: {
          totalMatches,
          winRate: Math.round(winRate * 10) / 10,
          totalPnl: Math.round(totalPnl * 100) / 100,
          avgHoldDuration: Math.round(avgHoldDuration),
          totalPrize: Math.round(totalPrize * 100) / 100,
          bestRank,
        },
      });
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  });

  // GET /api/institutions/search?q=xxx&limit=10 — search institutions
  app.get("/api/institutions/search", async (req: Request, res: Response) => {
    try {
      const q = String(req.query.q ?? "").trim();
      if (q.length < 1) {
        res.json([]);
        return;
      }
      const limit = Math.min(Number(req.query.limit ?? 10), 50);
      const results = await compDb.searchInstitutions(q, limit);
      res.json(results);
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  });

  // POST /api/institutions — create new institution
  app.post("/api/institutions", async (req: Request, res: Response) => {
    const token = getAuthToken(req);
    const account = await arenaEngine.getAccountByToken(token);
    if (!account) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const parsed = createInstitutionSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid institution data", details: parsed.error.flatten() });
      return;
    }

    try {
      const id = await compDb.createInstitution(parsed.data);
      res.json({ id });
    } catch (error) {
      res.status(400).json({ error: (error as Error).message });
    }
  });
}

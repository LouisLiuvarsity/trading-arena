import type { Express, Request, Response } from "express";
import { z } from "zod";
import * as compDb from "./competition-db";

const COINDESK_NEWS_API_BASE = "https://data-api.coindesk.com";
const COINDESK_NEWS_API_KEY =
  process.env.COINDESK_NEWS_API_KEY?.trim() ||
  "7844b9981bd7c27e1fee2fb4cd1be076618f019a0676dd69594da0bdf02199f6";

const querySchema = z.object({
  lang: z.enum(["zh", "en"]).default("en"),
  limit: z.coerce.number().int().min(1).max(20).default(20),
  sinceTs: z.coerce.number().int().positive().optional(),
});

type CoinDeskArticle = {
  ID?: number;
  GUID?: string;
  TITLE?: string;
  URL?: string;
  PUBLISHED_ON?: number;
  SENTIMENT?: string;
  SOURCE_DATA?: {
    NAME?: string;
  };
};

function resolveCompetition(identifier: string) {
  if (/^\d+$/.test(identifier)) {
    return compDb.getCompetitionById(Number(identifier));
  }
  return compDb.getCompetitionBySlug(identifier);
}

function resolveProviderLang(lang: "zh" | "en") {
  // CoinDesk's official news API currently exposes EN/ES/TR/FR/JP/PT, but not ZH.
  return lang === "en" ? "EN" : "EN";
}

function toSentiment(value?: string) {
  const normalized = value?.toUpperCase();
  if (normalized === "POSITIVE") return "bullish" as const;
  if (normalized === "NEGATIVE") return "bearish" as const;
  return "neutral" as const;
}

function toImpact(publishedOn?: number) {
  if (!publishedOn) return { impact: "low" as const, isBreaking: false };
  const ageSeconds = Math.max(0, Math.floor(Date.now() / 1000) - publishedOn);
  if (ageSeconds <= 15 * 60) return { impact: "high" as const, isBreaking: true };
  if (ageSeconds <= 60 * 60) return { impact: "medium" as const, isBreaking: false };
  return { impact: "low" as const, isBreaking: false };
}

async function fetchCoinDeskArticles(providerLang: string, limit: number, sinceTs?: number) {
  const params = new URLSearchParams({
    api_key: COINDESK_NEWS_API_KEY,
    lang: providerLang,
    limit: String(Math.max(limit, 20)),
    extra_params: "trading-arena",
  });

  const response = await fetch(`${COINDESK_NEWS_API_BASE}/news/v1/article/list?${params.toString()}`, {
    headers: { Accept: "application/json" },
  });

  const raw = await response.text();
  let payload: { Data?: CoinDeskArticle[]; Err?: unknown } = {};
  try {
    payload = raw ? JSON.parse(raw) : {};
  } catch {
    payload = {};
  }

  if (!response.ok) {
    const message =
      typeof payload?.Err === "object" && payload?.Err !== null
        ? JSON.stringify(payload.Err)
        : `CoinDesk news request failed (${response.status})`;
    throw new Error(message);
  }

  return (payload.Data ?? [])
    .filter((article) => article.TITLE && article.PUBLISHED_ON)
    .filter((article) => (sinceTs ? (article.PUBLISHED_ON ?? 0) > sinceTs : true))
    .sort((a, b) => (b.PUBLISHED_ON ?? 0) - (a.PUBLISHED_ON ?? 0))
    .slice(0, limit)
    .map((article) => {
      const { impact, isBreaking } = toImpact(article.PUBLISHED_ON);
      return {
        id: String(article.ID ?? article.GUID ?? article.URL ?? article.PUBLISHED_ON),
        title: article.TITLE ?? "",
        source: article.SOURCE_DATA?.NAME ?? "CoinDesk",
        timestamp: (article.PUBLISHED_ON ?? 0) * 1000,
        url: article.URL,
        sentiment: toSentiment(article.SENTIMENT),
        impact,
        isBreaking,
      };
    });
}

export function registerNewsRoutes(app: Express) {
  app.get("/api/competitions/:identifier/news", async (req: Request, res: Response) => {
    const parsed = querySchema.safeParse(req.query);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid news query", details: parsed.error.flatten() });
      return;
    }

    const competition = await resolveCompetition(req.params.identifier);
    if (!competition) {
      res.status(404).json({ error: "Competition not found" });
      return;
    }

    const providerLang = resolveProviderLang(parsed.data.lang);
    const languageFallback = parsed.data.lang === "zh" && providerLang === "EN";

    if (competition.status !== "live") {
      res.json({
        items: [],
        isLive: false,
        requestedLang: parsed.data.lang,
        providerLang,
        languageFallback,
      });
      return;
    }

    if (!COINDESK_NEWS_API_KEY) {
      res.status(503).json({ error: "CoinDesk news API key is not configured" });
      return;
    }

    try {
      const items = await fetchCoinDeskArticles(providerLang, parsed.data.limit, parsed.data.sinceTs);
      res.json({
        items,
        isLive: true,
        requestedLang: parsed.data.lang,
        providerLang,
        languageFallback,
      });
    } catch (error) {
      res.status(502).json({ error: (error as Error).message });
    }
  });
}

import type { Express, Request, Response } from "express";
import { z } from "zod";
import * as compDb from "./competition-db";
import { invokeLLM } from "./_core/llm";

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

type LocalNewsItem = {
  id: string;
  title: string;
  source: string;
  timestamp: number;
  url?: string;
  sentiment: "bullish" | "bearish" | "neutral";
  impact: "high" | "medium" | "low";
  isBreaking: boolean;
};

const translatedTitleCache = new Map<string, string>();

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

function getTextContent(content: string | Array<{ type: string; text?: string }>) {
  if (typeof content === "string") return content;
  return content
    .filter((part) => part.type === "text" && typeof part.text === "string")
    .map((part) => part.text)
    .join("\n");
}

async function translateTitleWithPublicFallback(title: string) {
  try {
    const params = new URLSearchParams({
      client: "gtx",
      sl: "en",
      tl: "zh-CN",
      dt: "t",
      q: title,
    });

    const response = await fetch(`https://translate.googleapis.com/translate_a/single?${params.toString()}`);
    if (!response.ok) {
      return null;
    }

    const payload = (await response.json()) as unknown;
    if (!Array.isArray(payload) || !Array.isArray(payload[0])) {
      return null;
    }

    const translated = payload[0]
      .map((part) => (Array.isArray(part) && typeof part[0] === "string" ? part[0] : ""))
      .join("")
      .trim();

    return translated || null;
  } catch {
    return null;
  }
}

async function translateTitlesToChinese(items: LocalNewsItem[]) {
  const missing = items.filter((item) => !translatedTitleCache.has(item.id));
  if (missing.length === 0) {
    return;
  }

  try {
    const result = await invokeLLM({
      messages: [
        {
          role: "system",
          content:
            "Translate crypto news headlines into concise Simplified Chinese. Keep tickers, company names, numbers, and market terms accurate. Return JSON only.",
        },
        {
          role: "user",
          content: JSON.stringify({
            items: missing.map((item) => ({
              id: item.id,
              title: item.title,
            })),
          }),
        },
      ],
      outputSchema: {
        name: "translated_news_titles",
        schema: {
          type: "object",
          additionalProperties: false,
          properties: {
            items: {
              type: "array",
              items: {
                type: "object",
                additionalProperties: false,
                properties: {
                  id: { type: "string" },
                  titleZh: { type: "string" },
                },
                required: ["id", "titleZh"],
              },
            },
          },
          required: ["items"],
        },
      },
    });

    const payload = JSON.parse(getTextContent(result.choices[0]?.message?.content ?? "{}")) as {
      items?: Array<{ id: string; titleZh: string }>;
    };

    for (const item of payload.items ?? []) {
      if (item.id && item.titleZh) {
        translatedTitleCache.set(item.id, item.titleZh.trim());
      }
    }
  } catch {
    // If translation is unavailable, keep the original English title.
  }

  const stillMissing = missing.filter((item) => !translatedTitleCache.has(item.id));
  if (stillMissing.length === 0) {
    return;
  }

  await Promise.all(
    stillMissing.map(async (item) => {
      const translated = await translateTitleWithPublicFallback(item.title);
      if (translated) {
        translatedTitleCache.set(item.id, translated);
      }
    }),
  );
}

async function fetchCoinDeskArticles(
  providerLang: string,
  requestedLang: "zh" | "en",
  limit: number,
  sinceTs?: number,
) {
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

  const items: LocalNewsItem[] = (payload.Data ?? [])
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

  if (requestedLang === "zh") {
    await translateTitlesToChinese(items);
    return items.map((item) => ({
      ...item,
      title: translatedTitleCache.get(item.id) ?? item.title,
    }));
  }

  return items;
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
      const items = await fetchCoinDeskArticles(
        providerLang,
        parsed.data.lang,
        parsed.data.limit,
        parsed.data.sinceTs,
      );
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

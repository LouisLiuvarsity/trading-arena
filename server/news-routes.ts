import type { Express, Request, Response } from "express";
import { z } from "zod";
import * as compDb from "./competition-db";
import { invokeLLM } from "./_core/llm";

const COINDESK_NEWS_API_BASE = "https://data-api.coindesk.com";
const COINDESK_NEWS_API_KEY =
  process.env.COINDESK_NEWS_API_KEY?.trim() ||
  "7844b9981bd7c27e1fee2fb4cd1be076618f019a0676dd69594da0bdf02199f6";

const listQuerySchema = z.object({
  lang: z.enum(["zh", "en"]).default("en"),
  limit: z.coerce.number().int().min(1).max(50).default(20),
  sinceTs: z.coerce.number().int().positive().optional(),
});

type CoinDeskArticle = {
  ID?: number;
  GUID?: string;
  TITLE?: string;
  SUBTITLE?: string | null;
  URL?: string;
  PUBLISHED_ON?: number;
  BODY?: string;
  AUTHORS?: string;
  SENTIMENT?: string;
  SOURCE_DATA?: {
    NAME?: string;
    SOURCE_KEY?: string;
  };
};

type LocalNewsItem = {
  id: string;
  title: string;
  source: string;
  timestamp: number;
  url?: string;
  guid?: string;
  sourceKey?: string;
  body?: string;
  authors?: string;
  sentiment: "bullish" | "bearish" | "neutral";
  impact: "high" | "medium" | "low";
  isBreaking: boolean;
};

const translatedTitleCache = new Map<string, string>();
const translatedBodyCache = new Map<string, string>();

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

async function translateWithPublicFallback(text: string) {
  try {
    const params = new URLSearchParams({
      client: "gtx",
      sl: "en",
      tl: "zh-CN",
      dt: "t",
      q: text,
    });

    const response = await fetch(`https://translate.googleapis.com/translate_a/single?${params.toString()}`);
    if (!response.ok) return null;

    const payload = (await response.json()) as unknown;
    if (!Array.isArray(payload) || !Array.isArray(payload[0])) return null;

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
  if (missing.length === 0) return;

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
    // Fall back to public translation below.
  }

  await Promise.all(
    missing
      .filter((item) => !translatedTitleCache.has(item.id))
      .map(async (item) => {
        const translated = await translateWithPublicFallback(item.title);
        if (translated) {
          translatedTitleCache.set(item.id, translated);
        }
      }),
  );
}

function chunkText(value: string, maxLength = 900) {
  const normalized = value.replace(/\r\n/g, "\n").trim();
  if (!normalized) return [];

  const chunks: string[] = [];
  let buffer = "";

  for (const paragraph of normalized.split(/\n{2,}/)) {
    const candidate = buffer ? `${buffer}\n\n${paragraph}` : paragraph;
    if (candidate.length <= maxLength) {
      buffer = candidate;
      continue;
    }

    if (buffer) {
      chunks.push(buffer);
      buffer = "";
    }

    if (paragraph.length <= maxLength) {
      buffer = paragraph;
      continue;
    }

    let start = 0;
    while (start < paragraph.length) {
      chunks.push(paragraph.slice(start, start + maxLength));
      start += maxLength;
    }
  }

  if (buffer) chunks.push(buffer);
  return chunks;
}

async function translateBodyWithPublicFallback(body: string) {
  const chunks = chunkText(body);
  if (chunks.length === 0) return null;

  const translatedChunks: string[] = [];
  for (const chunk of chunks) {
    const translated = await translateWithPublicFallback(chunk);
    if (!translated) return null;
    translatedChunks.push(translated);
  }

  return translatedChunks.join("\n\n");
}

async function translateArticleBodyToChinese(cacheKey: string, body: string) {
  if (!body.trim()) return body;

  const cached = translatedBodyCache.get(cacheKey);
  if (cached) return cached;

  try {
    const result = await invokeLLM({
      messages: [
        {
          role: "system",
          content:
            "Translate this crypto news article body into concise Simplified Chinese. Preserve numbers, tickers, names, and paragraph breaks. Return plain text only.",
        },
        {
          role: "user",
          content: body,
        },
      ],
      responseFormat: { type: "text" },
    });

    const translated = getTextContent(result.choices[0]?.message?.content ?? "").trim();
    if (translated) {
      translatedBodyCache.set(cacheKey, translated);
      return translated;
    }
  } catch {
    // Fall through.
  }

  const translatedFallback = await translateBodyWithPublicFallback(body);
  if (translatedFallback) {
    translatedBodyCache.set(cacheKey, translatedFallback);
    return translatedFallback;
  }

  return body;
}

async function parseCoinDeskResponse<T>(response: globalThis.Response): Promise<{ data?: T; err?: unknown }> {
  const raw = await response.text();
  try {
    const payload = raw ? JSON.parse(raw) : {};
    return {
      data: payload?.Data as T | undefined,
      err: payload?.Err,
    };
  } catch {
    return {};
  }
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

  const payload = await parseCoinDeskResponse<CoinDeskArticle[]>(response);
  if (!response.ok) {
    const message =
      typeof payload.err === "object" && payload.err !== null
        ? JSON.stringify(payload.err)
        : `CoinDesk news request failed (${response.status})`;
    throw new Error(message);
  }

  const items: LocalNewsItem[] = (payload.data ?? [])
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
        guid: article.GUID,
        sourceKey: article.SOURCE_DATA?.SOURCE_KEY,
        body: article.BODY ?? "",
        authors: article.AUTHORS ?? "",
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

async function fetchCoinDeskArticleDetail(
  sourceKey: string,
  guid: string,
  requestedLang: "zh" | "en",
) {
  const params = new URLSearchParams({
    api_key: COINDESK_NEWS_API_KEY,
    source_key: sourceKey,
    guid,
    extra_params: "trading-arena",
  });

  const response = await fetch(`${COINDESK_NEWS_API_BASE}/news/v1/article/get?${params.toString()}`, {
    headers: { Accept: "application/json" },
  });

  const payload = await parseCoinDeskResponse<CoinDeskArticle>(response);
  if (!response.ok || !payload.data) {
    const message =
      typeof payload.err === "object" && payload.err !== null
        ? JSON.stringify(payload.err)
        : `CoinDesk article request failed (${response.status})`;
    throw new Error(message);
  }

  const article = payload.data;
  const articleId = String(article.ID ?? article.GUID ?? article.URL ?? guid);
  let title = article.TITLE ?? "";
  let body = article.BODY ?? "";

  if (requestedLang === "zh") {
    const cachedTitle = translatedTitleCache.get(articleId);
    if (cachedTitle) {
      title = cachedTitle;
    } else {
      const translatedTitle = await translateWithPublicFallback(title);
      if (translatedTitle) {
        translatedTitleCache.set(articleId, translatedTitle);
        title = translatedTitle;
      }
    }

    body = await translateArticleBodyToChinese(articleId, body);
  }

  return {
    id: articleId,
    title,
    body,
    source: article.SOURCE_DATA?.NAME ?? "CoinDesk",
    authors: article.AUTHORS ?? "",
    timestamp: (article.PUBLISHED_ON ?? 0) * 1000,
    url: article.URL,
    guid: article.GUID,
    sourceKey: article.SOURCE_DATA?.SOURCE_KEY,
    sentiment: toSentiment(article.SENTIMENT),
  };
}

export function registerNewsRoutes(app: Express) {
  app.get("/api/competitions/:identifier/news", async (req: Request, res: Response) => {
    const parsed = listQuerySchema.safeParse(req.query);
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

  app.get("/api/competitions/:identifier/news/article", async (req: Request, res: Response) => {
    const competition = await resolveCompetition(req.params.identifier);
    if (!competition) {
      res.status(404).json({ error: "Competition not found" });
      return;
    }

    if (competition.status !== "live") {
      res.status(409).json({ error: "News is only available during live competitions" });
      return;
    }

    const lang = req.query.lang === "zh" ? "zh" : "en";
    const sourceKey = typeof req.query.sourceKey === "string" ? req.query.sourceKey.trim() : "";
    const guid = typeof req.query.guid === "string" ? req.query.guid.trim() : "";

    if (!sourceKey || !guid) {
      res.status(400).json({ error: "sourceKey and guid are required" });
      return;
    }

    try {
      const article = await fetchCoinDeskArticleDetail(sourceKey, guid, lang);
      res.json(article);
    } catch (error) {
      res.status(502).json({ error: (error as Error).message });
    }
  });
}

import { useEffect, useRef, useState } from "react";
import type { Lang } from "@/lib/i18n";
import { apiRequest } from "@/lib/api";
import type { NewsItem } from "@/lib/types";

type CompetitionNewsResponse = {
  items: NewsItem[];
  isLive: boolean;
  requestedLang: Lang;
  providerLang: string;
  languageFallback: boolean;
};

type UseCompetitionNewsOptions = {
  competitionId?: string;
  lang: Lang;
  enabled: boolean;
};

function mergeNewsItems(current: NewsItem[], incoming: NewsItem[]) {
  const merged = new Map<string, NewsItem>();

  for (const item of [...incoming, ...current]) {
    merged.set(item.id, item);
  }

  return Array.from(merged.values())
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, 20);
}

function getLatestTimestamp(items: NewsItem[]) {
  return items.reduce((latest, item) => Math.max(latest, item.timestamp), 0);
}

export function useCompetitionNews({ competitionId, lang, enabled }: UseCompetitionNewsOptions) {
  const [news, setNews] = useState<NewsItem[]>([]);
  const latestTimestampRef = useRef<number>(0);
  const requestVersionRef = useRef(0);

  useEffect(() => {
    if (!competitionId || !enabled) {
      setNews([]);
      latestTimestampRef.current = 0;
      return;
    }

    let disposed = false;

    const fetchNews = async (incremental: boolean) => {
      const requestVersion = ++requestVersionRef.current;
      const params = new URLSearchParams({
        lang,
        limit: "20",
      });

      if (incremental && latestTimestampRef.current > 0) {
        params.set("sinceTs", String(Math.floor(latestTimestampRef.current / 1000)));
      }

      try {
        const response = await apiRequest<CompetitionNewsResponse>(
          `/api/competitions/${competitionId}/news?${params.toString()}`,
        );

        if (disposed || requestVersion !== requestVersionRef.current) {
          return;
        }

        if (!response.isLive) {
          latestTimestampRef.current = 0;
          setNews([]);
          return;
        }

        setNews((current) => {
          const next = incremental ? mergeNewsItems(current, response.items) : response.items;
          latestTimestampRef.current = getLatestTimestamp(next);
          return next;
        });
      } catch {
        if (!incremental && !disposed && requestVersion === requestVersionRef.current) {
          latestTimestampRef.current = 0;
          setNews([]);
        }
      }
    };

    void fetchNews(false);

    const timer = window.setInterval(() => {
      if (!document.hidden) {
        void fetchNews(true);
      }
    }, 3 * 60 * 1000);

    const onVisibilityChange = () => {
      if (!document.hidden) {
        void fetchNews(true);
      }
    };

    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      disposed = true;
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [competitionId, enabled, lang]);

  return { news };
}

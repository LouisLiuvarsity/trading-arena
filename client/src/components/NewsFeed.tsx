import { memo, useState } from "react";
import { ArrowLeft, ExternalLink, X } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { apiRequest } from "@/lib/api";
import type { NewsItem } from "@/lib/types";
import { useT } from "@/lib/i18n";

interface Props {
  news: NewsItem[];
  competitionId?: string;
}

type NewsArticleDetail = Pick<
  NewsItem,
  "id" | "title" | "body" | "source" | "authors" | "timestamp" | "url" | "guid" | "sourceKey" | "sentiment"
>;

function NewsFeed({ news, competitionId }: Props) {
  const { t, lang } = useT();
  const [selected, setSelected] = useState<NewsArticleDetail | null>(null);
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const timeAgoLabel = (ts: number) => {
    const diff = Math.max(0, Math.floor((Date.now() - ts) / 1000));
    if (diff < 60) return lang === "zh" ? "刚刚" : "just now";
    if (diff < 3600) return lang === "zh" ? `${Math.floor(diff / 60)} 分钟前` : `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return lang === "zh" ? `${Math.floor(diff / 3600)} 小时前` : `${Math.floor(diff / 3600)}h ago`;
    return lang === "zh" ? `${Math.floor(diff / 86400)} 天前` : `${Math.floor(diff / 86400)}d ago`;
  };

  const openArticle = async (item: NewsItem) => {
    setSelected({
      id: item.id,
      title: item.title,
      body: item.body ?? "",
      source: item.source,
      authors: item.authors,
      timestamp: item.timestamp,
      url: item.url,
      guid: item.guid,
      sourceKey: item.sourceKey,
      sentiment: item.sentiment,
    });

    if (!competitionId || !item.sourceKey || !item.guid) {
      return;
    }

    setLoadingId(item.id);
    try {
      const detail = await apiRequest<NewsArticleDetail>(
        `/api/competitions/${competitionId}/news/article?lang=${lang}&sourceKey=${encodeURIComponent(item.sourceKey)}&guid=${encodeURIComponent(item.guid)}`,
      );
      setSelected(detail);
    } catch {
      // Keep the list payload if detail loading fails.
    } finally {
      setLoadingId((current) => (current === item.id ? null : current));
    }
  };

  const closeArticle = () => {
    setSelected(null);
    setLoadingId(null);
  };

  const sentimentLabel = (sentiment?: NewsItem["sentiment"]) => {
    if (sentiment === "bullish") return t("news.bullish");
    if (sentiment === "bearish") return t("news.bearish");
    return t("news.neutral");
  };

  if (selected) {
    const paragraphs = (selected.body ?? "")
      .split(/\n{2,}/)
      .map((part) => part.trim())
      .filter(Boolean);

    return (
      <div className="flex h-full min-h-0 flex-col overflow-hidden">
        <div className="flex items-start justify-between border-b border-[rgba(255,255,255,0.04)] px-3 py-2">
          <div className="min-w-0 flex-1">
            <button
              type="button"
              onClick={closeArticle}
              className="mb-2 inline-flex items-center gap-1 text-[10px] text-[#848E9C] transition-colors hover:text-[#D1D4DC]"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              {lang === "zh" ? "返回列表" : "Back to list"}
            </button>
            <h3 className="text-[13px] font-semibold leading-5 text-white">{selected.title}</h3>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-[10px] text-[#848E9C]">
              <span>{selected.source}</span>
              <span>•</span>
              <span>{timeAgoLabel(selected.timestamp)}</span>
              <span>•</span>
              <span
                className={
                  selected.sentiment === "bullish"
                    ? "text-[#0ECB81]"
                    : selected.sentiment === "bearish"
                      ? "text-[#F6465D]"
                      : "text-[#848E9C]"
                }
              >
                {sentimentLabel(selected.sentiment)}
              </span>
              {selected.authors ? (
                <>
                  <span>•</span>
                  <span>{selected.authors}</span>
                </>
              ) : null}
            </div>
          </div>
          <button
            type="button"
            onClick={closeArticle}
            className="ml-3 rounded-sm p-1 text-[#848E9C] transition-colors hover:bg-white/[0.04] hover:text-white"
            aria-label={lang === "zh" ? "关闭" : "Close"}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <ScrollArea className="min-h-0 flex-1">
          <div className="space-y-4 px-3 py-3">
            {loadingId === selected.id ? (
              <div className="text-[11px] text-[#848E9C]">{lang === "zh" ? "正在加载正文..." : "Loading article..."}</div>
            ) : null}

            {paragraphs.length > 0 ? (
              paragraphs.map((paragraph, index) => (
                <p key={`${selected.id}-${index}`} className="text-[11px] leading-6 text-[#D1D4DC] whitespace-pre-line">
                  {paragraph}
                </p>
              ))
            ) : (
              <div className="text-[11px] leading-6 text-[#848E9C]">
                {lang === "zh" ? "当前来源没有提供正文内容。可点击原文链接查看。" : "This source did not provide article body content. Open the original link to read more."}
              </div>
            )}

            {selected.url ? (
              <a
                href={selected.url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 rounded-sm border border-[rgba(255,255,255,0.08)] px-2.5 py-1.5 text-[10px] text-[#D1D4DC] transition-colors hover:bg-white/[0.03]"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                {lang === "zh" ? "打开原文" : "Open original"}
              </a>
            ) : null}
          </div>
        </ScrollArea>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      <div className="flex items-center justify-between border-b border-[rgba(255,255,255,0.04)] px-3 py-1">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-[#848E9C]">
            {t("news.title")}
          </span>
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#0ECB81]" />
          <span className="text-[9px] text-[#0ECB81]">{t("common.live")}</span>
        </div>
        <span className="text-[9px] text-[#848E9C]">{t("news.source")}</span>
      </div>

      <ScrollArea className="min-h-0 flex-1">
        <div className="space-y-0.5 p-1">
          {news.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => void openArticle(item)}
              className="w-full rounded-sm px-2 py-1.5 text-left transition-colors duration-200 hover:bg-white/[0.03]"
            >
              <div className="flex items-start gap-2">
                <div
                  className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${
                    item.sentiment === "bullish"
                      ? "bg-[#0ECB81] shadow-[0_0_4px_#0ECB81]"
                      : item.sentiment === "bearish"
                        ? "bg-[#F6465D] shadow-[0_0_4px_#F6465D]"
                        : "bg-[#848E9C]"
                  }`}
                />

                <div className="flex-1">
                  <div className="text-[11px] leading-snug text-[#D1D4DC]">{item.title}</div>
                  <div className="mt-0.5 flex flex-wrap items-center gap-2">
                    <span className="text-[9px] text-[#848E9C]">{item.source}</span>
                    <span className="text-[9px] text-[#848E9C]">•</span>
                    <span className="text-[9px] text-[#848E9C]">{timeAgoLabel(item.timestamp)}</span>
                    <span className="text-[9px] text-[#848E9C]">•</span>
                    <span
                      className={`text-[9px] font-medium ${
                        item.sentiment === "bullish"
                          ? "text-[#0ECB81]"
                          : item.sentiment === "bearish"
                            ? "text-[#F6465D]"
                            : "text-[#848E9C]"
                      }`}
                    >
                      {sentimentLabel(item.sentiment)}
                    </span>
                    <span className="text-[9px] text-[#677283]">
                      {lang === "zh" ? "点击展开全文" : "Click to read more"}
                    </span>
                  </div>
                </div>
              </div>
            </button>
          ))}

          {news.length === 0 ? (
            <div className="px-2 py-6 text-center text-[11px] text-[#848E9C]">
              {lang === "zh"
                ? "比赛进行中时会显示最近 50 条新闻。"
                : "The latest 50 articles appear while the competition is live."}
            </div>
          ) : null}
        </div>
      </ScrollArea>
    </div>
  );
}

export default memo(NewsFeed);

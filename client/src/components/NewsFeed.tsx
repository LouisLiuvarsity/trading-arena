import { memo } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { NewsItem } from "@/lib/types";
import { useT } from "@/lib/i18n";

interface Props {
  news: NewsItem[];
}

function NewsFeed({ news }: Props) {
  const { t, lang } = useT();

  const timeAgoLabel = (ts: number) => {
    const diff = Math.max(0, Math.floor((Date.now() - ts) / 1000));
    if (diff < 60) return lang === "zh" ? "刚刚" : "just now";
    if (diff < 3600) return lang === "zh" ? `${Math.floor(diff / 60)} 分钟前` : `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return lang === "zh" ? `${Math.floor(diff / 3600)} 小时前` : `${Math.floor(diff / 3600)}h ago`;
    return lang === "zh" ? `${Math.floor(diff / 86400)} 天前` : `${Math.floor(diff / 86400)}d ago`;
  };

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
            <div
              key={item.id}
              className="rounded-sm px-2 py-1.5 transition-colors duration-200 hover:bg-white/[0.03]"
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
                    {item.sentiment && (
                      <>
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
                          {item.sentiment === "bullish"
                            ? t("news.bullish")
                            : item.sentiment === "bearish"
                              ? t("news.bearish")
                              : t("news.neutral")}
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}

          {news.length === 0 && (
            <div className="px-2 py-6 text-center text-[11px] text-[#848E9C]">
              {lang === "zh"
                ? "比赛进行中时会显示最近 20 条新闻。"
                : "The latest 20 articles appear while the competition is live."}
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

export default memo(NewsFeed);

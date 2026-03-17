import { useEffect, useRef, useState, memo } from "react";
import type { NewsItem } from "@/lib/types";
import { useT } from "@/lib/i18n";

interface Props {
  news: NewsItem[];
}

function NewsTicker({ news }: Props) {
  const { t } = useT();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    if (!scrollRef.current || isPaused) return;
    const el = scrollRef.current;
    let animId: number;
    let pos = 0;

    const scroll = () => {
      pos += 0.5;
      if (pos >= el.scrollWidth / 2) pos = 0;
      el.scrollLeft = pos;
      animId = requestAnimationFrame(scroll);
    };

    animId = requestAnimationFrame(scroll);
    return () => cancelAnimationFrame(animId);
  }, [isPaused]);

  if (news.length === 0) return null;

  const items = [...news, ...news];

  const sentimentLabel = (sentiment?: NewsItem["sentiment"]) => {
    if (sentiment === "bullish") return t("news.bullish");
    if (sentiment === "bearish") return t("news.bearish");
    return t("news.neutral");
  };

  return (
    <div
      className="relative h-6 overflow-hidden border-b border-[rgba(255,255,255,0.04)] bg-[#0B0E11]/80"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      <div className="absolute bottom-0 left-0 top-0 z-10 flex w-8 items-center justify-center bg-gradient-to-r from-[#0B0E11] to-transparent">
        <span className="text-[9px] text-[#F0B90B]">📰</span>
      </div>

      <div ref={scrollRef} className="flex h-full items-center gap-8 overflow-hidden whitespace-nowrap pl-10 pr-4">
        {items.map((item, index) => (
          <div key={`${item.id}-${index}`} className="flex shrink-0 items-center gap-2">
            <span
              className={`rounded-sm px-1 py-0.5 text-[8px] font-medium ${
                item.sentiment === "bullish"
                  ? "bg-[#0ECB81]/12 text-[#0ECB81]"
                  : item.sentiment === "bearish"
                    ? "bg-[#F6465D]/12 text-[#F6465D]"
                    : "bg-white/[0.04] text-[#848E9C]"
              }`}
            >
              {sentimentLabel(item.sentiment)}
            </span>
            <span className="cursor-pointer text-[10px] text-[#D1D4DC]/80 transition-colors hover:text-white">
              {item.title}
            </span>
          </div>
        ))}
      </div>

      <div className="absolute bottom-0 right-0 top-0 z-10 w-8 bg-gradient-to-l from-[#0B0E11] to-transparent" />
    </div>
  );
}

export default memo(NewsTicker);

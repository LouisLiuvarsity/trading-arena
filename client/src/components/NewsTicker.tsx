// ============================================================
// News Ticker — Scrolling news banner below status bar
// Design: Horizontal scrolling tape with sentiment-colored dots
// High-impact news items flash to grab attention
// Acts as passive information disruption per blueprint
// ============================================================

import { useEffect, useRef, useState, memo } from 'react';
import type { NewsItem } from '@/lib/types';
import { useT } from '@/lib/i18n';

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

  return (
    <div
      className="relative h-6 bg-[#0B0E11]/80 border-b border-[rgba(255,255,255,0.04)] overflow-hidden"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-[#0B0E11] to-transparent z-10 flex items-center justify-center">
        <span className="text-[9px] text-[#F0B90B]">📰</span>
      </div>
      <div
        ref={scrollRef}
        className="flex items-center gap-8 h-full overflow-hidden whitespace-nowrap pl-10 pr-4"
      >
        {items.map((item, i) => {
          const isHigh = item.impact === 'high';
          const isBreaking = item.isBreaking;

          return (
            <div key={`${item.id}-${i}`} className="flex items-center gap-1.5 shrink-0">
              {/* Breaking badge */}
              {isBreaking && (
                <span className="text-[8px] font-bold text-[#F6465D] bg-[#F6465D]/15 px-1 py-0.5 rounded-sm animate-pulse tracking-wider">
                  {t('news.breaking')}
                </span>
              )}

              {/* Sentiment dot - glowing for high impact */}
              <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                item.sentiment === 'bullish'
                  ? `bg-[#0ECB81] ${isHigh ? 'shadow-[0_0_4px_#0ECB81]' : ''}`
                  : item.sentiment === 'bearish'
                  ? `bg-[#F6465D] ${isHigh ? 'shadow-[0_0_4px_#F6465D]' : ''}`
                  : 'bg-[#848E9C]'
              }`} />

              {/* Title - high impact items are brighter */}
              <span className={`text-[10px] transition-colors cursor-pointer ${
                isHigh
                  ? 'text-[#D1D4DC] font-medium hover:text-white'
                  : 'text-[#D1D4DC]/70 hover:text-[#D1D4DC]'
              }`}>
                {item.title}
              </span>

              {/* Impact indicator */}
              {isHigh && (
                <span className="text-[8px] text-[#F6465D] font-mono">●</span>
              )}

              <span className="text-[9px] text-[#848E9C]/40">{item.source}</span>
            </div>
          );
        })}
      </div>
      <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-[#0B0E11] to-transparent z-10" />
    </div>
  );
}

export default memo(NewsTicker);

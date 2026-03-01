// ============================================================
// News Ticker — Scrolling news banner below status bar
// Design: Horizontal scrolling tape with sentiment-colored dots
// Acts as passive information disruption per blueprint
// ============================================================

import { useEffect, useRef, useState } from 'react';
import type { NewsItem } from '@/lib/types';

interface Props {
  news: NewsItem[];
}

export default function NewsTicker({ news }: Props) {
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

  // Double the items for seamless loop
  const items = [...news, ...news];

  return (
    <div
      className="relative h-6 bg-[#0B0E11]/80 border-b border-[rgba(255,255,255,0.04)] overflow-hidden"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      <div className="absolute left-0 top-0 bottom-0 w-6 bg-gradient-to-r from-[#0B0E11] to-transparent z-10 flex items-center justify-center">
        <span className="text-[9px] text-[#F0B90B]">📰</span>
      </div>
      <div
        ref={scrollRef}
        className="flex items-center gap-8 h-full overflow-hidden whitespace-nowrap pl-8 pr-4"
      >
        {items.map((item, i) => (
          <div key={`${item.id}-${i}`} className="flex items-center gap-1.5 shrink-0">
            <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${
              item.sentiment === 'bullish' ? 'bg-[#0ECB81]' :
              item.sentiment === 'bearish' ? 'bg-[#F6465D]' :
              'bg-[#848E9C]'
            }`} />
            <span className="text-[10px] text-[#D1D4DC]/80 hover:text-[#D1D4DC] transition-colors cursor-pointer">
              {item.title}
            </span>
            <span className="text-[9px] text-[#848E9C]/50">{item.source}</span>
          </div>
        ))}
      </div>
      <div className="absolute right-0 top-0 bottom-0 w-6 bg-gradient-to-l from-[#0B0E11] to-transparent z-10" />
    </div>
  );
}

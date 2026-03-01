// ============================================================
// News Feed — Crypto news stream with emotional impact
// Design: High-impact news flash with sentiment colors,
// urgency indicators, and attention-grabbing animations
// ============================================================

import { useState, useEffect, memo } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { NewsItem } from '@/lib/types';

interface Props {
  news: NewsItem[];
}

function timeAgo(ts: number): string {
  const diff = (Date.now() - ts) / 1000;
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

const IMPACT_CONFIG = {
  high: {
    bg: 'bg-[#F6465D]/[0.06]',
    border: 'border-l-2 border-[#F6465D]/40',
    badge: 'bg-[#F6465D]/20 text-[#F6465D]',
    label: '🔴 HIGH IMPACT',
  },
  medium: {
    bg: 'bg-[#F0B90B]/[0.04]',
    border: 'border-l-2 border-[#F0B90B]/30',
    badge: 'bg-[#F0B90B]/15 text-[#F0B90B]',
    label: '🟡 MEDIUM',
  },
  low: {
    bg: '',
    border: '',
    badge: '',
    label: '',
  },
};

function NewsFeed({ news }: Props) {
  const [flashIndex, setFlashIndex] = useState<number | null>(null);

  // Simulate a "breaking news" flash effect periodically
  useEffect(() => {
    const interval = setInterval(() => {
      const highImpactIndices = news
        .map((n, i) => (n.impact === 'high' ? i : -1))
        .filter(i => i >= 0);
      if (highImpactIndices.length > 0) {
        const idx = highImpactIndices[Math.floor(Math.random() * highImpactIndices.length)];
        setFlashIndex(idx);
        setTimeout(() => setFlashIndex(null), 3000);
      }
    }, 30000 + Math.random() * 20000);

    return () => clearInterval(interval);
  }, [news]);

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-3 py-1 border-b border-[rgba(255,255,255,0.04)]">
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-[#848E9C] uppercase tracking-wider font-semibold">News Feed</span>
          <span className="w-1.5 h-1.5 rounded-full bg-[#0ECB81] animate-pulse" />
          <span className="text-[9px] text-[#0ECB81]">LIVE</span>
        </div>
        <span className="text-[9px] text-[#848E9C]">Binance News</span>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-1 space-y-0.5">
          {news.map((item, index) => {
            const impact = IMPACT_CONFIG[item.impact || 'low'];
            const isFlashing = flashIndex === index;

            return (
              <div
                key={item.id}
                className={`px-2 py-1.5 rounded-sm cursor-pointer transition-all duration-300 group
                  ${impact.bg} ${impact.border}
                  ${isFlashing ? 'animate-pulse ring-1 ring-[#F6465D]/40 bg-[#F6465D]/[0.08]' : ''}
                  hover:bg-white/[0.03]
                `}
              >
                <div className="flex items-start gap-2">
                  {/* Sentiment indicator */}
                  <div className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${
                    item.sentiment === 'bullish' ? 'bg-[#0ECB81] shadow-[0_0_4px_#0ECB81]' :
                    item.sentiment === 'bearish' ? 'bg-[#F6465D] shadow-[0_0_4px_#F6465D]' :
                    'bg-[#848E9C]'
                  }`} />

                  <div className="flex-1">
                    {/* Impact badge */}
                    {impact.label && (
                      <div className="mb-0.5">
                        <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded-sm ${impact.badge} uppercase tracking-wider`}>
                          {impact.label}
                        </span>
                      </div>
                    )}

                    {/* Title */}
                    <div className={`text-[11px] leading-snug transition-colors ${
                      item.impact === 'high' ? 'text-[#D1D4DC] font-medium' : 'text-[#D1D4DC]/80'
                    } group-hover:text-white`}>
                      {item.title}
                    </div>

                    {/* Meta */}
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[9px] text-[#848E9C]">{item.source}</span>
                      <span className="text-[9px] text-[#848E9C]">•</span>
                      <span className="text-[9px] text-[#848E9C]">{timeAgo(item.timestamp)}</span>
                      {item.sentiment && (
                        <>
                          <span className="text-[9px] text-[#848E9C]">•</span>
                          <span className={`text-[9px] font-medium ${
                            item.sentiment === 'bullish' ? 'text-[#0ECB81]' :
                            item.sentiment === 'bearish' ? 'text-[#F6465D]' :
                            'text-[#848E9C]'
                          }`}>
                            {item.sentiment === 'bullish' ? '↑ Bullish' : item.sentiment === 'bearish' ? '↓ Bearish' : 'Neutral'}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
}

export default memo(NewsFeed);

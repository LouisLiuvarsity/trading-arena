// ============================================================
// News Feed — Crypto news stream
// Design: Compact news items with sentiment indicators
// ============================================================

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

export default function NewsFeed({ news }: Props) {
  return (
    <div className="flex flex-col h-full">
      <div className="panel-header flex items-center justify-between">
        <span>News Feed</span>
        <span className="text-[10px] text-[#848E9C]">Binance News</span>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-1 space-y-0.5">
          {news.map(item => (
            <div
              key={item.id}
              className="px-2 py-1.5 rounded hover:bg-white/3 cursor-pointer transition-colors group"
            >
              <div className="flex items-start gap-2">
                {/* Sentiment dot */}
                <div className={`mt-1 w-1.5 h-1.5 rounded-full shrink-0 ${
                  item.sentiment === 'bullish' ? 'bg-[#0ECB81]' :
                  item.sentiment === 'bearish' ? 'bg-[#F6465D]' :
                  'bg-[#848E9C]'
                }`} />
                <div className="flex-1">
                  <div className="text-[11px] text-[#D1D4DC] leading-snug group-hover:text-white transition-colors">
                    {item.title}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[9px] text-[#848E9C]">{item.source}</span>
                    <span className="text-[9px] text-[#848E9C]">•</span>
                    <span className="text-[9px] text-[#848E9C]">{timeAgo(item.timestamp)}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}

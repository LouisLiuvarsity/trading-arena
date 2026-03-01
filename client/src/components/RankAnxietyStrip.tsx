// ============================================================
// Rank Anxiety Strip — Compact bottom strip showing rank pressure
// Design: Single-row anxiety-inducing strip with scrolling events
// Shows: rank stats + live scrolling rank change events
// ============================================================

import { memo, useState, useEffect, useRef } from 'react';
import type { AccountState, SocialData } from '@/lib/types';

interface RankEvent {
  id: string;
  text: string;
  type: 'danger' | 'warning' | 'positive' | 'neutral';
  timestamp: number;
}

interface Props {
  account: AccountState;
  social: SocialData;
}

const MOCK_USERNAMES = [
  'CryptoWhale', 'BearSlayer', 'MoonTrader', 'AlphaHunter', 'ScalpGod',
  'ChartMaster', 'DeFiKing', 'SwingPro', 'BTCMaxi', 'DeltaNeutral',
  'GammaSqueezer', 'VolumeKing', 'OrderFlow', 'SmartMoney', 'TrendRider',
];

function RankAnxietyStrip({ account, social }: Props) {
  const [events, setEvents] = useState<RankEvent[]>([]);
  const [overtakenCount, setOvertakenCount] = useState(social.tradersOvertakenYou);
  const [rankDropFlash, setRankDropFlash] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Generate rank change events periodically
  useEffect(() => {
    const generateEvent = (): RankEvent => {
      const rand = Math.random();
      const user = MOCK_USERNAMES[Math.floor(Math.random() * MOCK_USERNAMES.length)];
      const rankDelta = Math.floor(Math.random() * 8) + 1;

      if (rand < 0.35) {
        setOvertakenCount(prev => prev + 1);
        setRankDropFlash(true);
        setTimeout(() => setRankDropFlash(false), 1500);
        const msgs = [
          `⬇ ${user} 超越了你`,
          `⬇ ${user} 盈利交易后超越你`,
          `⬇ 被 ${user} 超越 (差${(Math.random() * 2 + 0.3).toFixed(1)}%)`,
        ];
        return {
          id: `evt-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
          text: msgs[Math.floor(Math.random() * msgs.length)],
          type: 'danger',
          timestamp: Date.now(),
        };
      } else if (rand < 0.48) {
        return {
          id: `evt-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
          text: `⬆ 你超越了 ${user}`,
          type: 'positive',
          timestamp: Date.now(),
        };
      } else if (rand < 0.70) {
        const msgs = [
          `⚡ 晋级线附近+${Math.floor(Math.random() * 3) + 1}人`,
          `🔥 #${280 + Math.floor(Math.random() * 40)} +${(Math.random() * 150 + 30).toFixed(0)}U`,
          `⚠ 晋级线收益率↑ +${(6 + Math.random() * 2).toFixed(1)}%`,
          `📊 5min内${Math.floor(Math.random() * 8) + 3}人排名变动>20名`,
          `🏃 ${Math.floor(Math.random() * 5) + 2}人正在追赶你`,
        ];
        return {
          id: `evt-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
          text: msgs[Math.floor(Math.random() * msgs.length)],
          type: 'warning',
          timestamp: Date.now(),
        };
      } else {
        const msgs = [
          `🚀 ${user} 从#${Math.floor(Math.random() * 200) + 200}冲到#${Math.floor(Math.random() * 100) + 100}`,
          `📉 ${user} 排名-${Math.floor(Math.random() * 30) + 5}名`,
          `💥 ${Math.floor(Math.random() * 5) + 2}人同时超越你附近选手`,
          `⏰ #${Math.max(1, account.rank - 5)}-#${account.rank + 5}竞争白热化`,
        ];
        return {
          id: `evt-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
          text: msgs[Math.floor(Math.random() * msgs.length)],
          type: 'neutral',
          timestamp: Date.now(),
        };
      }
    };

    const initial: RankEvent[] = [];
    for (let i = 0; i < 4; i++) initial.push(generateEvent());
    setEvents(initial);

    const interval = setInterval(() => {
      setEvents(prev => [...prev.slice(-25), generateEvent()]);
    }, 5000 + Math.random() * 5000);

    return () => clearInterval(interval);
  }, [account.rank, social.nearPromotionCount]);

  // Auto-scroll to latest event
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollLeft = containerRef.current.scrollWidth;
    }
  }, [events]);

  const typeStyles = {
    danger: 'text-[#F6465D] bg-[#F6465D]/8',
    warning: 'text-[#F0B90B] bg-[#F0B90B]/8',
    positive: 'text-[#0ECB81] bg-[#0ECB81]/8',
    neutral: 'text-[#848E9C] bg-white/[0.03]',
  };

  const latestEvent = events[events.length - 1];
  const isDanger = latestEvent?.type === 'danger';

  return (
    <div className={`flex items-center h-[26px] transition-colors duration-500 ${
      rankDropFlash
        ? 'bg-[#F6465D]/[0.06] border-t border-[#F6465D]/30'
        : isDanger
          ? 'bg-[#F6465D]/[0.03] border-t border-[#F6465D]/15'
          : 'bg-[#0B0E11] border-t border-[rgba(255,255,255,0.06)]'
    }`}>
      {/* Fixed left: Label + key stats */}
      <div className="shrink-0 flex items-center gap-2 px-2 border-r border-[rgba(255,255,255,0.06)]">
        <span className={`text-[9px] font-bold ${isDanger ? 'text-[#F6465D] animate-pulse' : 'text-[#848E9C]'}`}>
          ⚔️ RANK
        </span>
        <span className={`text-[9px] font-mono font-bold ${account.rank <= 300 ? 'text-[#0ECB81]' : 'text-[#F6465D]'}`}>
          #{account.rank}
        </span>
        <span className="text-[8px] text-[#848E9C]">|</span>
        <span className={`text-[9px] font-mono ${overtakenCount > 5 ? 'text-[#F6465D]' : 'text-[#F0B90B]'}`}>
          被超{overtakenCount}
        </span>
        <span className="text-[8px] text-[#848E9C]">|</span>
        <span className="text-[9px] font-mono text-[#848E9C]">
          {account.rank <= 300 ? (
            <span className="text-[#0ECB81]">安全+{300 - account.rank}</span>
          ) : (
            <span className="text-[#F6465D]">差{account.rank - 300}名</span>
          )}
        </span>
        <span className="text-[8px] text-[#848E9C]">|</span>
        <span className="text-[9px] font-mono text-[#F0B90B]">线附近{social.nearPromotionCount}人</span>
      </div>

      {/* Scrolling events */}
      <div
        ref={containerRef}
        className="flex-1 flex items-center gap-1 px-1.5 overflow-x-auto hide-scrollbar"
        style={{ scrollBehavior: 'smooth' }}
      >
        {events.slice(-8).map(event => (
          <div
            key={event.id}
            className={`shrink-0 px-1.5 py-0.5 rounded text-[8px] font-mono whitespace-nowrap ${typeStyles[event.type]}`}
          >
            {event.text}
          </div>
        ))}
      </div>

      {/* Live indicator */}
      <div className="shrink-0 flex items-center gap-1 px-2">
        <div className="w-1.5 h-1.5 rounded-full bg-[#F6465D] animate-pulse" />
        <span className="text-[7px] text-[#848E9C]">LIVE</span>
      </div>
    </div>
  );
}

export default memo(RankAnxietyStrip);

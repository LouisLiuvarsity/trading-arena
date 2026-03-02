// ============================================================
// Market Statistics Panel — Full competition statistics view
// Design: Dark trading theme with emotional pressure data
// Shows: L/S ratio, win rate, avg trades, PnL distribution,
// promotion zone density, streak data, crowd behavior
// ============================================================

import { memo, useState, useEffect } from 'react';
import { RANK_TIERS } from '@/lib/types';
import type { SocialData, AccountState, MatchState } from '@/lib/types';

interface Props {
  social: SocialData;
  account: AccountState;
  match: MatchState;
}

function MarketStats({ social, account, match }: Props) {
  // Animate numbers with slight random fluctuation for realism
  const [animatedSocial, setAnimatedSocial] = useState(social);

  useEffect(() => {
    const interval = setInterval(() => {
      setAnimatedSocial(prev => ({
        ...prev,
        longPct: Math.max(30, Math.min(70, prev.longPct + (Math.random() - 0.48) * 1.5)),
        shortPct: 0, // will be calculated
        profitablePct: Math.max(25, Math.min(55, prev.profitablePct + (Math.random() - 0.5) * 0.8)),
        avgTradesPerPerson: Math.max(8, prev.avgTradesPerPerson + (Math.random() - 0.4) * 0.3),
        nearPromotionCount: Math.max(30, Math.min(80, prev.nearPromotionCount + Math.floor((Math.random() - 0.45) * 3))),
        tradersOnLosingStreak: Math.max(50, Math.min(150, prev.tradersOnLosingStreak + Math.floor((Math.random() - 0.45) * 4))),
        activeTradersPct: Math.max(30, Math.min(70, prev.activeTradersPct + (Math.random() - 0.5) * 1)),
        recentTradeVolume: Math.max(10, prev.recentTradeVolume + Math.floor((Math.random() - 0.4) * 5)),
      }));
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const longPct = Math.round(animatedSocial.longPct * 10) / 10;
  const shortPct = Math.round((100 - longPct) * 10) / 10;
  const losingPct = Math.round((100 - animatedSocial.profitablePct) * 10) / 10;

  const elapsed = match.elapsed;
  const hoursElapsed = Math.floor(elapsed * 24);

  return (
    <div className="h-full overflow-y-auto custom-scrollbar bg-[#0B0E11]">
      {/* Header */}
      <div className="px-3 py-2 border-b border-[rgba(255,255,255,0.06)]">
        <div className="text-[11px] text-[#F0B90B] font-medium">📊 全场实时统计</div>
        <div className="text-[9px] text-[#848E9C] mt-0.5">
          比赛进行 {hoursElapsed}h / 24h · {match.participantCount} 名参赛者
        </div>
      </div>

      {/* Long/Short Ratio — Big visual */}
      <div className="px-3 py-2.5 border-b border-[rgba(255,255,255,0.06)]">
        <div className="text-[10px] text-[#848E9C] mb-1.5">多空比 (Long/Short)</div>
        <div className="flex items-center gap-2 mb-1.5">
          <span className="text-[#0ECB81] font-mono text-sm font-bold">{longPct}%</span>
          <div className="flex-1 h-3 bg-[#F6465D]/30 rounded-full overflow-hidden relative">
            <div
              className="h-full bg-[#0ECB81] rounded-full transition-all duration-1000"
              style={{ width: `${longPct}%` }}
            />
          </div>
          <span className="text-[#F6465D] font-mono text-sm font-bold">{shortPct}%</span>
        </div>
        <div className="flex justify-between text-[9px]">
          <span className="text-[#0ECB81]">
            做多 {Math.round(match.participantCount * longPct / 100)} 人
          </span>
          <span className={`font-mono ${social.longPctDelta > 0 ? 'text-[#0ECB81]' : 'text-[#F6465D]'}`}>
            5min: {social.longPctDelta > 0 ? '+' : ''}{social.longPctDelta.toFixed(1)}%
          </span>
          <span className="text-[#F6465D]">
            做空 {Math.round(match.participantCount * shortPct / 100)} 人
          </span>
        </div>
      </div>

      {/* Win/Loss Rate */}
      <div className="px-3 py-2.5 border-b border-[rgba(255,255,255,0.06)]">
        <div className="text-[10px] text-[#848E9C] mb-1.5">全场胜率</div>
        <div className="flex items-center gap-2 mb-1">
          <span className="text-[#0ECB81] font-mono text-sm font-bold">{animatedSocial.profitablePct.toFixed(1)}%</span>
          <div className="flex-1 h-3 bg-[#F6465D]/30 rounded-full overflow-hidden relative">
            <div
              className="h-full bg-[#0ECB81] rounded-full transition-all duration-1000"
              style={{ width: `${animatedSocial.profitablePct}%` }}
            />
          </div>
          <span className="text-[#F6465D] font-mono text-sm font-bold">{losingPct}%</span>
        </div>
        <div className="flex justify-between text-[9px]">
          <span className="text-[#0ECB81]">盈利 · 平均 +{social.avgProfitPct}%</span>
          <span className="text-[#F6465D]">亏损 · 平均 {social.avgLossPct}%</span>
        </div>
        {/* Your status */}
        <div className={`mt-1.5 px-2 py-1 rounded text-[9px] font-mono ${
          account.pnl >= 0 
            ? 'bg-[#0ECB81]/10 text-[#0ECB81] border border-[#0ECB81]/20' 
            : 'bg-[#F6465D]/10 text-[#F6465D] border border-[#F6465D]/20'
        }`}>
          你的状态: {account.pnl >= 0 ? '盈利' : '亏损'} {account.pnl >= 0 ? '+' : ''}{account.pnlPct.toFixed(2)}% ({account.pnl >= 0 ? '+' : ''}{account.pnl.toFixed(2)} U)
        </div>
      </div>

      {/* Trading Activity */}
      <div className="px-3 py-2.5 border-b border-[rgba(255,255,255,0.06)]">
        <div className="text-[10px] text-[#848E9C] mb-1.5">交易活跃度</div>
        <div className="grid grid-cols-2 gap-x-3 gap-y-1.5">
          <StatItem label="全场平均交易" value={`${animatedSocial.avgTradesPerPerson.toFixed(1)} 笔`} />
          <StatItem label="你的交易次数" value={`${account.tradesUsed} / ${account.tradesMax} 笔`} 
            highlight={account.tradesUsed < animatedSocial.avgTradesPerPerson} 
            highlightColor="yellow" />
          <StatItem label="当前持仓中" value={`${animatedSocial.activeTradersPct.toFixed(0)}% 选手`} />
          <StatItem label="5min 成交量" value={`${animatedSocial.recentTradeVolume} 笔`} />
          <StatItem label="中位数交易" value={`${social.medianTradesPerPerson} 笔`} />
          <StatItem label="主导方向" value={social.recentDirectionBias === 'long' ? '📈 做多' : social.recentDirectionBias === 'short' ? '📉 做空' : '➡️ 中性'} />
        </div>
        {/* Trade pace warning */}
        {account.tradesUsed < animatedSocial.avgTradesPerPerson - 2 && (
          <div className="mt-1.5 px-2 py-1 rounded bg-[#F0B90B]/10 border border-[#F0B90B]/20 text-[9px] text-[#F0B90B] animate-pulse">
            ⚠️ 你的交易频率低于平均水平 {(animatedSocial.avgTradesPerPerson - account.tradesUsed).toFixed(0)} 笔
          </div>
        )}
      </div>

      {/* Promotion Zone */}
      <div className="px-3 py-2.5 border-b border-[rgba(255,255,255,0.06)]">
        <div className="text-[10px] text-[#F0B90B] mb-1.5">⚡ 晋级线附近</div>
        <div className="grid grid-cols-2 gap-x-3 gap-y-1.5">
          <StatItem label="晋级线排名" value="#300" highlight highlightColor="gold" />
          <StatItem label="线附近人数" value={`${animatedSocial.nearPromotionCount} 人`} highlight highlightColor="gold" />
          <StatItem label="竞争区间" value={social.nearPromotionRange} />
          <StatItem label="10min 变化" value={`+${social.nearPromotionDelta} 人涌入`} highlight highlightColor="red" />
          <StatItem label="你的排名" value={`#${account.rank}`} 
            highlight={Math.abs(account.rank - 300) < 30}
            highlightColor={account.rank <= 300 ? 'green' : 'red'} />
          <StatItem label="距晋级线" value={
            account.rank <= 300 
              ? `安全 +${300 - account.rank} 名` 
              : `差 ${account.rank - 300} 名`
          } highlight highlightColor={account.rank <= 300 ? 'green' : 'red'} />
        </div>
      </div>

      {/* Streaks & Risk */}
      <div className="px-3 py-2.5 border-b border-[rgba(255,255,255,0.06)]">
        <div className="text-[10px] text-[#F6465D] mb-1.5">🔥 连亏统计</div>
        <div className="grid grid-cols-2 gap-x-3 gap-y-1.5">
          <StatItem label="3+连亏选手" value={`${animatedSocial.tradersOnLosingStreak} 人`} highlight highlightColor="red" />
          <StatItem label="最长连亏" value={`${social.consecutiveLossLeader} 连败`} highlight highlightColor="red" />
          <StatItem label="30min排名波动" value={`平均 ±${social.avgRankChange30m.toFixed(0)} 名`} />
          <StatItem label="超越你的人" value={`${social.tradersOvertakenYou} 人`} 
            highlight={social.tradersOvertakenYou > social.youOvertook}
            highlightColor="red" />
        </div>
      </div>

      {/* Rank Tier & Prize Eligibility */}
      <div className="px-3 py-2.5">
        <div className="text-[10px] text-[#848E9C] mb-1.5">🏅 段位 & 奖金资格</div>
        <div className="space-y-1">
          {RANK_TIERS.map((t, i) => {
            const isActive = account.rankTier === t.tier;
            return (
              <div key={i} className={`flex items-center justify-between px-2 py-1 rounded text-[9px] font-mono ${
                isActive ? 'border text-white' : 'text-[#848E9C]'
              }`} style={isActive ? { borderColor: `${t.color}60`, background: `${t.color}15` } : {}}>
                <span className="flex items-center gap-1.5">
                  <span>{t.icon}</span>
                  <span style={{ color: isActive ? t.color : undefined }}>{t.label}</span>
                  <span className="text-[#5E6673]">{t.leverage}x</span>
                </span>
                <span className="text-[#5E6673]">{t.minPoints}{t.maxPoints === Infinity ? '+' : `-${t.maxPoints}`}</span>
              </div>
            );
          })}
        </div>
        <div className="mt-1.5 text-[9px] text-[#848E9C]">
          奖金资格: <span style={{ color: account.prizeEligible ? '#0ECB81' : '#F6465D' }}>
            {account.prizeEligible ? `✓ 已完成 ${account.tradesUsed} 笔交易` : `✗ 需至少 5 笔交易 (当前 ${account.tradesUsed})`}
          </span>
        </div>
      </div>
    </div>
  );
}

// Reusable stat item
function StatItem({ label, value, highlight, highlightColor }: {
  label: string;
  value: string;
  highlight?: boolean;
  highlightColor?: 'red' | 'green' | 'yellow' | 'gold';
}) {
  const colorMap = {
    red: 'text-[#F6465D]',
    green: 'text-[#0ECB81]',
    yellow: 'text-[#F0B90B]',
    gold: 'text-[#F0B90B]',
  };
  return (
    <div className="flex flex-col">
      <span className="text-[8px] text-[#5E6673]">{label}</span>
      <span className={`text-[10px] font-mono tabular-nums ${
        highlight && highlightColor ? colorMap[highlightColor] : 'text-[#D1D4DC]'
      }`}>
        {value}
      </span>
    </div>
  );
}

export default memo(MarketStats);

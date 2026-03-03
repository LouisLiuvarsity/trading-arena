import { memo } from "react";
import { RANK_TIERS } from "@/lib/types";
import type { AccountState, MatchState, SocialData } from "@/lib/types";

interface Props {
  social: SocialData;
  account: AccountState;
  match: MatchState;
}

function MarketStats({ social, account, match }: Props) {
  const longPct = Math.round(social.longPct * 10) / 10;
  const shortPct = Math.round(social.shortPct * 10) / 10;
  const losingPct = Math.round(social.losingPct * 10) / 10;
  const hoursElapsed = Math.floor(match.elapsed * 24);

  return (
    <div className="h-full overflow-y-auto custom-scrollbar bg-[#0B0E11]">
      <div className="px-3 py-2 border-b border-[rgba(255,255,255,0.06)]">
        <div className="text-[11px] text-[#F0B90B] font-medium">📊 全场实时统计</div>
        <div className="text-[9px] text-[#848E9C] mt-0.5">
          比赛进行 {hoursElapsed}h / 24h · {match.participantCount} 名参赛者
        </div>
      </div>

      <div className="px-3 py-2.5 border-b border-[rgba(255,255,255,0.06)]">
        <div className="text-[10px] text-[#848E9C] mb-1.5">多空比 (Long/Short)</div>
        <div className="flex items-center gap-2 mb-1.5">
          <span className="text-[#0ECB81] font-mono text-sm font-bold">{longPct}%</span>
          <div className="flex-1 h-3 bg-[#F6465D]/30 rounded-full overflow-hidden relative">
            <div className="h-full bg-[#0ECB81] rounded-full transition-all duration-500" style={{ width: `${longPct}%` }} />
          </div>
          <span className="text-[#F6465D] font-mono text-sm font-bold">{shortPct}%</span>
        </div>
        <div className="flex justify-between text-[9px]">
          <span className="text-[#0ECB81]">做多 {Math.round(match.participantCount * longPct / 100)} 人</span>
          <span className={`font-mono ${social.longPctDelta > 0 ? "text-[#0ECB81]" : "text-[#F6465D]"}`}>
            5min: {social.longPctDelta > 0 ? "+" : ""}
            {social.longPctDelta.toFixed(1)}%
          </span>
          <span className="text-[#F6465D]">做空 {Math.round(match.participantCount * shortPct / 100)} 人</span>
        </div>
      </div>

      <div className="px-3 py-2.5 border-b border-[rgba(255,255,255,0.06)]">
        <div className="text-[10px] text-[#848E9C] mb-1.5">全场胜率</div>
        <div className="flex items-center gap-2 mb-1">
          <span className="text-[#0ECB81] font-mono text-sm font-bold">{social.profitablePct.toFixed(1)}%</span>
          <div className="flex-1 h-3 bg-[#F6465D]/30 rounded-full overflow-hidden relative">
            <div className="h-full bg-[#0ECB81] rounded-full transition-all duration-500" style={{ width: `${social.profitablePct}%` }} />
          </div>
          <span className="text-[#F6465D] font-mono text-sm font-bold">{losingPct}%</span>
        </div>
        <div className="flex justify-between text-[9px]">
          <span className="text-[#0ECB81]">盈利 · 平均 +{social.avgProfitPct}%</span>
          <span className="text-[#F6465D]">亏损 · 平均 {social.avgLossPct}%</span>
        </div>
      </div>

      <div className="px-3 py-2.5 border-b border-[rgba(255,255,255,0.06)]">
        <div className="text-[10px] text-[#848E9C] mb-1.5">交易活跃度</div>
        <div className="grid grid-cols-2 gap-x-3 gap-y-1.5">
          <StatItem label="全场平均交易" value={`${social.avgTradesPerPerson.toFixed(1)} 笔`} />
          <StatItem label="你的交易次数" value={`${account.tradesUsed} / ${account.tradesMax} 笔`} />
          <StatItem label="当前持仓中" value={`${social.activeTradersPct.toFixed(0)}% 选手`} />
          <StatItem label="5min 成交量" value={`${social.recentTradeVolume} 笔`} />
          <StatItem label="中位数交易" value={`${social.medianTradesPerPerson} 笔`} />
          <StatItem label="主导方向" value={social.recentDirectionBias === "long" ? "📈 做多" : social.recentDirectionBias === "short" ? "📉 做空" : "➡️ 中性"} />
        </div>
      </div>

      <div className="px-3 py-2.5 border-b border-[rgba(255,255,255,0.06)]">
        <div className="text-[10px] text-[#F0B90B] mb-1.5">⚡ 晋级线附近</div>
        <div className="grid grid-cols-2 gap-x-3 gap-y-1.5">
          <StatItem label="晋级线排名" value="#300" highlight highlightColor="gold" />
          <StatItem label="线附近人数" value={`${social.nearPromotionCount} 人`} highlight highlightColor="gold" />
          <StatItem label="竞争区间" value={social.nearPromotionRange} />
          <StatItem label="10min 变化" value={`${social.nearPromotionDelta > 0 ? "+" : ""}${social.nearPromotionDelta} 人`} />
          <StatItem label="你的排名" value={`#${account.rank}`} />
          <StatItem label="距晋级线" value={account.rank <= 300 ? `安全 +${300 - account.rank} 名` : `差 ${account.rank - 300} 名`} />
        </div>
      </div>

      <div className="px-3 py-2.5">
        <div className="text-[10px] text-[#848E9C] mb-1.5">🏅 段位 & 奖金资格</div>
        <div className="space-y-1">
          {RANK_TIERS.map(tier => {
            const isActive = account.rankTier === tier.tier;
            return (
              <div
                key={tier.tier}
                className={`flex items-center justify-between px-2 py-1 rounded text-[9px] font-mono ${
                  isActive ? "border text-white" : "text-[#848E9C]"
                }`}
                style={isActive ? { borderColor: `${tier.color}60`, background: `${tier.color}15` } : {}}
              >
                <span className="flex items-center gap-1.5">
                  <span>{tier.icon}</span>
                  <span style={{ color: isActive ? tier.color : undefined }}>{tier.label}</span>
                  <span className="text-[#5E6673]">{tier.leverage}x</span>
                </span>
                <span className="text-[#5E6673]">
                  {tier.minPoints}
                  {tier.maxPoints === Infinity ? "+" : `-${tier.maxPoints}`}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function StatItem({
  label,
  value,
  highlight,
  highlightColor,
}: {
  label: string;
  value: string;
  highlight?: boolean;
  highlightColor?: "red" | "green" | "yellow" | "gold";
}) {
  const colorMap = {
    red: "text-[#F6465D]",
    green: "text-[#0ECB81]",
    yellow: "text-[#F0B90B]",
    gold: "text-[#F0B90B]",
  };
  return (
    <div className="flex flex-col">
      <span className="text-[8px] text-[#5E6673]">{label}</span>
      <span className={`text-[10px] font-mono tabular-nums ${highlight && highlightColor ? colorMap[highlightColor] : "text-[#D1D4DC]"}`}>
        {value}
      </span>
    </div>
  );
}

export default memo(MarketStats);

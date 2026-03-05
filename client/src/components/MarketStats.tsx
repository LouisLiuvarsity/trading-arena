import { memo } from "react";
import { RANK_TIERS } from "@/lib/types";
import type { AccountState, MatchState, SocialData, PredictionState, PollVoteData, TickerData } from "@/lib/types";
import { useT } from "@/lib/i18n";

interface Props {
  social: SocialData;
  account: AccountState;
  match: MatchState;
  prediction?: PredictionState | null;
  pollData?: PollVoteData | null;
  ticker?: TickerData | null;
}

function MarketStats({ social, account, match, prediction, pollData, ticker }: Props) {
  const { t, lang } = useT();
  const longPct = Math.round(social.longPct * 10) / 10;
  const shortPct = Math.round(social.shortPct * 10) / 10;
  const losingPct = Math.round(social.losingPct * 10) / 10;
  const hoursElapsed = Math.floor(match.elapsed * 24);

  // Poll calculations
  const totalVotes = pollData ? pollData.longVotes + pollData.shortVotes + pollData.neutralVotes : 0;
  const longPollPct = totalVotes > 0 ? Math.round((pollData!.longVotes / totalVotes) * 100) : 0;
  const shortPollPct = totalVotes > 0 ? Math.round((pollData!.shortVotes / totalVotes) * 100) : 0;
  const neutralPollPct = totalVotes > 0 ? 100 - longPollPct - shortPollPct : 0;

  const voteLabel = (v: string | null) => {
    if (v === 'long') return t('stats.pollLong');
    if (v === 'short') return t('stats.pollShort');
    if (v === 'neutral') return t('stats.pollNeutral');
    return t('stats.noVote');
  };

  return (
    <div className="h-full overflow-y-auto custom-scrollbar bg-[#0B0E11]">
      <div className="px-3 py-2 border-b border-[rgba(255,255,255,0.06)]">
        <div className="text-[11px] text-[#F0B90B] font-medium">{t('stats.title')}</div>
        <div className="text-[9px] text-[#848E9C] mt-0.5">
          {t('stats.matchProgress', { h: hoursElapsed, n: match.participantCount })}
        </div>
      </div>

      <div className="px-3 py-2.5 border-b border-[rgba(255,255,255,0.06)]">
        <div className="text-[10px] text-[#848E9C] mb-1.5">{t('stats.longShort')}</div>
        <div className="flex items-center gap-2 mb-1.5">
          <span className="text-[#0ECB81] font-mono text-sm font-bold">{longPct}%</span>
          <div className="flex-1 h-3 bg-[#F6465D]/30 rounded-full overflow-hidden relative">
            <div className="h-full bg-[#0ECB81] rounded-full transition-all duration-500" style={{ width: `${longPct}%` }} />
          </div>
          <span className="text-[#F6465D] font-mono text-sm font-bold">{shortPct}%</span>
        </div>
        <div className="flex justify-between text-[9px]">
          <span className="text-[#0ECB81]">{t('stats.longCount', { n: Math.round(match.participantCount * longPct / 100) })}</span>
          <span className={`font-mono ${social.longPctDelta > 0 ? "text-[#0ECB81]" : "text-[#F6465D]"}`}>
            5min: {social.longPctDelta > 0 ? "+" : ""}
            {social.longPctDelta.toFixed(1)}%
          </span>
          <span className="text-[#F6465D]">{t('stats.shortCount', { n: Math.round(match.participantCount * shortPct / 100) })}</span>
        </div>
      </div>

      <div className="px-3 py-2.5 border-b border-[rgba(255,255,255,0.06)]">
        <div className="text-[10px] text-[#848E9C] mb-1.5">{t('stats.winRate')}</div>
        <div className="flex items-center gap-2 mb-1">
          <span className="text-[#0ECB81] font-mono text-sm font-bold">{social.profitablePct.toFixed(1)}%</span>
          <div className="flex-1 h-3 bg-[#F6465D]/30 rounded-full overflow-hidden relative">
            <div className="h-full bg-[#0ECB81] rounded-full transition-all duration-500" style={{ width: `${social.profitablePct}%` }} />
          </div>
          <span className="text-[#F6465D] font-mono text-sm font-bold">{losingPct}%</span>
        </div>
        <div className="flex justify-between text-[9px]">
          <span className="text-[#0ECB81]">{t('stats.profitAvg', { pct: social.avgProfitPct })}</span>
          <span className="text-[#F6465D]">{t('stats.lossAvg', { pct: social.avgLossPct })}</span>
        </div>
      </div>

      <div className="px-3 py-2.5 border-b border-[rgba(255,255,255,0.06)]">
        <div className="text-[10px] text-[#848E9C] mb-1.5">{t('stats.tradeActivity')}</div>
        <div className="grid grid-cols-2 gap-x-3 gap-y-1.5">
          <StatItem label={t('stats.avgTrades')} value={t('stats.tradesUnit', { n: social.avgTradesPerPerson.toFixed(1) })} />
          <StatItem label={t('stats.yourTrades')} value={t('stats.tradesOf', { used: account.tradesUsed, max: account.tradesMax })} />
          <StatItem label={t('stats.holdingPct')} value={t('stats.pctTraders', { pct: social.activeTradersPct.toFixed(0) })} />
          <StatItem label={t('stats.recentVol')} value={t('stats.tradesUnit', { n: social.recentTradeVolume })} />
          <StatItem label={t('stats.medianTrades')} value={t('stats.tradesUnit', { n: social.medianTradesPerPerson })} />
          <StatItem label={t('stats.dominantDir')} value={social.recentDirectionBias === "long" ? t('stats.dirLong') : social.recentDirectionBias === "short" ? t('stats.dirShort') : t('stats.dirNeutral')} />
        </div>
      </div>

      {/* Market Metrics — Funding Rate */}
      {ticker && (
        <div className="px-3 py-2.5 border-b border-[rgba(255,255,255,0.06)]">
          <div className="text-[10px] text-[#848E9C] mb-1.5">{t('stats.fundingRate')}</div>
          <div className="grid grid-cols-2 gap-x-3 gap-y-1.5">
            <StatItem
              label={t('stats.fundingRate')}
              value={ticker.fundingRate != null ? (ticker.fundingRate * 100).toFixed(4) + '%' : '—'}
              highlight
              highlightColor={ticker.fundingRate >= 0 ? 'green' : 'red'}
            />
            <StatItem
              label={t('stats.nextFunding')}
              value={(() => {
                if (!ticker.nextFundingTime) return '—';
                const diff = ticker.nextFundingTime - Date.now();
                if (diff <= 0) return '0:00';
                const h = Math.floor(diff / 3600000);
                const m = Math.floor((diff % 3600000) / 60000);
                return `${h}:${m.toString().padStart(2, '0')}`;
              })()}
            />
          </div>
        </div>
      )}

      {/* Prediction & Voting Stats */}
      <div className="px-3 py-2.5 border-b border-[rgba(255,255,255,0.06)]">
        <div className="text-[10px] text-[#F0B90B] mb-1.5">{t('stats.predVote')}</div>
        {totalVotes > 0 ? (
          <>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-[#0ECB81] font-mono text-[10px] font-bold">{longPollPct}%</span>
              <div className="flex-1 h-2 bg-[#848E9C]/20 rounded-full overflow-hidden flex">
                <div className="h-full bg-[#0ECB81] transition-all duration-500" style={{ width: `${longPollPct}%` }} />
                <div className="h-full bg-[#F0B90B] transition-all duration-500" style={{ width: `${neutralPollPct}%` }} />
                <div className="h-full bg-[#F6465D] transition-all duration-500" style={{ width: `${shortPollPct}%` }} />
              </div>
              <span className="text-[#F6465D] font-mono text-[10px] font-bold">{shortPollPct}%</span>
            </div>
            <div className="flex justify-between text-[9px] mb-1.5">
              <span className="text-[#0ECB81]">{t('stats.pollLong')} {longPollPct}%</span>
              <span className="text-[#F0B90B]">{t('stats.pollNeutral')} {neutralPollPct}%</span>
              <span className="text-[#F6465D]">{t('stats.pollShort')} {shortPollPct}%</span>
            </div>
            <div className="grid grid-cols-2 gap-x-3 gap-y-1.5">
              <StatItem label={t('stats.totalVotes')} value={String(totalVotes)} />
              <StatItem label={t('stats.yourVote')} value={voteLabel(pollData?.userVote ?? null)} highlight highlightColor={pollData?.userVote === 'long' ? 'green' : pollData?.userVote === 'short' ? 'red' : pollData?.userVote === 'neutral' ? 'gold' : undefined} />
            </div>
          </>
        ) : (
          <div className="text-[9px] text-[#5E6673]">{t('stats.noVoteData')}</div>
        )}

        {prediction ? (
          <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 mt-2 pt-2 border-t border-[rgba(255,255,255,0.04)]">
            <StatItem label={t('stats.predAccuracy')} value={`${prediction.stats.accuracy}%`} highlight highlightColor="gold" />
            <StatItem label={t('stats.predCorrect')} value={`${prediction.stats.correctPredictions}/${prediction.stats.totalPredictions}`} />
            <StatItem label={t('stats.predPending')} value={String(prediction.stats.pendingCount)} />
            <StatItem label={t('stats.predTotal')} value={String(prediction.stats.totalPredictions)} />
          </div>
        ) : (
          <div className="text-[9px] text-[#5E6673] mt-1.5">{t('stats.noPredData')}</div>
        )}
      </div>

      {/* Extra interesting stats */}
      <div className="px-3 py-2.5 border-b border-[rgba(255,255,255,0.06)]">
        <div className="text-[10px] text-[#848E9C] mb-1.5">{t('stats.extraTitle')}</div>
        <div className="grid grid-cols-2 gap-x-3 gap-y-1.5">
          <StatItem label={t('stats.lossStreak')} value={t('stats.lossStreakVal', { n: social.consecutiveLossLeader })} highlight highlightColor="red" />
          <StatItem label={t('stats.onStreak')} value={`${social.tradersOnLosingStreak}`} />
          <StatItem label={t('stats.avgRankChange')} value={`${social.avgRankChange30m > 0 ? '+' : ''}${social.avgRankChange30m.toFixed(1)}`} />
        </div>
      </div>

      <div className="px-3 py-2.5 border-b border-[rgba(255,255,255,0.06)]">
        <div className="text-[10px] text-[#F0B90B] mb-1.5">{t('stats.promotionNear')}</div>
        <div className="grid grid-cols-2 gap-x-3 gap-y-1.5">
          <StatItem label={t('stats.promotionRank')} value="#300" highlight highlightColor="gold" />
          <StatItem label={t('stats.nearCount')} value={t('stats.nearPeople', { n: social.nearPromotionCount })} highlight highlightColor="gold" />
          <StatItem label={t('stats.range')} value={social.nearPromotionRange} />
          <StatItem label={t('stats.tenMinChange')} value={`${social.nearPromotionDelta > 0 ? "+" : ""}${social.nearPromotionDelta} ${lang === 'zh' ? '人' : ''}`} />
          <StatItem label={t('stats.yourRank')} value={`#${account.rank}`} />
          <StatItem label={t('stats.distToPromo')} value={account.rank <= 300 ? t('stats.safe', { n: 300 - account.rank }) : t('stats.behind', { n: account.rank - 300 })} />
        </div>
      </div>

      <div className="px-3 py-2.5">
        <div className="text-[10px] text-[#848E9C] mb-1.5">{t('stats.tierTitle')}</div>
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
                  <span style={{ color: isActive ? tier.color : undefined }}>{lang === 'zh' ? tier.label : tier.labelEn}</span>
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

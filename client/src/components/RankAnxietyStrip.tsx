import { memo } from "react";
import type { AccountState, SocialData } from "@/lib/types";

interface Props {
  account: AccountState;
  social: SocialData;
}

function RankAnxietyStrip({ account, social }: Props) {
  const danger = account.rank > 300 || social.tradersOvertakenYou > social.youOvertook;
  return (
    <div
      className={`flex items-center h-[26px] border-t ${
        danger
          ? "bg-[#F6465D]/[0.04] border-[#F6465D]/20"
          : "bg-[#0B0E11] border-[rgba(255,255,255,0.06)]"
      }`}
    >
      <div className="shrink-0 flex items-center gap-2 px-2 border-r border-[rgba(255,255,255,0.06)]">
        <span className={`text-[9px] font-bold ${danger ? "text-[#F6465D]" : "text-[#848E9C]"}`}>⚔ RANK</span>
        <span className={`text-[9px] font-mono font-bold ${account.rank <= 300 ? "text-[#0ECB81]" : "text-[#F6465D]"}`}>
          #{account.rank}
        </span>
        <span className="text-[8px] text-[#848E9C]">|</span>
        <span className={`text-[9px] font-mono ${social.tradersOvertakenYou > 0 ? "text-[#F6465D]" : "text-[#848E9C]"}`}>
          被超 {social.tradersOvertakenYou}
        </span>
        <span className="text-[8px] text-[#848E9C]">|</span>
        <span className={`text-[9px] font-mono ${social.youOvertook > 0 ? "text-[#0ECB81]" : "text-[#848E9C]"}`}>
          超越 {social.youOvertook}
        </span>
      </div>

      <div className="flex-1 px-2 text-[9px] font-mono text-[#848E9C] overflow-hidden whitespace-nowrap">
        {account.rank <= 300 ? (
          <span className="text-[#0ECB81]">安全区 +{300 - account.rank} 名</span>
        ) : (
          <span className="text-[#F6465D]">距晋级线还差 {account.rank - 300} 名</span>
        )}
        <span className="mx-2 text-[#5E6673]">|</span>
        <span className="text-[#F0B90B]">线附近 {social.nearPromotionCount} 人</span>
        <span className="mx-2 text-[#5E6673]">|</span>
        <span className="text-[#848E9C]">5m 成交 {social.recentTradeVolume} 笔</span>
      </div>

      <div className="shrink-0 flex items-center gap-1 px-2">
        <div className={`w-1.5 h-1.5 rounded-full ${danger ? "bg-[#F6465D]" : "bg-[#0ECB81]"} animate-pulse`} />
        <span className="text-[7px] text-[#848E9C]">LIVE</span>
      </div>
    </div>
  );
}

export default memo(RankAnxietyStrip);

import { memo } from "react";
import type { AccountState, SocialData } from "@/lib/types";
import { useT } from "@/lib/i18n";

interface Props {
  account: AccountState;
  social: SocialData;
}

function RankAnxietyStrip({ account, social }: Props) {
  const { t } = useT();
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
        <span className={`text-[9px] font-bold ${danger ? "text-[#F6465D]" : "text-[#848E9C]"}`}>{t('rank.label')}</span>
        <span className={`text-[9px] font-mono font-bold ${account.rank <= 300 ? "text-[#0ECB81]" : "text-[#F6465D]"}`}>
          #{account.rank}
        </span>
        <span className="text-[8px] text-[#848E9C]">|</span>
        <span className={`text-[9px] font-mono ${social.tradersOvertakenYou > 0 ? "text-[#F6465D]" : "text-[#848E9C]"}`}>
          {t('rank.overtaken')} {social.tradersOvertakenYou}
        </span>
        <span className="text-[8px] text-[#848E9C]">|</span>
        <span className={`text-[9px] font-mono ${social.youOvertook > 0 ? "text-[#0ECB81]" : "text-[#848E9C]"}`}>
          {t('rank.overtook')} {social.youOvertook}
        </span>
      </div>

      <div className="flex-1 px-2 text-[9px] font-mono text-[#848E9C] overflow-hidden whitespace-nowrap">
        {account.rank <= 300 ? (
          <span className="text-[#0ECB81]">{t('rank.safe', { n: 300 - account.rank })}</span>
        ) : (
          <span className="text-[#F6465D]">{t('rank.behind', { n: account.rank - 300 })}</span>
        )}
        <span className="mx-2 text-[#5E6673]">|</span>
        <span className="text-[#F0B90B]">{t('rank.nearLine', { n: social.nearPromotionCount })}</span>
        <span className="mx-2 text-[#5E6673]">|</span>
        <span className="text-[#848E9C]">{t('rank.recentVol', { n: social.recentTradeVolume })}</span>
      </div>

      <div className="shrink-0 flex items-center gap-1 px-2">
        <div className={`w-1.5 h-1.5 rounded-full ${danger ? "bg-[#F6465D]" : "bg-[#0ECB81]"} animate-pulse`} />
        <span className="text-[7px] text-[#848E9C]">{t('common.live')}</span>
      </div>
    </div>
  );
}

export default memo(RankAnxietyStrip);

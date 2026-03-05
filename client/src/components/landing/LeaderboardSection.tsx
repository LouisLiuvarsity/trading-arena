import { useState } from 'react';
import { useT } from '@/lib/i18n';
import { motion } from 'framer-motion';
import { generateAllTimeLeaderboard } from '@/lib/mockData';
import { RANK_TIERS } from '@/lib/types';
import type { AllTimeLeaderboardEntry } from '@/lib/types';
import { BotBadge } from './shared';

function TierBadgeInline({ tier }: { tier: string }) {
  const { lang } = useT();
  const t = RANK_TIERS.find((r) => r.tier === tier);
  if (!t) return null;
  return (
    <span
      className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-medium"
      style={{ background: `${t.color}20`, color: t.color }}
    >
      {t.icon} {lang === 'zh' ? t.label : t.labelEn}
    </span>
  );
}

export default function LeaderboardSection() {
  const { t } = useT();
  const [entries] = useState<AllTimeLeaderboardEntry[]>(() => generateAllTimeLeaderboard());

  return (
    <section id="leaderboard" className="py-20 bg-[#0D1017]">
      <div className="max-w-5xl mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center"
        >
          <h2 className="text-2xl sm:text-3xl font-display font-bold text-white">
            {t('land.lb.title')}
          </h2>
          <p className="mt-2 text-[13px] text-[#848E9C]">
            {t('land.lb.seasonLabel')}
            <span className="mx-2 text-[#5E6673]">·</span>
            {t('land.lb.seasonSub')}
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.1 }}
          className="mt-10 bg-[#1C2030]/60 border border-white/[0.06] rounded-xl overflow-hidden"
        >
          <div className="overflow-x-auto">
            <table className="w-full text-[12px]">
              <thead>
                <tr className="text-[10px] text-[#5E6673] uppercase tracking-wider border-b border-white/[0.06]">
                  <th className="text-left pl-5 pr-2 py-3 w-12">#</th>
                  <th className="text-left px-2 py-3">{t('land.lb.player')}</th>
                  <th className="text-right px-2 py-3">{t('land.lb.seasonPts')}</th>
                  <th className="text-right px-2 py-3 hidden sm:table-cell">{t('land.lb.matches')}</th>
                  <th className="text-right px-2 py-3 hidden sm:table-cell">{t('land.lb.winRate')}</th>
                  <th className="text-center px-2 py-3 hidden md:table-cell">{t('land.lb.tier')}</th>
                  <th className="text-center pr-5 pl-2 py-3 hidden md:table-cell">{t('land.lb.grandFinal')}</th>
                </tr>
              </thead>
              <tbody>
                {entries.slice(0, 20).map((e) => (
                  <tr
                    key={e.rank}
                    className="border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors"
                  >
                    <td className="pl-5 pr-2 py-2.5 font-mono text-[#5E6673]">
                      {e.rank <= 3
                        ? ['🥇', '🥈', '🥉'][e.rank - 1]
                        : e.rank}
                    </td>
                    <td className="px-2 py-2.5 text-[#D1D4DC]">
                      <span className="flex items-center gap-1.5">
                        {e.username}
                        {e.isBot && <BotBadge />}
                      </span>
                    </td>
                    <td className="text-right px-2 py-2.5 font-mono font-bold text-[#F0B90B]">
                      {e.seasonPoints}
                    </td>
                    <td className="text-right px-2 py-2.5 font-mono text-[#D1D4DC] hidden sm:table-cell">
                      {e.matchesPlayed}
                    </td>
                    <td className="text-right px-2 py-2.5 font-mono text-[#D1D4DC] hidden sm:table-cell">
                      {e.winRate}%
                    </td>
                    <td className="text-center px-2 py-2.5 hidden md:table-cell">
                      <TierBadgeInline tier={e.rankTier} />
                    </td>
                    <td className="text-center pr-5 pl-2 py-2.5 hidden md:table-cell">
                      {e.grandFinalQualified ? (
                        <span className="text-[10px] font-bold text-[#0ECB81]">
                          {t('land.lb.qualified')}
                        </span>
                      ) : (
                        <span className="text-[10px] text-[#5E6673]">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="px-5 py-3 border-t border-white/[0.06] text-center">
            <span className="text-[11px] text-[#5E6673]">
              {t('land.lb.showTop50')}
            </span>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

import { useT } from '@/lib/i18n';
import { motion } from 'framer-motion';
import { REGULAR_PRIZE_TABLE, GRAND_FINAL_PRIZE_TABLE, MATCH_POINTS_TABLE } from '@/lib/types';

// Helper: find the season points for a given rank range
function getPointsForRank(rankMin: number, rankMax: number): string {
  for (const row of MATCH_POINTS_TABLE) {
    if (rankMin >= row.rankMin && rankMax <= row.rankMax) {
      return `${row.points}`;
    }
  }
  // If range spans multiple point tiers, show a range
  let minPts = 0, maxPts = 0;
  for (const row of MATCH_POINTS_TABLE) {
    if (rankMin >= row.rankMin && rankMin <= row.rankMax) maxPts = row.points;
    if (rankMax >= row.rankMin && rankMax <= row.rankMax) minPts = row.points;
  }
  if (minPts === maxPts) return `${minPts}`;
  return `${minPts}~${maxPts}`;
}

function PrizeTable({
  title,
  data,
  total,
}: {
  title: string;
  data: readonly { rankMin: number; rankMax: number; prize: number }[];
  total: number;
}) {
  const { t } = useT();

  return (
    <div className="bg-[#1C2030]/60 border border-white/[0.05] rounded-xl overflow-hidden">
      <div className="px-5 py-3.5 border-b border-white/[0.06]">
        <h3 className="text-[14px] font-semibold text-[#D1D4DC]">{title}</h3>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-[12px]">
          <thead>
            <tr className="text-[10px] text-[#5E6673] uppercase tracking-wider border-b border-white/[0.04]">
              <th className="text-left px-5 py-2.5">{t('land.prize.rank')}</th>
              <th className="text-center px-3 py-2.5">{t('land.prize.count')}</th>
              <th className="text-right px-3 py-2.5">{t('land.prize.perPerson')}</th>
              <th className="text-right px-5 py-2.5">{t('land.prize.seasonPts')}</th>
            </tr>
          </thead>
          <tbody>
            {data.map((row) => {
              const count = row.rankMax - row.rankMin + 1;
              const pts = getPointsForRank(row.rankMin, row.rankMax);
              const rankLabel = row.rankMin === row.rankMax
                ? `#${row.rankMin}`
                : `#${row.rankMin}-${row.rankMax}`;
              return (
                <tr
                  key={row.rankMin}
                  className="border-b border-white/[0.03] hover:bg-white/[0.02]"
                >
                  <td className="px-5 py-2.5 text-[#D1D4DC] font-medium">{rankLabel}</td>
                  <td className="text-center px-3 py-2.5 text-[#848E9C]">
                    {t('land.prize.people', { n: count })}
                  </td>
                  <td className="text-right px-3 py-2.5 text-[#F0B90B] font-mono">
                    {row.prize}U
                  </td>
                  <td className="text-right px-5 py-2.5 text-[#0ECB81] font-mono">
                    +{pts} pts
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="px-5 py-3 border-t border-white/[0.06] space-y-1">
        <div className="flex items-center justify-between">
          <span className="text-[11px] text-[#848E9C]">{t('land.prize.top100')}</span>
          <span className="text-[12px] font-bold text-[#F0B90B]">
            {t('land.prize.total', { n: total })}
          </span>
        </div>
        <p className="text-[10px] text-[#848E9C]/70">{t('land.prize.pointsNote')}</p>
      </div>
    </div>
  );
}

export default function PrizeSection() {
  const { t } = useT();

  return (
    <section id="prizes" className="py-20 bg-[#0D1017]">
      <div className="max-w-7xl mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center"
        >
          <h2 className="text-2xl sm:text-3xl font-display font-bold text-white">
            {t('land.prize.title')}
          </h2>
          <p className="mt-3 text-[14px] text-[#848E9C]">
            {t('land.prize.subtitle')}
          </p>
        </motion.div>

        <div className="mt-12 grid grid-cols-1 lg:grid-cols-2 gap-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <PrizeTable
              title={t('land.prize.regular')}
              data={REGULAR_PRIZE_TABLE}
              total={500}
            />
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
          >
            <PrizeTable
              title={t('land.prize.grand')}
              data={GRAND_FINAL_PRIZE_TABLE}
              total={2500}
            />
          </motion.div>
        </div>
      </div>
    </section>
  );
}

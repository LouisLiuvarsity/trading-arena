import { useT } from '@/lib/i18n';
import { motion } from 'framer-motion';
import { RANK_TIERS } from '@/lib/types';

export default function TierSection() {
  const { t, lang } = useT();

  return (
    <section id="tiers" className="py-20">
      <div className="max-w-7xl mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center"
        >
          <h2 className="text-2xl sm:text-3xl font-display font-bold text-white">
            {t('land.tier.title')}
          </h2>
          <p className="mt-3 text-[14px] text-[#848E9C] max-w-2xl mx-auto">
            {t('land.tier.desc', { decay: '0.8' })}
          </p>
        </motion.div>

        <div className="mt-12 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          {RANK_TIERS.map((tier, i) => (
            <motion.div
              key={tier.tier}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.05 }}
              className="bg-[#1C2030]/60 border border-white/[0.05] rounded-xl p-4 text-center hover:border-white/[0.1] transition-colors"
            >
              <div className="text-3xl">{tier.icon}</div>
              <h3
                className="mt-2 text-[14px] font-bold"
                style={{ color: tier.color }}
              >
                {lang === 'zh' ? tier.label : tier.labelEn}
              </h3>
              <p className="mt-1 text-[11px] text-[#848E9C]">
                {t('land.tier.leverage', { n: tier.leverage })}
              </p>
              <p className="mt-1 text-[10px] text-[#5E6673] font-mono">
                {tier.maxPoints === Infinity
                  ? `${tier.minPoints}+`
                  : `${tier.minPoints}-${tier.maxPoints}`}
                {' pts'}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

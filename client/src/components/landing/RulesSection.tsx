import { useT } from '@/lib/i18n';
import { motion } from 'framer-motion';
import { Shield, Activity, Sparkles, DollarSign, Star, Award } from 'lucide-react';

const RULES = [
  { icon: Shield,     color: '#F0B90B', key: 'card1' },
  { icon: Activity,   color: '#0ECB81', key: 'card2' },
  { icon: Sparkles,   color: '#F0B90B', key: 'card3' },
  { icon: DollarSign, color: '#0ECB81', key: 'card4' },
  { icon: Star,       color: '#F0B90B', key: 'card5' },
  { icon: Award,      color: '#0ECB81', key: 'card6' },
] as const;

export default function RulesSection() {
  const { t } = useT();

  return (
    <section id="rules" className="py-20">
      <div className="max-w-7xl mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center"
        >
          <h2 className="text-2xl sm:text-3xl font-display font-bold text-white">
            {t('land.rules.title')}
          </h2>
          <p className="mt-3 text-[14px] text-[#848E9C]">
            {t('land.rules.subtitle')}
          </p>
        </motion.div>

        <div className="mt-12 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {RULES.map(({ icon: Icon, color, key }, i) => (
            <motion.div
              key={key}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.05 }}
              className="bg-[#1C2030]/60 border border-white/[0.05] rounded-xl p-5 hover:border-white/[0.1] transition-colors"
            >
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center"
                style={{ background: `${color}15` }}
              >
                <Icon className="w-5 h-5" style={{ color }} />
              </div>
              <h3 className="mt-3 text-[15px] font-semibold text-[#D1D4DC]">
                {t(`land.rules.${key}.title`, { n: '5' })}
              </h3>
              <p className="mt-1.5 text-[12px] text-[#848E9C] leading-relaxed">
                {t(`land.rules.${key}.desc`, { n: '5' })}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

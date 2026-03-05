import { useT } from '@/lib/i18n';
import { motion } from 'framer-motion';
import { UserPlus, Zap, Award } from 'lucide-react';

const STEPS = [
  { icon: UserPlus, color: '#F0B90B', key: 'step1' },
  { icon: Zap,      color: '#0ECB81', key: 'step2' },
  { icon: Award,    color: '#F0B90B', key: 'step3' },
] as const;

export default function HowItWorks() {
  const { t } = useT();

  return (
    <section id="how-it-works" className="py-20 bg-[#0D1017]">
      <div className="max-w-7xl mx-auto px-6">
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-2xl sm:text-3xl font-display font-bold text-white text-center"
        >
          {t('land.about.title')}
        </motion.h2>

        <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-8">
          {STEPS.map(({ icon: Icon, color, key }, i) => (
            <motion.div
              key={key}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="text-center"
            >
              <div
                className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto"
                style={{ background: `${color}15` }}
              >
                <Icon className="w-6 h-6" style={{ color }} />
              </div>
              <div className="mt-1 mb-3">
                <span className="text-[10px] font-bold text-[#5E6673] uppercase tracking-wider">
                  STEP {i + 1}
                </span>
              </div>
              <h3 className="text-lg font-semibold text-[#D1D4DC]">
                {t(`land.about.${key}.title`)}
              </h3>
              <p className="mt-2 text-[13px] text-[#848E9C] leading-relaxed max-w-xs mx-auto">
                {t(`land.about.${key}.desc`)}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

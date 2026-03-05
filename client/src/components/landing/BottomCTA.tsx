import { useT } from '@/lib/i18n';
import { motion } from 'framer-motion';
import { Link } from 'wouter';

export default function BottomCTA() {
  const { t } = useT();

  return (
    <section className="py-20">
      <div className="max-w-7xl mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center bg-gradient-to-b from-[#F0B90B]/[0.06] to-transparent border border-[#F0B90B]/10 rounded-2xl px-6 py-16"
        >
          <h2 className="text-2xl sm:text-3xl font-display font-bold text-white">
            {t('land.cta.title')}
          </h2>
          <p className="mt-4 text-[14px] text-[#848E9C] max-w-lg mx-auto">
            {t('land.cta.desc')}
          </p>
          <Link
            href="/login?mode=register"
            className="inline-block mt-8 px-10 py-3.5 bg-[#F0B90B] hover:bg-[#F0B90B]/90 text-[#0B0E11] rounded-lg text-base font-bold transition-colors"
          >
            {t('land.cta.btn')}
          </Link>
        </motion.div>
      </div>
    </section>
  );
}

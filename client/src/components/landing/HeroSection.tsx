import { useT } from '@/lib/i18n';
import { motion } from 'framer-motion';
import { Link } from 'wouter';
import { DollarSign, Trophy, Clock, Users } from 'lucide-react';

const VALUE_PROPS = [
  { value: '5,000U', icon: DollarSign, key: 'stat1' },
  { value: '500U',   icon: Trophy,     key: 'stat2' },
  { value: '15+1',   icon: Clock,      key: 'stat3' },
  { value: '24H',    icon: Users,      key: 'stat4' },
] as const;

export default function HeroSection() {
  const { t } = useT();

  return (
    <section className="relative pt-28 lg:pt-36 pb-20 min-h-[calc(100vh-64px)] flex items-center">
      {/* Background decoration */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-[#F0B90B]/[0.03] rounded-full blur-[120px]" />
      </div>

      <div className="relative max-w-7xl mx-auto px-6 w-full text-center">
        {/* Title */}
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-3xl sm:text-4xl lg:text-6xl font-display font-bold text-white leading-tight"
        >
          {t('land.hero.title').split('交易竞技场').length > 1 ? (
            <>
              {t('land.hero.title').split('交易竞技场')[0]}
              <span className="text-[#F0B90B]">交易竞技场</span>
            </>
          ) : t('land.hero.title').split('Trading Arena').length > 1 ? (
            <>
              {t('land.hero.title').split('Trading Arena')[0]}
              <span className="text-[#F0B90B]">Trading Arena</span>
            </>
          ) : (
            <span>{t('land.hero.title')}</span>
          )}
        </motion.h1>

        {/* Subtitle */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="mt-5 text-base sm:text-lg text-[#848E9C] leading-relaxed max-w-2xl mx-auto"
        >
          {t('land.hero.subtitle')}
        </motion.p>

        {/* 4 Value Props */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="mt-10 flex flex-wrap justify-center gap-4 sm:gap-6"
        >
          {VALUE_PROPS.map(({ value, icon: Icon, key }) => (
            <div
              key={key}
              className="flex items-center gap-2 px-4 py-2.5 bg-[#1C2030]/60 border border-white/[0.05] rounded-xl backdrop-blur-sm"
            >
              <Icon className="w-4 h-4 text-[#F0B90B]" />
              <span className="text-white font-bold text-sm">{value}</span>
              <span className="text-[11px] text-[#5E6673]">{t(`land.hero.${key}`)}</span>
            </div>
          ))}
        </motion.div>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.35 }}
          className="mt-10"
        >
          <Link
            href="/login?mode=register"
            className="inline-block px-10 py-3.5 bg-[#F0B90B] hover:bg-[#F0B90B]/90 text-[#0B0E11] rounded-lg text-base font-bold transition-colors"
          >
            {t('land.hero.registerCta')}
          </Link>
          <p className="mt-3 text-[13px] text-[#5E6673]">
            {t('land.hero.loginCta')}?{' '}
            <Link href="/login" className="text-[#F0B90B] hover:text-[#F0B90B]/80 transition-colors">
              {t('land.hero.loginCta')}
            </Link>
          </p>
        </motion.div>
      </div>
    </section>
  );
}

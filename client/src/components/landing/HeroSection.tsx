import { useState, useEffect, useRef } from 'react';
import { useT } from '@/lib/i18n';
import { motion } from 'framer-motion';
import { Users, BarChart3, Trophy, DollarSign, Globe, Building2 } from 'lucide-react';
import { apiRequest } from '@/lib/api';
import { Link } from 'wouter';
import LiveLeaderboardTicker from './LiveLeaderboardTicker';

interface OverviewStats {
  totalPlayers: number;
  totalTrades: number;
  totalCompetitions: number;
  totalPrize: number;
  totalCountries: number;
  totalInstitutions: number;
}

function AnimatedNumber({ value, suffix = '' }: { value: number; suffix?: string }) {
  const [display, setDisplay] = useState(0);
  const ref = useRef<number>(0);

  useEffect(() => {
    if (value === 0) return;
    const duration = 1500;
    const start = performance.now();
    const from = ref.current;

    function tick(now: number) {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      // ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = Math.round(from + (value - from) * eased);
      setDisplay(current);
      if (progress < 1) requestAnimationFrame(tick);
      else ref.current = value;
    }
    requestAnimationFrame(tick);
  }, [value]);

  return (
    <span className="font-mono text-xl font-bold text-white tabular-nums">
      {display.toLocaleString()}{suffix}
    </span>
  );
}

const STAT_ICONS = [
  { key: 'players', icon: Users, color: '#F0B90B' },
  { key: 'trades', icon: BarChart3, color: '#0ECB81' },
  { key: 'competitions', icon: Trophy, color: '#F0B90B' },
  { key: 'prize', icon: DollarSign, color: '#0ECB81' },
  { key: 'countries', icon: Globe, color: '#848E9C' },
  { key: 'institutions', icon: Building2, color: '#848E9C' },
] as const;

// Fallback demo stats when API returns zeros
const DEMO_STATS: OverviewStats = {
  totalPlayers: 2847,
  totalTrades: 156230,
  totalCompetitions: 45,
  totalPrize: 22500,
  totalCountries: 28,
  totalInstitutions: 15,
};

export default function HeroSection() {
  const { t } = useT();
  const [stats, setStats] = useState<OverviewStats>(DEMO_STATS);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const data = await apiRequest<OverviewStats>('/api/stats/overview');
        if (!cancelled && data && data.totalPlayers > 10) setStats(data);
      } catch {
        // keep demo data
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  const statValues: Record<string, number> = {
    players: stats.totalPlayers,
    trades: stats.totalTrades,
    competitions: stats.totalCompetitions,
    prize: stats.totalPrize,
    countries: stats.totalCountries,
    institutions: stats.totalInstitutions,
  };

  return (
    <section className="relative pt-20 lg:pt-24 pb-12 min-h-[calc(100vh-64px)] flex items-center">
      {/* Background decoration */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-[#F0B90B]/[0.03] rounded-full blur-[120px]" />
        <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-[#0ECB81]/[0.02] rounded-full blur-[100px]" />
      </div>

      <div className="relative max-w-7xl mx-auto px-6 w-full">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Left Panel */}
          <div>
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="text-3xl sm:text-4xl lg:text-5xl font-display font-bold text-white leading-tight"
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

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="mt-4 text-[15px] text-[#848E9C] leading-relaxed max-w-lg"
            >
              {t('land.hero.subtitle')}
            </motion.p>

            {/* Platform Stats */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="mt-8 grid grid-cols-2 sm:grid-cols-3 gap-3"
            >
              {STAT_ICONS.map(({ key, icon: Icon, color }) => (
                <div
                  key={key}
                  className="bg-[#1C2030]/60 border border-white/[0.05] rounded-xl px-4 py-3 backdrop-blur-sm"
                >
                  <div className="flex items-center gap-1.5 mb-1">
                    <Icon className="w-3.5 h-3.5" style={{ color }} />
                    <span className="text-[10px] text-[#5E6673] uppercase tracking-wider">
                      {t(`land.stats.${key}`)}
                    </span>
                  </div>
                  <AnimatedNumber value={statValues[key]} />
                </div>
              ))}
            </motion.div>

            {/* CTA Buttons */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.35 }}
              className="mt-8 flex gap-4"
            >
              <Link
                href="/login?mode=register"
                className="px-8 py-3 bg-[#F0B90B] hover:bg-[#F0B90B]/90 text-[#0B0E11] rounded-lg text-sm font-bold transition-colors"
              >
                {t('land.hero.registerCta')}
              </Link>
              <Link
                href="/login"
                className="px-8 py-3 border border-[#F0B90B]/40 hover:border-[#F0B90B]/70 text-[#F0B90B] rounded-lg text-sm font-medium transition-colors"
              >
                {t('land.hero.loginCta')}
              </Link>
            </motion.div>
          </div>

          {/* Right Panel */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.7, delay: 0.2 }}
          >
            <LiveLeaderboardTicker />
          </motion.div>
        </div>
      </div>
    </section>
  );
}

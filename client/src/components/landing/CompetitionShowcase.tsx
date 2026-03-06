import { useState, useEffect, useCallback } from 'react';
import { Link } from 'wouter';
import { useT } from '@/lib/i18n';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, Trophy, Users, Clock, Coins, Star, Zap } from 'lucide-react';

interface CompetitionCard {
  id: number;
  slug: string;
  title: string;
  competitionType: string;
  status: string;
  prizePool: number;
  symbol: string;
  startTime: number;
  endTime: number;
  registeredCount: number;
  maxParticipants: number;
}

interface ShowcaseData {
  season: { id: number; name: string; slug: string } | null;
  live: CompetitionCard[];
  upcoming: CompetitionCard[];
  completed: CompetitionCard[];
}

const STATUS_CONFIG: Record<string, { label: string; labelEn: string; color: string; bg: string }> = {
  live: { label: '进行中', labelEn: 'LIVE', color: '#0ECB81', bg: 'rgba(14,203,129,0.15)' },
  announced: { label: '已公布', labelEn: 'Announced', color: '#F0B90B', bg: 'rgba(240,185,11,0.15)' },
  registration_open: { label: '报名中', labelEn: 'Open', color: '#F0B90B', bg: 'rgba(240,185,11,0.15)' },
  registration_closed: { label: '报名截止', labelEn: 'Closed', color: '#848E9C', bg: 'rgba(132,142,156,0.15)' },
  completed: { label: '已结束', labelEn: 'Done', color: '#5E6673', bg: 'rgba(94,102,115,0.15)' },
  settling: { label: '结算中', labelEn: 'Settling', color: '#848E9C', bg: 'rgba(132,142,156,0.15)' },
};

const TYPE_ICONS: Record<string, string> = {
  regular: '',
  grand_final: '',
  special: '',
  practice: '',
};

function formatTime(ts: number): string {
  return new Date(ts).toLocaleString('zh-CN', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function CompetitionCardView({ card, index }: { card: CompetitionCard; index: number }) {
  const statusConf = STATUS_CONFIG[card.status] ?? STATUS_CONFIG.completed;
  const isLive = card.status === 'live';
  const baseAsset = card.symbol.replace(/USDT|USDC/, '');

  // Gradient backgrounds based on competition type
  const gradients: Record<string, string> = {
    grand_final: 'from-[#F0B90B]/20 via-[#FF6B35]/10 to-transparent',
    special: 'from-[#8B5CF6]/20 via-[#6366F1]/10 to-transparent',
    regular: 'from-[#0ECB81]/10 via-[#0ECB81]/5 to-transparent',
    practice: 'from-[#848E9C]/10 via-[#848E9C]/5 to-transparent',
  };

  return (
    <div className={`relative w-full bg-[#1C2030] border border-white/[0.08] rounded-2xl overflow-hidden ${
      isLive ? 'ring-1 ring-[#0ECB81]/30' : ''
    }`}>
      {/* Top gradient decoration */}
      <div className={`absolute inset-0 bg-gradient-to-b ${gradients[card.competitionType] ?? gradients.regular} pointer-events-none`} />

      {/* Card content */}
      <div className="relative p-5 space-y-4">
        {/* Status + Type badges */}
        <div className="flex items-center justify-between">
          <span
            className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-bold rounded-full"
            style={{ backgroundColor: statusConf.bg, color: statusConf.color }}
          >
            {isLive && <span className="w-2 h-2 rounded-full bg-current animate-pulse" />}
            {statusConf.label}
          </span>
          <span className="text-[10px] text-[#848E9C] font-mono">
            {TYPE_ICONS[card.competitionType]} {card.competitionType === 'grand_final' ? 'Grand Final' : card.competitionType}
          </span>
        </div>

        {/* Title */}
        <h3 className="text-lg font-display font-bold text-white leading-snug">
          {card.title}
        </h3>

        {/* Key info grid */}
        <div className="grid grid-cols-2 gap-3">
          <div className="flex items-center gap-2">
            <Clock className="w-3.5 h-3.5 text-[#848E9C]" />
            <div>
              <div className="text-[10px] text-[#848E9C]">Time</div>
              <div className="text-[11px] text-[#D1D4DC] font-mono">{formatTime(card.startTime)}</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Zap className="w-3.5 h-3.5 text-[#F0B90B]" />
            <div>
              <div className="text-[10px] text-[#848E9C]">Pair</div>
              <div className="text-[11px] text-[#D1D4DC] font-mono font-bold">{baseAsset}/USDT</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Users className="w-3.5 h-3.5 text-[#0ECB81]" />
            <div>
              <div className="text-[10px] text-[#848E9C]">Players</div>
              <div className="text-[11px] text-[#D1D4DC] font-mono">{card.registeredCount}/{card.maxParticipants}</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Coins className="w-3.5 h-3.5 text-[#F0B90B]" />
            <div>
              <div className="text-[10px] text-[#848E9C]">Prize Pool</div>
              <div className="text-[11px] text-[#F0B90B] font-mono font-bold">{card.prizePool}U</div>
            </div>
          </div>
        </div>

        {/* Tags */}
        <div className="flex items-center gap-2 flex-wrap">
          {card.prizePool > 0 && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-[#F0B90B]/10 text-[#F0B90B] text-[10px] font-medium rounded-full">
              <Trophy className="w-3 h-3" /> Prize
            </span>
          )}
          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-[#0ECB81]/10 text-[#0ECB81] text-[10px] font-medium rounded-full">
            <Star className="w-3 h-3" /> Season Points
          </span>
        </div>
      </div>
    </div>
  );
}

export default function CompetitionShowcase() {
  const { t } = useT();
  const [data, setData] = useState<ShowcaseData | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [direction, setDirection] = useState(0);

  useEffect(() => {
    fetch('/api/public/competitions')
      .then((r) => r.json())
      .then((d) => {
        setData(d);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const allCards = data
    ? [...data.live, ...data.upcoming, ...data.completed]
    : [];

  const goNext = useCallback(() => {
    if (allCards.length === 0) return;
    setDirection(1);
    setCurrentIndex((prev) => (prev + 1) % allCards.length);
  }, [allCards.length]);

  const goPrev = useCallback(() => {
    if (allCards.length === 0) return;
    setDirection(-1);
    setCurrentIndex((prev) => (prev - 1 + allCards.length) % allCards.length);
  }, [allCards.length]);

  if (loading) {
    return (
      <section id="competitions" className="py-20">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <div className="w-8 h-8 border-2 border-[#F0B90B]/30 border-t-[#F0B90B] rounded-full animate-spin mx-auto" />
        </div>
      </section>
    );
  }

  if (!data || allCards.length === 0) {
    return (
      <section id="competitions" className="py-20">
        <div className="max-w-7xl mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center"
          >
            <h2 className="text-2xl sm:text-3xl font-display font-bold text-white">
              {t('land.comp.title')}
            </h2>
            <p className="mt-3 text-[14px] text-[#848E9C]">
              {t('land.comp.empty')}
            </p>
          </motion.div>
        </div>
      </section>
    );
  }

  const variants = {
    enter: (dir: number) => ({
      x: dir > 0 ? 300 : -300,
      opacity: 0,
      scale: 0.9,
      rotateY: dir > 0 ? 15 : -15,
    }),
    center: {
      x: 0,
      opacity: 1,
      scale: 1,
      rotateY: 0,
    },
    exit: (dir: number) => ({
      x: dir > 0 ? -300 : 300,
      opacity: 0,
      scale: 0.9,
      rotateY: dir > 0 ? -15 : 15,
    }),
  };

  return (
    <section id="competitions" className="py-20 bg-[#0D1017]">
      <div className="max-w-7xl mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-10"
        >
          <h2 className="text-2xl sm:text-3xl font-display font-bold text-white">
            {t('land.comp.title')}
          </h2>
          <p className="mt-3 text-[14px] text-[#848E9C]">
            {data.season ? `${data.season.name} · ` : ''}
            {t('land.comp.subtitle', {
              live: data.live.length,
              upcoming: data.upcoming.length,
              completed: data.completed.length,
            })}
          </p>
        </motion.div>

        {/* Card stack with navigation */}
        <div className="relative max-w-md mx-auto">
          {/* Card stack visual effect */}
          <div className="absolute inset-0 translate-y-2 translate-x-1 rounded-2xl bg-white/[0.02] border border-white/[0.04]" />
          <div className="absolute inset-0 translate-y-4 translate-x-2 rounded-2xl bg-white/[0.01] border border-white/[0.02]" />

          {/* Main card with animation */}
          <div className="relative h-[360px] overflow-hidden rounded-2xl">
            <AnimatePresence initial={false} custom={direction} mode="wait">
              <motion.div
                key={currentIndex}
                custom={direction}
                variants={variants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                className="absolute inset-0"
              >
                <CompetitionCardView card={allCards[currentIndex]} index={currentIndex} />
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Navigation buttons */}
          <div className="flex items-center justify-center gap-4 mt-5">
            <button
              onClick={goPrev}
              className="w-10 h-10 rounded-full bg-white/5 border border-white/[0.08] flex items-center justify-center text-[#848E9C] hover:text-white hover:bg-white/10 transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>

            {/* Dots indicator */}
            <div className="flex items-center gap-1.5">
              {allCards.map((_, i) => (
                <button
                  key={i}
                  onClick={() => { setDirection(i > currentIndex ? 1 : -1); setCurrentIndex(i); }}
                  className={`w-2 h-2 rounded-full transition-all ${
                    i === currentIndex
                      ? 'bg-[#F0B90B] w-6'
                      : 'bg-white/20 hover:bg-white/40'
                  }`}
                />
              ))}
            </div>

            <button
              onClick={goNext}
              className="w-10 h-10 rounded-full bg-white/5 border border-white/[0.08] flex items-center justify-center text-[#848E9C] hover:text-white hover:bg-white/10 transition-colors"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>

          {/* CTA */}
          <div className="text-center mt-6">
            <Link
              href="/login"
              className="inline-flex items-center gap-2 px-6 py-2.5 bg-[#F0B90B] text-[#0B0E11] rounded-lg text-[13px] font-bold hover:bg-[#F0B90B]/90 transition-colors"
            >
              {t('land.comp.joinNow')}
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

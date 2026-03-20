import { useEffect, useState } from 'react';
import { Link } from 'wouter';
import { motion } from 'framer-motion';
import {
  ChevronLeft,
  ChevronRight,
  Clock3,
  Coins,
  Sparkles,
  Users,
  Zap,
  Swords,
  Bot,
  ArrowRight,
  Radio,
} from 'lucide-react';

import {
  Carousel,
  CarouselContent,
  CarouselItem,
  type CarouselApi,
} from '@/components/ui/carousel';
import { useT } from '@/lib/i18n';

/* ── Types ── */
interface CompetitionCard {
  id: number;
  slug: string;
  title: string;
  competitionType: string;
  participantMode?: string;
  status: string;
  prizePool: number;
  symbol: string;
  startTime: number;
  endTime: number;
  registeredCount: number;
  maxParticipants: number;
  coverImageUrl?: string | null;
}

interface ShowcaseData {
  season: { id: number; name: string; slug: string } | null;
  live: CompetitionCard[];
  upcoming: CompetitionCard[];
  completed: CompetitionCard[];
}

/* ── Helpers ── */
function formatTime(ts: number): string {
  return new Date(ts).toLocaleString('zh-CN', {
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

function getBaseAsset(symbol: string): string {
  return symbol.replace(/USDT|USDC/, '');
}

function getRegistrationPct(card: CompetitionCard): number {
  if (!card.maxParticipants) return 0;
  return Math.min(100, Math.round((card.registeredCount / card.maxParticipants) * 100));
}

function getParticipantModeLabel(mode: string | undefined, lang: string): string {
  if (mode === 'agent') return lang === 'zh' ? 'Agent vs Agent' : 'Agent vs Agent';
  return lang === 'zh' ? 'Human vs Human' : 'Human vs Human';
}

function getParticipantModeIcon(mode: string | undefined) {
  if (mode === 'agent') return <Bot className="h-3.5 w-3.5" />;
  return <Swords className="h-3.5 w-3.5" />;
}

/* ── Single competition card ── */
function CompetitionCardSimple({ card }: { card: CompetitionCard }) {
  const { lang } = useT();
  const isLive = card.status === 'live';
  const isOpen = card.status === 'registration_open';
  const baseAsset = getBaseAsset(card.symbol);
  const regPct = getRegistrationPct(card);

  // Live cards get a green accent, open cards get yellow accent
  const accentColor = isLive ? '#0ECB81' : '#F0B90B';
  const statusLabel = isLive
    ? (lang === 'zh' ? '进行中' : 'LIVE')
    : isOpen
      ? (lang === 'zh' ? '报名中' : 'OPEN')
      : (lang === 'zh' ? '即将开始' : 'UPCOMING');

  return (
    <Link href={`/competitions/${card.slug}`} className="block group">
      <article
        className="relative overflow-hidden rounded-2xl border border-white/[0.08] bg-[#0E1422] transition-all duration-300 group-hover:border-[#F0B90B]/40 group-hover:shadow-[0_0_40px_rgba(240,185,11,0.08)]"
      >
        {/* Top gradient area with coin watermark */}
        <div className={`relative px-5 pt-5 pb-4 ${isLive ? 'bg-gradient-to-br from-[#0ECB81]/12 via-transparent to-transparent' : 'bg-gradient-to-br from-[#F0B90B]/8 via-transparent to-transparent'}`}>
          {/* Watermark */}
          <div
            className="absolute -right-4 -top-2 text-[72px] font-black uppercase tracking-[0.15em] text-white/[0.03] select-none pointer-events-none"
            aria-hidden="true"
          >
            {baseAsset}
          </div>

          {/* Row 1: Status badge + participant mode */}
          <div className="flex items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-2">
              <span
                className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold"
                style={{
                  backgroundColor: isLive ? 'rgba(14,203,129,0.15)' : 'rgba(240,185,11,0.15)',
                  color: accentColor,
                }}
              >
                {isLive && <span className="h-1.5 w-1.5 rounded-full bg-current animate-pulse" />}
                {statusLabel}
              </span>
              <span className="inline-flex items-center gap-1 rounded-full border border-white/8 bg-white/[0.04] px-2.5 py-1 text-[11px] font-medium text-white/55">
                {getParticipantModeIcon(card.participantMode)}
                {getParticipantModeLabel(card.participantMode, lang)}
              </span>
            </div>

            {card.prizePool > 0 && (
              <span className="inline-flex items-center gap-1 rounded-full border border-[#F0B90B]/20 bg-[#F0B90B]/8 px-2.5 py-1 text-[11px] font-bold text-[#F0B90B]">
                <Coins className="h-3 w-3" />
                {card.prizePool}U
              </span>
            )}
          </div>

          {/* Row 2: Trading pair + start time */}
          <div className="flex items-center gap-4 text-[13px]">
            <div className="flex items-center gap-1.5">
              <Zap className="h-4 w-4 text-[#25C2A0]" />
              <span className="font-semibold text-white">{baseAsset}/USDT</span>
            </div>
            <div className="h-4 w-px bg-white/10" />
            <div className="flex items-center gap-1.5">
              <Clock3 className="h-4 w-4" style={{ color: accentColor }} />
              <span className="text-white/60">{formatTime(card.startTime)}</span>
            </div>
          </div>
        </div>

        {/* Bottom section: state-specific content */}
        <div className="border-t border-white/[0.06] px-5 py-3.5">
          {isOpen ? (
            /* Registration open: show progress bar */
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5 text-[12px] text-white/50">
                  <Users className="h-3.5 w-3.5" />
                  <span>{lang === 'zh' ? '报名进度' : 'Registration'}</span>
                </div>
                <span className="text-[12px] font-mono font-semibold text-white/80">
                  {card.registeredCount}/{card.maxParticipants}
                </span>
              </div>
              <div className="h-1.5 w-full rounded-full bg-white/[0.06] overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-[#F0B90B] to-[#F0B90B]/70 transition-all duration-500"
                  style={{ width: `${regPct}%` }}
                />
              </div>
            </div>
          ) : isLive ? (
            /* Live: show live indicator + participant count */
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Radio className="h-4 w-4 text-[#0ECB81] animate-pulse" />
                <span className="text-[12px] font-medium text-[#0ECB81]">
                  {lang === 'zh' ? '比赛进行中' : 'Match in Progress'}
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-[12px] text-white/50">
                <Users className="h-3.5 w-3.5" />
                <span>{card.registeredCount} {lang === 'zh' ? '名选手' : 'players'}</span>
              </div>
            </div>
          ) : (
            /* Upcoming (announced, registration_closed): show participant count + arrow */
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-[12px] text-white/50">
                <Users className="h-3.5 w-3.5" />
                <span>{card.registeredCount}/{card.maxParticipants}</span>
              </div>
              <div className="flex items-center gap-1 text-[12px] text-white/40 group-hover:text-[#F0B90B] transition-colors">
                <span>{lang === 'zh' ? '查看详情' : 'Details'}</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </div>
            </div>
          )}
        </div>
      </article>
    </Link>
  );
}

/* ── Main Section ── */
export default function CompetitionShowcase() {
  const { t, lang } = useT();
  const [data, setData] = useState<ShowcaseData | null>(null);
  const [loading, setLoading] = useState(true);
  const [api, setApi] = useState<CarouselApi>();
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    fetch('/api/public/competitions')
      .then((r) => r.json())
      .then((d) => {
        setData(d);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  // Only show live + upcoming (no completed)
  const activeCards = data ? [...data.live, ...data.upcoming] : [];

  useEffect(() => {
    if (!api) return;
    const syncIndex = () => setCurrentIndex(api.selectedScrollSnap());
    syncIndex();
    api.on('select', syncIndex);
    api.on('reInit', syncIndex);
    return () => {
      api.off('select', syncIndex);
      api.off('reInit', syncIndex);
    };
  }, [api]);

  useEffect(() => {
    if (currentIndex < activeCards.length) return;
    setCurrentIndex(0);
    api?.scrollTo(0);
  }, [api, activeCards.length, currentIndex]);

  if (loading) {
    return (
      <section id="competitions" className="py-20">
        <div className="mx-auto max-w-7xl px-6 text-center">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-[#F0B90B]/30 border-t-[#F0B90B]" />
        </div>
      </section>
    );
  }

  if (!data || activeCards.length === 0) {
    return (
      <section id="competitions" className="py-20">
        <div className="mx-auto max-w-7xl px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center"
          >
            <h2 className="text-2xl font-display font-bold text-white sm:text-3xl">
              {t('land.comp.title')}
            </h2>
            <p className="mt-3 text-[14px] text-[#848E9C]">{t('land.comp.empty')}</p>
          </motion.div>
        </div>
      </section>
    );
  }

  const liveCount = data.live.length;
  const upcomingCount = data.upcoming.length;

  return (
    <section id="competitions" className="relative overflow-hidden py-20">
      {/* Background effects */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute left-1/2 top-12 h-[420px] w-[420px] -translate-x-1/2 rounded-full bg-[#F0B90B]/[0.04] blur-[140px]" />
        <div className="absolute -left-24 bottom-0 h-[260px] w-[260px] rounded-full bg-[#25C2A0]/[0.05] blur-[120px]" />
      </div>

      <div className="relative mx-auto max-w-5xl px-6">
        {/* Section header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mx-auto max-w-2xl text-center"
        >
          {data.season && (
            <span className="inline-flex items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.03] px-4 py-1.5 text-[11px] font-medium tracking-[0.24em] text-[#AAB3C2] uppercase">
              <Sparkles className="h-3.5 w-3.5 text-[#F0B90B]" />
              {data.season.name}
            </span>
          )}
          <h2 className="mt-5 text-3xl font-display font-black tracking-tight text-white sm:text-4xl lg:text-5xl">
            {t('land.comp.title')}
          </h2>
          <p className="mt-4 text-sm leading-7 text-[#8E97A8] sm:text-[15px]">
            {lang === 'zh'
              ? `${liveCount} 场进行中 · ${upcomingCount} 场即将开始`
              : `${liveCount} Live · ${upcomingCount} Upcoming`}
          </p>
        </motion.div>

        {/* Cards grid / carousel */}
        <motion.div
          initial={{ opacity: 0, y: 28 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.45 }}
          className="mt-12"
        >
          {activeCards.length <= 3 ? (
            /* Grid layout for 1-3 cards */
            <div className={`grid gap-5 ${activeCards.length === 1 ? 'max-w-md mx-auto' : activeCards.length === 2 ? 'grid-cols-1 sm:grid-cols-2 max-w-2xl mx-auto' : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'}`}>
              {activeCards.map((card) => (
                <CompetitionCardSimple key={card.id} card={card} />
              ))}
            </div>
          ) : (
            /* Carousel for 4+ cards */
            <div>
              <Carousel
                setApi={setApi}
                opts={{ align: 'start', loop: activeCards.length > 2 }}
                className="relative"
              >
                <CarouselContent className="-ml-4">
                  {activeCards.map((card) => (
                    <CarouselItem key={card.id} className="pl-4 basis-full sm:basis-1/2 lg:basis-1/3">
                      <CompetitionCardSimple card={card} />
                    </CarouselItem>
                  ))}
                </CarouselContent>
              </Carousel>

              {/* Carousel navigation */}
              <div className="mt-6 flex items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={() => api?.scrollPrev()}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/[0.08] bg-white/[0.04] text-[#8E97A8] transition-colors hover:bg-white/[0.08] hover:text-white"
                  aria-label={lang === 'zh' ? '上一张' : 'Previous'}
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>

                <div className="flex items-center gap-1.5">
                  {activeCards.map((card, index) => (
                    <button
                      key={card.id}
                      type="button"
                      onClick={() => api?.scrollTo(index)}
                      aria-label={`${index + 1}`}
                      className={`h-2 rounded-full transition-all ${
                        index === currentIndex
                          ? 'w-6 bg-[#F0B90B]'
                          : 'w-2 bg-white/20 hover:bg-white/35'
                      }`}
                    />
                  ))}
                </div>

                <button
                  type="button"
                  onClick={() => api?.scrollNext()}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/[0.08] bg-white/[0.04] text-[#8E97A8] transition-colors hover:bg-white/[0.08] hover:text-white"
                  aria-label={lang === 'zh' ? '下一张' : 'Next'}
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </motion.div>

        {/* Past competitions link */}
        {data.completed.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="mt-8 text-center"
          >
            <Link
              href="/past-competitions"
              className="inline-flex items-center gap-1.5 text-[13px] text-white/40 hover:text-[#F0B90B] transition-colors"
            >
              {lang === 'zh' ? `查看 ${data.completed.length} 场往期比赛` : `View ${data.completed.length} past competitions`}
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </motion.div>
        )}
      </div>
    </section>
  );
}

import { useEffect, useState } from 'react';
import { Link } from 'wouter';
import { motion } from 'framer-motion';
import {
  ChevronLeft,
  ChevronRight,
  Clock3,
  Coins,
  Sparkles,
  Star,
  Users,
  Zap,
} from 'lucide-react';

import {
  Carousel,
  CarouselContent,
  CarouselItem,
  type CarouselApi,
} from '@/components/ui/carousel';
import { useT } from '@/lib/i18n';

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
  coverImageUrl?: string | null;
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
  ended_early: { label: '提前结束', labelEn: 'Ended Early', color: '#FF6B35', bg: 'rgba(255,107,53,0.15)' },
  settling: { label: '结算中', labelEn: 'Settling', color: '#848E9C', bg: 'rgba(132,142,156,0.15)' },
};

const TYPE_META: Record<string, { label: string; eyebrow: string; gradient: string; accent: string }> = {
  grand_final: {
    label: 'Grand Final',
    eyebrow: 'Season Finale',
    gradient: 'from-[#F0B90B]/45 via-[#FF7A00]/24 to-[#131A2B]',
    accent: '#F0B90B',
  },
  special: {
    label: 'Special Event',
    eyebrow: 'Limited Event',
    gradient: 'from-[#5EEAD4]/28 via-[#2563EB]/22 to-[#121A2A]',
    accent: '#5EEAD4',
  },
  regular: {
    label: 'Regular Match',
    eyebrow: 'Campus Series',
    gradient: 'from-[#25C2A0]/28 via-[#0D5BFF]/18 to-[#121A2A]',
    accent: '#25C2A0',
  },
  practice: {
    label: 'Practice',
    eyebrow: 'Warmup Session',
    gradient: 'from-[#94A3B8]/20 via-[#475569]/18 to-[#101725]',
    accent: '#94A3B8',
  },
};

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

/* ── Right-side carousel card (compact) ── */
function CompetitionCardView({ card }: { card: CompetitionCard }) {
  const { lang } = useT();
  const statusConf = STATUS_CONFIG[card.status] ?? STATUS_CONFIG.completed;
  const typeMeta = TYPE_META[card.competitionType] ?? TYPE_META.regular;
  const baseAsset = getBaseAsset(card.symbol);
  const registrationPct = getRegistrationPct(card);

  return (
    <article className="relative overflow-hidden rounded-[28px] border border-white/[0.1] bg-[#0E1422] shadow-[0_28px_90px_rgba(0,0,0,0.4)]">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.12),transparent_32%),linear-gradient(180deg,rgba(255,255,255,0.02),rgba(255,255,255,0))]" />

      <div className={`relative h-[280px] overflow-hidden bg-gradient-to-br ${typeMeta.gradient}`}>
        {card.coverImageUrl ? (
          <>
            <img src={card.coverImageUrl} alt={card.title} className="h-full w-full object-cover" />
            <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(6,10,18,0.08),rgba(6,10,18,0.88))]" />
          </>
        ) : (
          <>
            <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(13,17,28,0.08),rgba(13,17,28,0.85))]" />
            <div
              className="absolute -right-6 top-5 text-[82px] font-black uppercase tracking-[0.18em] text-white/[0.06] sm:text-[110px]"
              aria-hidden="true"
            >
              {baseAsset}
            </div>
            <div
              className="absolute -left-14 bottom-5 h-32 w-32 rounded-full blur-3xl"
              style={{ backgroundColor: `${typeMeta.accent}55` }}
              aria-hidden="true"
            />
          </>
        )}

        <div className="absolute inset-x-5 top-5 flex items-start justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-bold backdrop-blur-sm"
              style={{ backgroundColor: statusConf.bg, color: statusConf.color }}
            >
              {card.status === 'live' && <span className="h-2 w-2 rounded-full bg-current animate-pulse" />}
              {statusConf.label}
            </span>
            <span className="rounded-full border border-white/10 bg-black/25 px-3 py-1 text-[11px] font-medium text-white/72 backdrop-blur-sm">
              {typeMeta.label}
            </span>
          </div>

          {card.prizePool > 0 && (
            <span className="inline-flex items-center gap-1 rounded-full border border-[#F0B90B]/25 bg-black/45 px-3 py-1 text-[11px] font-bold text-[#F0B90B] backdrop-blur-sm">
              <Coins className="h-3 w-3" />
              {card.prizePool}U
            </span>
          )}
        </div>

        <div className="absolute inset-x-5 bottom-5">
          <div className="flex flex-wrap items-center gap-2 text-[11px] uppercase tracking-[0.28em] text-white/55">
            <span>{typeMeta.eyebrow}</span>
            <span className="h-1 w-1 rounded-full bg-white/35" />
            <span>{statusConf.labelEn}</span>
          </div>

          <h3 className="mt-3 max-w-[12ch] text-3xl font-display font-black leading-[0.95] text-white sm:text-[42px]">
            {card.title}
          </h3>

          <div className="mt-4 flex flex-wrap gap-2">
            <span className="rounded-full border border-white/12 bg-white/[0.08] px-3 py-1 text-[11px] font-mono font-bold text-white/85">
              {baseAsset}/USDT
            </span>
            <span className="rounded-full border border-white/12 bg-white/[0.08] px-3 py-1 text-[11px] font-medium text-white/72">
              #{card.id.toString().padStart(2, '0')}
            </span>
          </div>
        </div>
      </div>

      {/* Compact bottom info: 1 row with key stats */}
      <div className="flex items-center gap-4 border-t border-white/[0.06] bg-[#0B111D]/92 px-5 py-3.5">
        <div className="flex items-center gap-1.5 text-[12px] text-[#9CA5B5]">
          <Clock3 className="h-3.5 w-3.5 text-[#F0B90B]" />
          <span className="font-medium text-white/80">{formatTime(card.startTime)}</span>
        </div>
        <div className="h-3 w-px bg-white/10" />
        <div className="flex items-center gap-1.5 text-[12px] text-[#9CA5B5]">
          <Zap className="h-3.5 w-3.5 text-[#25C2A0]" />
          <span className="font-medium text-white/80">{card.symbol}</span>
        </div>
        <div className="h-3 w-px bg-white/10" />
        <div className="flex items-center gap-1.5 text-[12px] text-[#9CA5B5]">
          <Users className="h-3.5 w-3.5 text-[#25C2A0]" />
          <span className="font-medium text-white/80">{card.registeredCount}/{card.maxParticipants}</span>
        </div>
        {card.prizePool > 0 && (
          <>
            <div className="h-3 w-px bg-white/10" />
            <div className="flex items-center gap-1.5 text-[12px] text-[#9CA5B5]">
              <Star className="h-3.5 w-3.5 text-[#F0B90B]" />
              <span className="font-medium text-white/80">{card.prizePool}U</span>
            </div>
          </>
        )}
      </div>
    </article>
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

  const allCards = data ? [...data.live, ...data.upcoming, ...data.completed] : [];
  const activeCard = allCards[currentIndex] ?? allCards[0];

  useEffect(() => {
    if (!api) return;

    const syncIndex = () => {
      setCurrentIndex(api.selectedScrollSnap());
    };

    syncIndex();
    api.on('select', syncIndex);
    api.on('reInit', syncIndex);

    return () => {
      api.off('select', syncIndex);
      api.off('reInit', syncIndex);
    };
  }, [api]);

  useEffect(() => {
    if (currentIndex < allCards.length) return;
    setCurrentIndex(0);
    api?.scrollTo(0);
  }, [api, allCards.length, currentIndex]);

  if (loading) {
    return (
      <section id="competitions" className="py-20">
        <div className="mx-auto max-w-7xl px-6 text-center">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-[#F0B90B]/30 border-t-[#F0B90B]" />
        </div>
      </section>
    );
  }

  if (!data || allCards.length === 0) {
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

  const activeStatus = STATUS_CONFIG[activeCard.status] ?? STATUS_CONFIG.completed;
  const activeType = TYPE_META[activeCard.competitionType] ?? TYPE_META.regular;

  return (
    <section id="competitions" className="relative overflow-hidden bg-[#090D14] py-24">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute left-1/2 top-12 h-[420px] w-[420px] -translate-x-1/2 rounded-full bg-[#F0B90B]/[0.05] blur-[140px]" />
        <div className="absolute -left-24 bottom-0 h-[260px] w-[260px] rounded-full bg-[#25C2A0]/[0.07] blur-[120px]" />
        <div className="absolute -right-28 top-1/3 h-[280px] w-[280px] rounded-full bg-[#0D5BFF]/[0.08] blur-[120px]" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:44px_44px] opacity-[0.06]" />
      </div>

      <div className="relative mx-auto max-w-6xl px-6">
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
            {t('land.comp.subtitle', {
              live: data.live.length,
              upcoming: data.upcoming.length,
              completed: data.completed.length,
            })}
          </p>
        </motion.div>

        {/* Main content: slimmed left panel + right carousel */}
        <motion.div
          initial={{ opacity: 0, y: 28 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.45 }}
          className="relative mt-12 overflow-hidden rounded-[36px] border border-white/[0.08] bg-[linear-gradient(180deg,rgba(17,24,39,0.92),rgba(10,14,23,0.96))] p-5 shadow-[0_40px_120px_rgba(0,0,0,0.45)] sm:p-6 lg:p-8"
        >
          <div
            className="pointer-events-none absolute inset-x-10 top-0 h-40 rounded-full blur-3xl"
            style={{ backgroundColor: `${activeStatus.color}26` }}
          />

          <div className="relative grid items-center gap-8 lg:grid-cols-[minmax(0,1fr)_420px]">
            {/* ── Left panel: slimmed down ── */}
            <div className="space-y-6">
              {/* Status badges */}
              <div className="flex flex-wrap items-center gap-3">
                <span
                  className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-bold"
                  style={{ backgroundColor: activeStatus.bg, color: activeStatus.color }}
                >
                  {activeCard.status === 'live' && <span className="h-2 w-2 rounded-full bg-current animate-pulse" />}
                  {activeStatus.label}
                </span>
                <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-[11px] font-medium text-white/60">
                  {activeType.label}
                </span>
              </div>

              {/* Title */}
              <div>
                <h3 className="max-w-[16ch] text-4xl font-display font-black leading-[0.92] text-white sm:text-5xl">
                  {activeCard.title}
                </h3>
              </div>

              {/* Key stats in one compact row */}
              <div className="flex flex-wrap items-center gap-4 text-[13px]">
                <div className="flex items-center gap-1.5">
                  <Zap className="h-4 w-4 text-[#25C2A0]" />
                  <span className="font-semibold text-white">{activeCard.symbol}</span>
                </div>
                <div className="h-4 w-px bg-white/10" />
                <div className="flex items-center gap-1.5">
                  <Clock3 className="h-4 w-4 text-[#F0B90B]" />
                  <span className="text-[#9CA5B5]">{formatTime(activeCard.startTime)}</span>
                </div>
                <div className="h-4 w-px bg-white/10" />
                <div className="flex items-center gap-1.5">
                  <Coins className="h-4 w-4 text-[#F0B90B]" />
                  <span className="font-semibold text-white">{activeCard.prizePool}U</span>
                </div>
                <div className="h-4 w-px bg-white/10" />
                <div className="flex items-center gap-1.5">
                  <Users className="h-4 w-4 text-[#25C2A0]" />
                  <span className="text-[#9CA5B5]">{activeCard.registeredCount}/{activeCard.maxParticipants}</span>
                </div>
              </div>

              {/* CTA buttons */}
              <div className="flex flex-wrap items-center gap-3 pt-2">
                <Link
                  href="/login?mode=register"
                  className="inline-flex items-center gap-2 rounded-2xl bg-[#F0B90B] px-6 py-3 text-sm font-bold text-[#0B0E11] transition-colors hover:bg-[#F0B90B]/90"
                >
                  {t('land.comp.joinNow')}
                  <ChevronRight className="h-4 w-4" />
                </Link>
                <Link
                  href={`/competitions/${activeCard.slug}`}
                  className="inline-flex items-center gap-2 rounded-2xl border border-white/[0.08] bg-white/[0.03] px-5 py-3 text-sm font-medium text-white/78 transition-colors hover:bg-white/[0.06] hover:text-white"
                >
                  {lang === 'zh' ? '查看详情' : 'Details'}
                </Link>
              </div>
            </div>

            {/* ── Right panel: carousel ── */}
            <div className="relative">
              <div className="pointer-events-none absolute inset-4 rounded-[32px] bg-white/[0.03]" />
              <div
                className="pointer-events-none absolute inset-6 rounded-[32px] blur-3xl"
                style={{ backgroundColor: `${activeType.accent}22` }}
              />

              <Carousel
                setApi={setApi}
                opts={{ align: 'center', loop: allCards.length > 1 }}
                className="relative"
              >
                <CarouselContent className="-ml-0">
                  {allCards.map((card) => (
                    <CarouselItem key={card.id} className="pl-0">
                      <CompetitionCardView card={card} />
                    </CarouselItem>
                  ))}
                </CarouselContent>
              </Carousel>

              {allCards.length > 1 && (
                <div className="mt-5 flex items-center justify-between gap-3">
                  <button
                    type="button"
                    onClick={() => api?.scrollPrev()}
                    className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/[0.08] bg-white/[0.04] text-[#8E97A8] transition-colors hover:bg-white/[0.08] hover:text-white"
                    aria-label="上一张赛事卡片"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </button>

                  <div className="flex items-center gap-2">
                    {allCards.map((card, index) => (
                      <button
                        key={card.id}
                        type="button"
                        onClick={() => api?.scrollTo(index)}
                        aria-label={`切换到第 ${index + 1} 张赛事卡片`}
                        className={`h-2.5 rounded-full transition-all ${
                          index === currentIndex
                            ? 'w-8 bg-[#F0B90B]'
                            : 'w-2.5 bg-white/20 hover:bg-white/38'
                        }`}
                      />
                    ))}
                  </div>

                  <button
                    type="button"
                    onClick={() => api?.scrollNext()}
                    className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/[0.08] bg-white/[0.04] text-[#8E97A8] transition-colors hover:bg-white/[0.08] hover:text-white"
                    aria-label="下一张赛事卡片"
                  >
                    <ChevronRight className="h-5 w-5" />
                  </button>
                </div>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

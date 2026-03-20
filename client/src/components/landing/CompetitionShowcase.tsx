import { useEffect, useState } from 'react';
import { Link } from 'wouter';
import { motion } from 'framer-motion';
import {
  Clock3,
  Coins,
  Users,
  Zap,
  Swords,
  Bot,
  ArrowRight,
  Radio,
} from 'lucide-react';
import { useT } from '@/lib/i18n';

/* ── Default coin logos ── */
const COIN_LOGOS: Record<string, string> = {
  SOL: 'https://d2xsxph8kpxj0f.cloudfront.net/310519663325188422/dRgYLfmNL5QAGwfaYvi5WU/sol-logo_8a0d6446.png',
};

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
  description?: string | null;
}

interface ShowcaseData {
  season: { id: number; name: string; slug: string } | null;
  live: CompetitionCard[];
  upcoming: CompetitionCard[];
  completed: CompetitionCard[];
}

/* ── Helpers ── */
function formatDateRange(start: number, end: number): string {
  const s = new Date(start);
  const e = new Date(end);
  const fmt = (d: Date) =>
    d.toLocaleDateString('zh-CN', { year: 'numeric', month: 'numeric', day: 'numeric' });
  return `${fmt(s)} – ${fmt(e)}`;
}

function getBaseAsset(symbol: string): string {
  return symbol.replace(/USDT|USDC/, '');
}

function getRegistrationPct(card: CompetitionCard): number {
  if (!card.maxParticipants) return 0;
  return Math.min(100, Math.round((card.registeredCount / card.maxParticipants) * 100));
}

function getParticipantModeLabel(mode: string | undefined, lang: string): string {
  if (mode === 'agent') return 'Agent vs Agent';
  return lang === 'zh' ? '人类对战' : 'Human vs Human';
}

function getStatusConfig(status: string, lang: string) {
  if (status === 'live') {
    return {
      label: lang === 'zh' ? '进行中' : 'LIVE',
      dotColor: '#0ECB81',
      bgColor: 'rgba(14,203,129,0.12)',
      textColor: '#0ECB81',
      pulse: true,
    };
  }
  if (status === 'registration_open') {
    return {
      label: lang === 'zh' ? '报名中' : 'OPEN',
      dotColor: '#F0B90B',
      bgColor: 'rgba(240,185,11,0.12)',
      textColor: '#F0B90B',
      pulse: false,
    };
  }
  return {
    label: lang === 'zh' ? '即将开始' : 'UPCOMING',
    dotColor: '#8E97A8',
    bgColor: 'rgba(142,151,168,0.12)',
    textColor: '#8E97A8',
    pulse: false,
  };
}

function getCoverImage(card: CompetitionCard): string {
  if (card.coverImageUrl) return card.coverImageUrl;
  const base = getBaseAsset(card.symbol);
  return COIN_LOGOS[base] ?? COIN_LOGOS.SOL;
}

/* ── Horizontal competition card (TradingView-style) ── */
function HorizontalCard({ card }: { card: CompetitionCard }) {
  const { lang } = useT();
  const isLive = card.status === 'live';
  const isOpen = card.status === 'registration_open';
  const baseAsset = getBaseAsset(card.symbol);
  const statusCfg = getStatusConfig(card.status, lang);
  const regPct = getRegistrationPct(card);
  const coverUrl = getCoverImage(card);
  const hasCover = !!card.coverImageUrl;

  return (
    <Link href={`/competitions/${card.slug}`} className="block group">
      <article className="relative overflow-hidden rounded-2xl border border-white/[0.06] bg-[#0E1422] transition-all duration-300 group-hover:border-[#F0B90B]/30 group-hover:shadow-[0_0_40px_rgba(240,185,11,0.06)]">
        <div className="flex items-stretch min-h-[180px]">
          {/* Left: Text content */}
          <div className="flex-1 p-6 flex flex-col justify-between min-w-0">
            {/* Date range */}
            <div className="text-[12px] text-white/35 tracking-wide mb-2">
              {formatDateRange(card.startTime, card.endTime)}
            </div>

            {/* Title + status badge */}
            <div className="mb-3">
              <div className="flex items-center gap-2.5 flex-wrap">
                <h3 className="text-lg font-bold text-white leading-tight sm:text-xl">
                  {card.title}
                </h3>
                <span
                  className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-bold shrink-0"
                  style={{ backgroundColor: statusCfg.bgColor, color: statusCfg.textColor }}
                >
                  {statusCfg.pulse && (
                    <span className="h-1.5 w-1.5 rounded-full bg-current animate-pulse" />
                  )}
                  {statusCfg.label}
                </span>
              </div>
            </div>

            {/* Info row: prize pool, participants, asset */}
            <div className="flex items-center gap-5 flex-wrap mb-4">
              {card.prizePool > 0 && (
                <div className="flex flex-col">
                  <span className="text-[11px] text-white/35 mb-0.5">
                    {lang === 'zh' ? '奖金池' : 'Prize Pool'}
                  </span>
                  <span className="text-sm font-bold text-[#F0B90B]">
                    {card.prizePool.toLocaleString()}U
                  </span>
                </div>
              )}
              <div className="flex flex-col">
                <span className="text-[11px] text-white/35 mb-0.5">
                  {isLive || card.status === 'completed'
                    ? (lang === 'zh' ? '参赛者' : 'Participants')
                    : (lang === 'zh' ? '已报名' : 'Registered')}
                </span>
                <span className="text-sm font-semibold text-white/80 flex items-center gap-1">
                  <Users className="h-3.5 w-3.5 text-white/40" />
                  {card.registeredCount.toLocaleString()}
                </span>
              </div>
              <div className="flex flex-col">
                <span className="text-[11px] text-white/35 mb-0.5">
                  {lang === 'zh' ? '交易品种' : 'Asset'}
                </span>
                <span className="text-sm font-semibold text-white/80 flex items-center gap-1">
                  <Zap className="h-3.5 w-3.5 text-[#25C2A0]" />
                  {baseAsset}/USDT
                </span>
              </div>
              <div className="flex flex-col">
                <span className="text-[11px] text-white/35 mb-0.5">
                  {lang === 'zh' ? '类型' : 'Type'}
                </span>
                <span className="text-sm font-medium text-white/60 flex items-center gap-1">
                  {card.participantMode === 'agent' ? (
                    <Bot className="h-3.5 w-3.5 text-white/40" />
                  ) : (
                    <Swords className="h-3.5 w-3.5 text-white/40" />
                  )}
                  {getParticipantModeLabel(card.participantMode, lang)}
                </span>
              </div>
            </div>

            {/* Bottom: CTA button or progress */}
            <div className="flex items-center gap-3">
              {isOpen ? (
                <>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-white/[0.06] px-3 py-1.5 text-[12px] font-semibold text-white">
                    {lang === 'zh' ? '参加竞赛' : 'Join Competition'}
                    <ArrowRight className="h-3.5 w-3.5" />
                  </span>
                  {/* Mini progress bar */}
                  <div className="flex items-center gap-2 flex-1 max-w-[160px]">
                    <div className="h-1.5 flex-1 rounded-full bg-white/[0.06] overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-[#F0B90B] to-[#F0B90B]/70 transition-all duration-500"
                        style={{ width: `${regPct}%` }}
                      />
                    </div>
                    <span className="text-[11px] font-mono text-white/40">
                      {card.registeredCount}/{card.maxParticipants}
                    </span>
                  </div>
                </>
              ) : isLive ? (
                <span className="inline-flex items-center gap-2 text-[12px] font-medium text-[#0ECB81]">
                  <Radio className="h-4 w-4 animate-pulse" />
                  {lang === 'zh' ? '比赛进行中' : 'Match in Progress'}
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 text-[12px] text-white/40 group-hover:text-[#F0B90B] transition-colors">
                  {lang === 'zh' ? '查看详情' : 'View Details'}
                  <ArrowRight className="h-3.5 w-3.5" />
                </span>
              )}
            </div>
          </div>

          {/* Right: Cover image / coin logo */}
          <div className="hidden sm:flex items-center justify-center w-[200px] lg:w-[240px] shrink-0 p-6">
            <div className={`relative w-full h-full flex items-center justify-center ${!hasCover ? 'opacity-20' : ''}`}>
              <img
                src={coverUrl}
                alt={card.title}
                className={`object-contain max-h-[140px] max-w-full transition-transform duration-300 group-hover:scale-105 ${
                  hasCover ? 'rounded-xl' : 'drop-shadow-[0_0_20px_rgba(255,255,255,0.1)]'
                }`}
              />
            </div>
          </div>
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

  if (loading) {
    return (
      <section id="competitions" className="py-20">
        <div className="mx-auto max-w-5xl px-6 text-center">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-[#F0B90B]/30 border-t-[#F0B90B]" />
        </div>
      </section>
    );
  }

  if (!data || activeCards.length === 0) {
    return (
      <section id="competitions" className="py-20">
        <div className="mx-auto max-w-5xl px-6">
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
  const MAX_VISIBLE = 3;
  const needsScroll = activeCards.length > MAX_VISIBLE;

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

        {/* Horizontal card list */}
        <motion.div
          initial={{ opacity: 0, y: 28 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.45 }}
          className="mt-12"
        >
          <div
            className={`flex flex-col gap-4 ${
              needsScroll ? 'max-h-[620px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent' : ''
            }`}
          >
            {activeCards.map((card, i) => (
              <motion.div
                key={card.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08 }}
              >
                <HorizontalCard card={card} />
              </motion.div>
            ))}
          </div>

          {needsScroll && (
            <div className="mt-3 text-center">
              <span className="text-[11px] text-white/25">
                {lang === 'zh' ? '↕ 滚动查看更多比赛' : '↕ Scroll for more'}
              </span>
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
              {lang === 'zh'
                ? `查看 ${data.completed.length} 场往期比赛`
                : `View ${data.completed.length} past competitions`}
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </motion.div>
        )}
      </div>
    </section>
  );
}

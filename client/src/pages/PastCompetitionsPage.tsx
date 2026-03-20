import { useEffect, useState } from 'react';
import { Link } from 'wouter';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  Clock3,
  Users,
  Zap,
  Trophy,
  Bot,
  Swords,
  ArrowRight,
} from 'lucide-react';
import { useT } from '@/lib/i18n';

/* ── Default coin logos ── */
const COIN_LOGOS: Record<string, string> = {
  SOL: 'https://d2xsxph8kpxj0f.cloudfront.net/310519663325188422/dRgYLfmNL5QAGwfaYvi5WU/sol-logo_8a0d6446.png',
};

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

function getParticipantModeLabel(mode: string | undefined, lang: string): string {
  if (mode === 'agent') return 'Agent vs Agent';
  return lang === 'zh' ? '人类对战' : 'Human vs Human';
}

function getCoverImage(card: CompetitionCard): string {
  if (card.coverImageUrl) return card.coverImageUrl;
  const base = getBaseAsset(card.symbol);
  return COIN_LOGOS[base] ?? COIN_LOGOS.SOL;
}

export default function PastCompetitionsPage() {
  const { lang } = useT();
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

  const completed = data?.completed ?? [];

  return (
    <div className="min-h-screen bg-[#0B0E11] text-white">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-white/[0.06] bg-[#0B0E11]/95 backdrop-blur-md">
        <div className="mx-auto max-w-5xl px-6 py-4 flex items-center gap-4">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-[13px] text-white/50 hover:text-white transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            {lang === 'zh' ? '返回首页' : 'Back'}
          </Link>
          <div className="h-4 w-px bg-white/10" />
          <h1 className="text-lg font-display font-bold">
            {lang === 'zh' ? '往期比赛' : 'Past Competitions'}
          </h1>
          <span className="text-[12px] text-white/30">{completed.length} {lang === 'zh' ? '场' : 'events'}</span>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-10">
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#F0B90B]/30 border-t-[#F0B90B]" />
          </div>
        ) : completed.length === 0 ? (
          <div className="text-center py-20">
            <Trophy className="mx-auto h-12 w-12 text-white/15 mb-4" />
            <p className="text-[15px] text-white/40">
              {lang === 'zh' ? '暂无已结束的比赛' : 'No past competitions yet'}
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {completed.map((card, index) => {
              const baseAsset = getBaseAsset(card.symbol);
              const coverUrl = getCoverImage(card);
              const hasCover = !!card.coverImageUrl;

              return (
                <motion.div
                  key={card.id}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.06 }}
                >
                  <Link href={`/competitions/${card.slug}`} className="block group">
                    <article className="relative overflow-hidden rounded-2xl border border-white/[0.06] bg-[#0E1422]/80 transition-all duration-200 group-hover:border-white/[0.12] group-hover:bg-[#0E1422]">
                      <div className="flex items-stretch min-h-[160px]">
                        {/* Left: Text content */}
                        <div className="flex-1 p-6 flex flex-col justify-between min-w-0">
                          {/* Date range */}
                          <div className="text-[12px] text-white/30 tracking-wide mb-2">
                            {formatDateRange(card.startTime, card.endTime)}
                          </div>

                          {/* Title + completed badge */}
                          <div className="mb-3">
                            <div className="flex items-center gap-2.5 flex-wrap">
                              <h3 className="text-lg font-bold text-white/80 leading-tight">
                                {card.title}
                              </h3>
                              <span className="inline-flex items-center gap-1 rounded-full bg-white/[0.06] px-2.5 py-0.5 text-[10px] font-medium text-white/35">
                                {lang === 'zh' ? '已结束' : 'Completed'}
                              </span>
                            </div>
                          </div>

                          {/* Info row */}
                          <div className="flex items-center gap-5 flex-wrap mb-3">
                            {card.prizePool > 0 && (
                              <div className="flex flex-col">
                                <span className="text-[11px] text-white/30 mb-0.5">
                                  {lang === 'zh' ? '奖金池' : 'Prize Pool'}
                                </span>
                                <span className="text-sm font-bold text-[#F0B90B]/70">
                                  {card.prizePool.toLocaleString()}U
                                </span>
                              </div>
                            )}
                            <div className="flex flex-col">
                              <span className="text-[11px] text-white/30 mb-0.5">
                                {lang === 'zh' ? '参赛者' : 'Participants'}
                              </span>
                              <span className="text-sm font-medium text-white/60 flex items-center gap-1">
                                <Users className="h-3.5 w-3.5 text-white/30" />
                                {card.registeredCount}
                              </span>
                            </div>
                            <div className="flex flex-col">
                              <span className="text-[11px] text-white/30 mb-0.5">
                                {lang === 'zh' ? '交易品种' : 'Asset'}
                              </span>
                              <span className="text-sm font-medium text-white/60 flex items-center gap-1">
                                <Zap className="h-3.5 w-3.5 text-[#25C2A0]/60" />
                                {baseAsset}/USDT
                              </span>
                            </div>
                            <div className="flex flex-col">
                              <span className="text-[11px] text-white/30 mb-0.5">
                                {lang === 'zh' ? '类型' : 'Type'}
                              </span>
                              <span className="text-sm font-medium text-white/50 flex items-center gap-1">
                                {card.participantMode === 'agent' ? (
                                  <Bot className="h-3.5 w-3.5 text-white/30" />
                                ) : (
                                  <Swords className="h-3.5 w-3.5 text-white/30" />
                                )}
                                {getParticipantModeLabel(card.participantMode, lang)}
                              </span>
                            </div>
                          </div>

                          {/* View details link */}
                          <div>
                            <span className="inline-flex items-center gap-1.5 text-[12px] text-white/35 group-hover:text-[#F0B90B] transition-colors">
                              {lang === 'zh' ? '查看详情' : 'View Details'}
                              <ArrowRight className="h-3.5 w-3.5" />
                            </span>
                          </div>
                        </div>

                        {/* Right: Cover image / coin logo */}
                        <div className="hidden sm:flex items-center justify-center w-[180px] lg:w-[220px] shrink-0 p-6">
                          <div className={`relative w-full h-full flex items-center justify-center ${!hasCover ? 'opacity-10' : 'opacity-60'}`}>
                            <img
                              src={coverUrl}
                              alt={card.title}
                              className={`object-contain max-h-[120px] max-w-full ${
                                hasCover ? 'rounded-xl' : 'drop-shadow-[0_0_20px_rgba(255,255,255,0.1)]'
                              }`}
                            />
                          </div>
                        </div>
                      </div>
                    </article>
                  </Link>
                </motion.div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}

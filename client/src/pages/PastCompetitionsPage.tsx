import { useEffect, useState } from 'react';
import { Link } from 'wouter';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  Clock3,
  Coins,
  Users,
  Zap,
  Trophy,
  Bot,
  Swords,
} from 'lucide-react';
import { useT } from '@/lib/i18n';

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

function formatDate(ts: number): string {
  return new Date(ts).toLocaleString('zh-CN', {
    year: 'numeric',
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

function getParticipantModeLabel(mode: string | undefined, lang: string): string {
  if (mode === 'agent') return 'Agent vs Agent';
  return lang === 'zh' ? '人类对战' : 'Human vs Human';
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
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {completed.map((card, index) => (
              <motion.div
                key={card.id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.06 }}
              >
                <Link href={`/competitions/${card.slug}`} className="block group">
                  <article className="rounded-xl border border-white/[0.06] bg-[#0E1422]/80 p-5 transition-all duration-200 group-hover:border-white/[0.12] group-hover:bg-[#0E1422]">
                    {/* Type + status */}
                    <div className="flex items-center justify-between mb-3">
                      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-white/40">
                        {card.participantMode === 'agent' ? <Bot className="h-3 w-3" /> : <Swords className="h-3 w-3" />}
                        {getParticipantModeLabel(card.participantMode, lang)}
                      </span>
                      <span className="rounded-full bg-white/[0.06] px-2 py-0.5 text-[10px] font-medium text-white/35">
                        {lang === 'zh' ? '已结束' : 'Completed'}
                      </span>
                    </div>

                    {/* Trading pair */}
                    <div className="flex items-center gap-2 mb-3">
                      <Zap className="h-4 w-4 text-[#25C2A0]/60" />
                      <span className="text-[15px] font-semibold text-white/80">{getBaseAsset(card.symbol)}/USDT</span>
                    </div>

                    {/* Stats row */}
                    <div className="flex items-center gap-3 text-[11px] text-white/35">
                      <div className="flex items-center gap-1">
                        <Clock3 className="h-3 w-3" />
                        <span>{formatDate(card.endTime)}</span>
                      </div>
                      <div className="h-3 w-px bg-white/8" />
                      <div className="flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        <span>{card.registeredCount}</span>
                      </div>
                      {card.prizePool > 0 && (
                        <>
                          <div className="h-3 w-px bg-white/8" />
                          <div className="flex items-center gap-1">
                            <Coins className="h-3 w-3 text-[#F0B90B]/50" />
                            <span>{card.prizePool}U</span>
                          </div>
                        </>
                      )}
                    </div>
                  </article>
                </Link>
              </motion.div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

// ============================================================
// Landing Page — v4.0 Public Homepage for VARSITY Trading
// Fixed Prize Pool / Points-based Grand Final / Participation Tiers
// Sections: Hero, Rules, Prize, Leaderboard, Quant Bot, CTA
// ============================================================

import { useState, useMemo, useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import {
  Trophy, Zap, Clock, TrendingUp, Bot, ChevronRight,
  ArrowUpRight, ArrowDownRight, Target, BarChart3,
  Shield, Users, Timer, Activity, Award,
  ChevronDown, DollarSign, Star, Medal, Swords,
} from 'lucide-react';
import {
  generateLeaderboard,
  generateAllTimeLeaderboard,
  generateQuantBotStats,
} from '@/lib/mockData';
import {
  REGULAR_PRIZE_TABLE,
  GRAND_FINAL_PRIZE_TABLE,
  MATCH_POINTS_TABLE,
  HOLD_DURATION_WEIGHTS,
  RANK_TIERS,
  MIN_TRADES_FOR_PRIZE,
  POINTS_DECAY_FACTOR,
} from '@/lib/types';
import type { AllTimeLeaderboardEntry, QuantBotStats } from '@/lib/types';

interface LandingPageProps {
  onEnterArena: () => void;
}

// ─── Animated Section Wrapper ─────────────────────────────────
function Section({ children, className = '', id }: { children: React.ReactNode; className?: string; id?: string }) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-80px' });
  return (
    <motion.section
      ref={ref}
      id={id}
      initial={{ opacity: 0, y: 40 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.6, ease: 'easeOut' }}
      className={className}
    >
      {children}
    </motion.section>
  );
}

// ─── Section Title ────────────────────────────────────────────
function SectionTitle({ icon: Icon, title, subtitle }: { icon: any; title: string; subtitle: string }) {
  return (
    <div className="text-center mb-10">
      <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-[#F0B90B]/10 border border-[#F0B90B]/20 mb-4">
        <Icon className="w-6 h-6 text-[#F0B90B]" />
      </div>
      <h2 className="text-2xl md:text-3xl font-bold text-white mb-2" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
        {title}
      </h2>
      <p className="text-[#848E9C] text-sm max-w-md mx-auto">{subtitle}</p>
    </div>
  );
}

// ─── Bot Badge ────────────────────────────────────────────────
function BotBadge({ size = 'sm' }: { size?: 'sm' | 'md' }) {
  const s = size === 'sm' ? 'w-3.5 h-3.5' : 'w-5 h-5';
  return (
    <span className={`inline-flex items-center justify-center ${s} rounded bg-[#8B5CF6]/20 border border-[#8B5CF6]/40 text-[#A78BFA] font-bold shrink-0`} title="Quant Bot">
      <Bot className={size === 'sm' ? 'w-2.5 h-2.5' : 'w-3.5 h-3.5'} />
    </span>
  );
}

// ─── Rank Tier Badge (LoL-style) ─────────────────────────────
function TierBadge({ tier }: { tier: string }) {
  const found = RANK_TIERS.find(t => t.tier === tier);
  if (!found) return <span className="text-[9px] text-[#5E6673]">{tier}</span>;
  return (
    <span
      className="text-[9px] px-1.5 py-0.5 rounded font-semibold"
      style={{ background: `${found.color}15`, color: found.color }}
    >
      {found.icon} {found.labelEn}
    </span>
  );
}

// ─── Equity Chart (SVG) ───────────────────────────────────────
function EquityChart({ data }: { data: Array<{ time: number; equity: number }> }) {
  const width = 600;
  const height = 200;
  const padding = { top: 20, right: 10, bottom: 30, left: 50 };

  const { path, areaPath, minY, maxY, points } = useMemo(() => {
    if (data.length === 0) return { path: '', areaPath: '', minY: 0, maxY: 0, points: [] };
    const equities = data.map(d => d.equity);
    const minY = Math.min(...equities) - 20;
    const maxY = Math.max(...equities) + 20;
    const chartW = width - padding.left - padding.right;
    const chartH = height - padding.top - padding.bottom;

    const pts = data.map((d, i) => ({
      x: padding.left + (i / (data.length - 1)) * chartW,
      y: padding.top + (1 - (d.equity - minY) / (maxY - minY)) * chartH,
    }));

    const path = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ');
    const areaPath = path + ` L${pts[pts.length - 1].x},${padding.top + chartH} L${pts[0].x},${padding.top + chartH} Z`;

    return { path, areaPath, minY, maxY, points: pts };
  }, [data]);

  const isPositive = data.length > 1 && data[data.length - 1].equity >= data[0].equity;
  const color = isPositive ? '#0ECB81' : '#F6465D';

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto">
      <defs>
        <linearGradient id="equityGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      {[0, 0.25, 0.5, 0.75, 1].map(pct => {
        const y = padding.top + pct * (height - padding.top - padding.bottom);
        const val = maxY - pct * (maxY - minY);
        return (
          <g key={pct}>
            <line x1={padding.left} y1={y} x2={width - padding.right} y2={y} stroke="rgba(255,255,255,0.05)" />
            <text x={padding.left - 6} y={y + 3} textAnchor="end" fill="#5E6673" fontSize="9" fontFamily="DM Mono, monospace">
              {val.toFixed(0)}
            </text>
          </g>
        );
      })}
      {(() => {
        const baseY = padding.top + (1 - (5000 - minY) / (maxY - minY)) * (height - padding.top - padding.bottom);
        return <line x1={padding.left} y1={baseY} x2={width - padding.right} y2={baseY} stroke="#F0B90B" strokeOpacity="0.3" strokeDasharray="4 4" />;
      })()}
      <path d={areaPath} fill="url(#equityGrad)" />
      <path d={path} fill="none" stroke={color} strokeWidth="2" />
      {points.length > 0 && (
        <circle cx={points[points.length - 1].x} cy={points[points.length - 1].y} r="4" fill={color} stroke="#0B0E11" strokeWidth="2" />
      )}
    </svg>
  );
}

// ─── Main Landing Page ────────────────────────────────────────
export default function LandingPage({ onEnterArena }: LandingPageProps) {
  const [leaderboard] = useState(() => generateLeaderboard(285));
  const [allTimeLeaderboard] = useState(() => generateAllTimeLeaderboard());
  const [botStats] = useState(() => generateQuantBotStats());
  const [activeLeaderboard, setActiveLeaderboard] = useState<'current' | 'alltime'>('current');
  const [activePrize, setActivePrize] = useState<'regular' | 'grand'>('regular');

  return (
    <div className="min-h-screen bg-[#0B0E11] text-white overflow-x-hidden">
      {/* ─── Sticky Nav ──────────────────────────────────── */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-[#0B0E11]/90 backdrop-blur-md border-b border-white/5">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#F0B90B]/20 to-[#F0B90B]/5 border border-[#F0B90B]/20 flex items-center justify-center">
              <Trophy className="w-4 h-4 text-[#F0B90B]" />
            </div>
            <span className="text-sm font-bold tracking-wider" style={{ fontFamily: "'DM Mono', monospace" }}>
              VARSITY  Trading
            </span>
          </div>
          <div className="hidden md:flex items-center gap-6 text-xs text-[#848E9C]">
            <a href="#rules" className="hover:text-white transition-colors">规则</a>
            <a href="#prizes" className="hover:text-white transition-colors">奖金</a>
            <a href="#leaderboard" className="hover:text-white transition-colors">排行榜</a>
            <a href="#bot" className="hover:text-white transition-colors">量化程序</a>
          </div>
          <button
            onClick={onEnterArena}
            className="bg-[#F0B90B] text-[#0B0E11] text-xs font-bold px-4 py-2 rounded-lg hover:bg-[#F0B90B]/90 transition-colors"
          >
            进入竞技场
          </button>
        </div>
      </nav>

      {/* ─── Hero Section ────────────────────────────────── */}
      <section className="relative pt-14 min-h-[85vh] flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `linear-gradient(rgba(240,185,11,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(240,185,11,0.3) 1px, transparent 1px)`,
            backgroundSize: '80px 80px',
          }}
        />
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[900px] h-[900px] rounded-full opacity-[0.05]"
          style={{ background: 'radial-gradient(circle, #F0B90B 0%, transparent 60%)' }}
        />

        <div className="relative z-10 text-center max-w-3xl mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <div className="inline-flex items-center gap-2 bg-[#0ECB81]/10 border border-[#0ECB81]/20 rounded-full px-4 py-1.5 mb-6">
              <div className="w-2 h-2 rounded-full bg-[#0ECB81] animate-pulse" />
              <span className="text-[#0ECB81] text-xs font-medium">第 5 场比赛进行中 — 847/1000 人已加入</span>
            </div>

            <h1 className="text-4xl md:text-6xl font-bold mb-4 leading-tight" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              24小时加密货币
              <br />
              <span className="text-[#F0B90B]">交易竞技场</span>
            </h1>
            <p className="text-[#848E9C] text-base md:text-lg mb-8 max-w-xl mx-auto leading-relaxed">
              每月 15 场常规赛 + 总决赛，固定奖金池 500 USDT/场。
              <br />
              <span className="text-white/70">积分制晋级总决赛，量化程序同场对决。</span>
            </p>

            <div className="flex items-center justify-center gap-4 mb-10">
              <button
                onClick={onEnterArena}
                className="bg-gradient-to-r from-[#F0B90B] to-[#F0B90B]/85 text-[#0B0E11] font-bold px-8 py-3.5 rounded-xl text-sm hover:shadow-[0_0_30px_rgba(240,185,11,0.3)] transition-all duration-300 flex items-center gap-2"
              >
                立即参赛
                <ChevronRight className="w-4 h-4" />
              </button>
              <a
                href="#rules"
                className="border border-white/10 text-white/70 font-medium px-6 py-3.5 rounded-xl text-sm hover:border-white/20 hover:text-white transition-all"
              >
                了解规则
              </a>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.3 }}
            className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-lg mx-auto"
          >
            {[
              { value: '5,000', label: 'USDT 本金', color: '#F0B90B' },
              { value: '500', label: 'USDT 奖金/场', color: '#0ECB81' },
              { value: '15+1', label: '月赛+总决赛', color: '#D1D4DC' },
              { value: '24H', label: '比赛时长', color: '#D1D4DC' },
            ].map((stat, i) => (
              <div key={i} className="bg-[#1C2030]/50 border border-white/5 rounded-xl p-3 text-center">
                <div className="text-lg font-bold font-mono" style={{ color: stat.color }}>{stat.value}</div>
                <div className="text-[10px] text-[#5E6673] uppercase tracking-wider mt-0.5">{stat.label}</div>
              </div>
            ))}
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.5 }}
            className="mt-12"
          >
            <ChevronDown className="w-5 h-5 text-[#5E6673] mx-auto animate-bounce" />
          </motion.div>
        </div>
      </section>

      {/* ─── Rules Section ───────────────────────────────── */}
      <Section id="rules" className="py-20 px-4">
        <div className="max-w-5xl mx-auto">
          <SectionTitle icon={Target} title="比赛规则" subtitle="简单透明的规则，让每个人都能快速上手" />

          {/* Core rules - 6 cards */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
            {[
              {
                icon: Shield,
                title: '5,000U 模拟资金',
                desc: '所有段位本金相同，无爆仓风险。晋级解锁更高杠杆 (1x→3x)，更快拉开收益差距。',
                accent: '#F0B90B',
              },
              {
                icon: Activity,
                title: '最多 40 笔交易',
                desc: '每场比赛限制 40 笔交易，鼓励深思熟虑的决策。最后 30 分钟禁止开新仓，只能平仓。',
                accent: '#3B82F6',
              },
              {
                icon: Clock,
                title: '持仓时间权重',
                desc: '持仓越久权重越高（0.2x→1.3x）。快进快出只算 20%，鼓励有理由的持仓。',
                accent: '#8B5CF6',
              },
              {
                icon: DollarSign,
                title: '固定奖金池',
                desc: '每场常规赛 500 USDT，总决赛 2,500 USDT。冠军独享 55U（常规）/ 300U（总决赛）。',
                accent: '#0ECB81',
              },
              {
                icon: Star,
                title: '积分制总决赛',
                desc: '每场比赛按排名获得积分（冠军100分），月末累计积分前500名进入总决赛争夺大奖。',
                accent: '#F59E0B',
              },
              {
                icon: Medal,
                title: '最低 5 笔交易',
                desc: `每场比赛至少完成 ${MIN_TRADES_FOR_PRIZE} 笔交易才有奖金资格。简单明了，确保每位选手认真参与。`,
                accent: '#F6465D',
              },
            ].map((rule, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08 }}
                className="bg-[#1C2030]/60 border border-white/5 rounded-2xl p-5 hover:border-white/10 transition-all"
              >
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center mb-4"
                  style={{ background: `${rule.accent}15`, border: `1px solid ${rule.accent}30` }}
                >
                  <rule.icon className="w-5 h-5" style={{ color: rule.accent }} />
                </div>
                <h3 className="text-white font-semibold text-sm mb-2">{rule.title}</h3>
                <p className="text-[#848E9C] text-xs leading-relaxed">{rule.desc}</p>
              </motion.div>
            ))}
          </div>

          {/* Hold weight table */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="bg-[#1C2030]/40 border border-white/5 rounded-2xl p-6 max-w-2xl mx-auto mb-4"
          >
            <h3 className="text-white text-sm font-semibold mb-4 text-center">持仓时间权重表</h3>
            <div className="grid grid-cols-6 gap-2">
              {HOLD_DURATION_WEIGHTS.map((hw, i) => {
                const pct = Math.round((hw.weight / 1.3) * 100);
                return (
                  <div key={i} className="text-center">
                    <div className="h-16 bg-[#0B0E11] rounded-lg relative overflow-hidden mb-1.5">
                      <div
                        className="absolute bottom-0 left-0 right-0 rounded-b-lg transition-all"
                        style={{
                          height: `${pct}%`,
                          background: `linear-gradient(to top, #F0B90B${Math.round(pct * 0.6).toString(16).padStart(2, '0')}, transparent)`,
                        }}
                      />
                      <span className="absolute inset-0 flex items-center justify-center text-white text-xs font-bold font-mono">
                        {hw.weight}x
                      </span>
                    </div>
                    <span className="text-[9px] text-[#5E6673]">{hw.label}</span>
                  </div>
                );
              })}
            </div>
          </motion.div>

          {/* Eligibility + Rank Tiers */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="bg-[#1C2030]/40 border border-white/5 rounded-2xl p-6 max-w-2xl mx-auto"
          >
            <h3 className="text-white text-sm font-semibold mb-2 text-center">奖金资格 & 段位体系</h3>
            <p className="text-[10px] text-[#848E9C] text-center mb-4">
              每场至少完成 {MIN_TRADES_FOR_PRIZE} 笔交易即可获得奖金资格 · 累计赛季积分决定段位 · 每月积分 ×{POINTS_DECAY_FACTOR} 衰减
            </p>
            <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
              {RANK_TIERS.map((t, i) => (
                <div key={i} className="text-center bg-[#0B0E11]/60 rounded-xl p-3 border border-white/5 hover:border-white/10 transition-all">
                  <div className="text-xl mb-1">{t.icon}</div>
                  <div className="text-xs font-bold mb-0.5" style={{ color: t.color }}>{t.label}</div>
                  <div className="text-[9px] text-[#5E6673] mb-1">{t.minPoints}{t.maxPoints === Infinity ? '+' : `-${t.maxPoints}`} 分</div>
                  <div className="text-[10px] font-mono font-bold" style={{ color: t.color }}>{t.leverage}x</div>
                  <div className="text-[8px] text-[#5E6673] mt-0.5">杠杆</div>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </Section>

      {/* ─── Prize Section ───────────────────────────────── */}
      <Section id="prizes" className="py-20 px-4 bg-[#0D1117]">
        <div className="max-w-5xl mx-auto">
          <SectionTitle icon={DollarSign} title="奖金分配" subtitle="固定奖金池，排名越高奖金越多" />

          {/* Tab switcher */}
          <div className="flex items-center justify-center gap-2 mb-6">
            <button
              onClick={() => setActivePrize('regular')}
              className={`px-5 py-2 rounded-lg text-xs font-semibold transition-all ${
                activePrize === 'regular' ? 'bg-[#F0B90B] text-[#0B0E11]' : 'bg-white/5 text-[#848E9C] hover:text-white'
              }`}
            >
              常规赛 · 500 USDT
            </button>
            <button
              onClick={() => setActivePrize('grand')}
              className={`px-5 py-2 rounded-lg text-xs font-semibold transition-all ${
                activePrize === 'grand' ? 'bg-[#F0B90B] text-[#0B0E11]' : 'bg-white/5 text-[#848E9C] hover:text-white'
              }`}
            >
              总决赛 · 2,500 USDT
            </button>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {/* Prize table */}
            <motion.div
              key={activePrize}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="bg-[#1C2030]/60 border border-white/5 rounded-2xl overflow-hidden"
            >
              <div className="px-5 py-3 border-b border-white/5">
                <span className="text-white text-sm font-semibold">
                  {activePrize === 'regular' ? '常规赛奖金表' : '总决赛奖金表'}
                </span>
                <span className="text-[#F0B90B] text-xs ml-2 font-mono">
                  {activePrize === 'regular' ? '500 USDT' : '2,500 USDT'}
                </span>
              </div>
              <div className="grid grid-cols-[60px_1fr_80px_80px] px-5 py-2 text-[10px] text-[#5E6673] uppercase tracking-wider border-b border-white/5">
                <span>排名</span>
                <span>人数</span>
                <span className="text-right">单人奖金</span>
                <span className="text-right">小计</span>
              </div>
              {(activePrize === 'regular' ? REGULAR_PRIZE_TABLE : GRAND_FINAL_PRIZE_TABLE).map((tier, i) => (
                <div key={i} className="grid grid-cols-[60px_1fr_80px_80px] px-5 py-2.5 text-xs font-mono border-b border-white/[0.03] hover:bg-white/[0.02]">
                  <span className={i < 3 ? 'text-[#F0B90B] font-bold' : 'text-[#848E9C]'}>
                    {tier.rankMin === tier.rankMax ? `#${tier.rankMin}` : `#${tier.rankMin}-${tier.rankMax}`}
                  </span>
                  <span className="text-[#848E9C]">{tier.rankMax - tier.rankMin + 1} 人</span>
                  <span className="text-right text-[#0ECB81] font-semibold">{tier.prize} U</span>
                  <span className="text-right text-[#D1D4DC]">{tier.prize * (tier.rankMax - tier.rankMin + 1)} U</span>
                </div>
              ))}
              <div className="px-5 py-3 border-t border-white/5 flex justify-between text-xs">
                <span className="text-[#848E9C]">前 100 名均有奖金</span>
                <span className="text-[#F0B90B] font-bold font-mono">
                  共 {activePrize === 'regular' ? '500' : '2,500'} USDT
                </span>
              </div>
            </motion.div>

            {/* Points table + Promotion */}
            <div className="space-y-4">
              {/* Points table */}
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                className="bg-[#1C2030]/60 border border-white/5 rounded-2xl overflow-hidden"
              >
                <div className="px-5 py-3 border-b border-white/5">
                  <span className="text-white text-sm font-semibold">积分规则</span>
                  <span className="text-[#848E9C] text-xs ml-2">每场常规赛按排名获得积分</span>
                </div>
                <div className="grid grid-cols-[80px_1fr_80px] px-5 py-2 text-[10px] text-[#5E6673] uppercase tracking-wider border-b border-white/5">
                  <span>排名</span>
                  <span>人数</span>
                  <span className="text-right">积分</span>
                </div>
                {MATCH_POINTS_TABLE.map((tier, i) => (
                  <div key={i} className="grid grid-cols-[80px_1fr_80px] px-5 py-2 text-xs font-mono border-b border-white/[0.03]">
                    <span className={tier.points >= 50 ? 'text-[#F0B90B]' : 'text-[#848E9C]'}>
                      {tier.rankMin === tier.rankMax ? `#${tier.rankMin}` : `#${tier.rankMin}-${tier.rankMax}`}
                    </span>
                    <span className="text-[#848E9C]">{tier.rankMax - tier.rankMin + 1} 人</span>
                    <span className={`text-right font-semibold ${tier.points > 0 ? 'text-[#F0B90B]' : 'text-[#5E6673]'}`}>
                      {tier.points > 0 ? `+${tier.points}` : '0'}
                    </span>
                  </div>
                ))}
                <div className="px-5 py-2.5 text-[10px] text-[#848E9C] border-t border-white/5">
                  月末累计积分前 500 名进入总决赛
                </div>
              </motion.div>

              {/* Rank Tiers - Points driven */}
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                className="bg-[#1C2030]/60 border border-white/5 rounded-2xl p-5"
              >
                <h3 className="text-white text-sm font-semibold mb-3 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-[#F0B90B]" />
                  段位晋级体系
                </h3>
                <p className="text-[10px] text-[#848E9C] mb-3 leading-relaxed">
                  段位由累计赛季积分决定。所有段位本金相同（5,000 USDT），高段位解锁更高杠杆。每月积分 ×{POINTS_DECAY_FACTOR} 衰减，不参赛会自然降级。
                </p>
                <div className="space-y-2">
                  {RANK_TIERS.map((tier, i) => (
                    <div key={i} className="bg-[#0B0E11]/60 rounded-lg px-4 py-3 border border-white/[0.04]">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className="text-lg">{tier.icon}</span>
                          <span className="text-xs font-bold" style={{ color: tier.color }}>{tier.label} {tier.labelEn}</span>
                          <span className="text-white text-xs font-bold">{tier.leverage}x 杠杆</span>
                        </div>
                        <span className="text-[10px] text-[#5E6673] font-mono">
                          {tier.minPoints}{tier.maxPoints === Infinity ? '+' : `–${tier.maxPoints}`} 分
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            </div>
          </div>
        </div>
      </Section>

      {/* ─── Leaderboard Section ─────────────────────────── */}
      <Section id="leaderboard" className="py-20 px-4">
        <div className="max-w-5xl mx-auto">
          <SectionTitle icon={Award} title="排行榜" subtitle="单场按加权收益率排名，总榜按累计积分排名" />

          <div className="flex items-center justify-center gap-2 mb-6">
            <button
              onClick={() => setActiveLeaderboard('current')}
              className={`px-5 py-2 rounded-lg text-xs font-semibold transition-all ${
                activeLeaderboard === 'current' ? 'bg-[#F0B90B] text-[#0B0E11]' : 'bg-white/5 text-[#848E9C] hover:text-white'
              }`}
            >
              当前比赛 · 收益率
            </button>
            <button
              onClick={() => setActiveLeaderboard('alltime')}
              className={`px-5 py-2 rounded-lg text-xs font-semibold transition-all ${
                activeLeaderboard === 'alltime' ? 'bg-[#F0B90B] text-[#0B0E11]' : 'bg-white/5 text-[#848E9C] hover:text-white'
              }`}
            >
              赛季总榜 · 积分
            </button>
          </div>

          {/* Current Match Leaderboard - sorted by PnL% */}
          {activeLeaderboard === 'current' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="bg-[#1C2030]/60 border border-white/5 rounded-2xl overflow-hidden"
            >
              <div className="px-5 py-3 border-b border-white/5 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-white text-sm font-semibold">第 5 场 · SOLUSDT</span>
                  <span className="text-[9px] bg-[#0ECB81]/20 text-[#0ECB81] px-2 py-0.5 rounded-full font-medium">LIVE</span>
                </div>
                <span className="text-[#848E9C] text-xs">奖金池 500 USDT · 847 名选手</span>
              </div>
              <div className="grid grid-cols-[50px_1fr_80px_80px_60px_60px] px-5 py-2 text-[10px] text-[#5E6673] uppercase tracking-wider border-b border-white/5">
                <span>#</span>
                <span>选手</span>
                <span className="text-right">加权收益</span>
                <span className="text-right">盈亏</span>
                <span className="text-right">奖金</span>
                <span className="text-right">积分</span>
              </div>
              <div className="max-h-[400px] overflow-y-auto">
                {leaderboard.slice(0, 50).map((entry) => (
                  <div
                    key={entry.rank}
                    className={`grid grid-cols-[50px_1fr_80px_80px_60px_60px] px-5 py-2 text-xs font-mono border-b border-white/[0.02] hover:bg-white/[0.02] transition-colors ${
                      entry.isYou ? 'bg-[#F0B90B]/5 border-l-2 border-l-[#F0B90B]' : ''
                    } ${entry.isBot ? 'bg-[#8B5CF6]/5' : ''}`}
                  >
                    <span className={entry.rank <= 3 ? 'text-[#F0B90B] font-bold' : 'text-[#848E9C]'}>
                      {entry.rank <= 3 ? ['🥇', '🥈', '🥉'][entry.rank - 1] : entry.rank}
                    </span>
                    <span className="flex items-center gap-1.5">
                      {entry.isBot && <BotBadge />}
                      <span className={`truncate ${entry.isYou ? 'text-[#F0B90B] font-semibold' : entry.isBot ? 'text-[#A78BFA]' : 'text-[#D1D4DC]'}`}>
                        {entry.username}
                      </span>
                      {entry.isYou && <span className="text-[8px] bg-[#F0B90B]/20 text-[#F0B90B] px-1.5 py-0.5 rounded font-semibold">YOU</span>}
                      {!entry.prizeEligible && <span className="text-[8px] text-[#F6465D]/60">未达5笔</span>}
                    </span>
                    <span className={`text-right ${entry.pnlPct >= 0 ? 'text-[#0ECB81]' : 'text-[#F6465D]'}`}>
                      {entry.pnlPct >= 0 ? '+' : ''}{entry.pnlPct.toFixed(2)}%
                    </span>
                    <span className={`text-right ${entry.pnl >= 0 ? 'text-[#0ECB81]' : 'text-[#F6465D]'}`}>
                      {entry.pnl >= 0 ? '+' : ''}{entry.pnl.toFixed(1)}U
                    </span>
                    <span className={`text-right ${entry.prizeAmount > 0 ? 'text-[#F0B90B] font-semibold' : 'text-[#5E6673]'}`}>
                      {entry.prizeAmount > 0 ? `${entry.prizeAmount}U` : '—'}
                    </span>
                    <span className={`text-right ${entry.matchPoints > 0 ? 'text-[#F0B90B]' : 'text-[#5E6673]'}`}>
                      {entry.matchPoints > 0 ? `+${entry.matchPoints}` : '0'}
                    </span>
                  </div>
                ))}
              </div>
              <div className="px-5 py-3 border-t border-white/5 text-center">
                <span className="text-[#5E6673] text-xs">显示前 50 名 · 进入竞技场查看完整排名</span>
              </div>
            </motion.div>
          )}

          {/* All-Time Leaderboard - sorted by cumulative points */}
          {activeLeaderboard === 'alltime' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="bg-[#1C2030]/60 border border-white/5 rounded-2xl overflow-hidden"
            >
              <div className="px-5 py-3 border-b border-white/5 flex items-center justify-between">
                <span className="text-white text-sm font-semibold">2026年3月 · 赛季总榜</span>
                <span className="text-[#848E9C] text-xs">按累计积分排名 · 前500名进总决赛</span>
              </div>
              <div className="grid grid-cols-[50px_1fr_70px_60px_70px_60px_70px] px-5 py-2 text-[10px] text-[#5E6673] uppercase tracking-wider border-b border-white/5">
                <span>#</span>
                <span>选手</span>
                <span className="text-right">积分</span>
                <span className="text-right">场次</span>
                <span className="text-right">胜率</span>
                <span className="text-right">段位</span>
                <span className="text-right">总决赛</span>
              </div>
              <div className="max-h-[400px] overflow-y-auto">
                {allTimeLeaderboard.map((entry) => (
                  <div
                    key={entry.rank}
                    className={`grid grid-cols-[50px_1fr_70px_60px_70px_60px_70px] px-5 py-2 text-xs font-mono border-b border-white/[0.02] hover:bg-white/[0.02] transition-colors ${
                      entry.isBot ? 'bg-[#8B5CF6]/5' : ''
                    }`}
                  >
                    <span className={entry.rank <= 3 ? 'text-[#F0B90B] font-bold' : 'text-[#848E9C]'}>
                      {entry.rank <= 3 ? ['🥇', '🥈', '🥉'][entry.rank - 1] : entry.rank}
                    </span>
                    <span className="flex items-center gap-1.5">
                      {entry.isBot && <BotBadge />}
                      <span className={`truncate ${entry.isBot ? 'text-[#A78BFA]' : 'text-[#D1D4DC]'}`}>
                        {entry.username}
                      </span>
                    </span>
                    <span className="text-right text-[#F0B90B] font-bold">{entry.seasonPoints}</span>
                    <span className="text-right text-[#848E9C]">{entry.matchesPlayed}</span>
                    <span className="text-right text-[#D1D4DC]">{entry.winRate}%</span>
                    <span className="text-right">
                      <TierBadge tier={entry.rankTier} />
                    </span>
                    <span className="text-right">
                      {entry.grandFinalQualified ? (
                        <span className="text-[9px] bg-[#0ECB81]/15 text-[#0ECB81] px-1.5 py-0.5 rounded font-semibold">已晋级</span>
                      ) : (
                        <span className="text-[9px] text-[#5E6673]">—</span>
                      )}
                    </span>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </div>
      </Section>

      {/* ─── Quant Bot Showcase ───────────────────────────── */}
      <Section id="bot" className="py-20 px-4 bg-[#0D1117]">
        <div className="max-w-5xl mx-auto">
          <SectionTitle icon={Bot} title="量化程序对决" subtitle="官方量化策略 AlphaEngine v3 同场竞技，实时公开所有交易数据" />

          <div className="grid md:grid-cols-4 gap-4 mb-8">
            {[
              { label: '当前收益', value: `${botStats.totalReturn >= 0 ? '+' : ''}${botStats.totalReturn.toFixed(1)}U`, sub: `${botStats.totalReturnPct >= 0 ? '+' : ''}${botStats.totalReturnPct.toFixed(2)}%`, color: botStats.totalReturn >= 0 ? '#0ECB81' : '#F6465D' },
              { label: '胜率', value: `${botStats.winRate}%`, sub: `${botStats.totalTrades} 笔交易`, color: '#F0B90B' },
              { label: '最大回撤', value: `${botStats.maxDrawdown}%`, sub: '风控严格', color: '#F6465D' },
              { label: 'Sharpe Ratio', value: botStats.sharpeRatio.toFixed(2), sub: '风险调整收益', color: '#8B5CF6' },
            ].map((card, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="bg-[#1C2030]/60 border border-white/5 rounded-xl p-4 text-center"
              >
                <div className="text-[10px] text-[#5E6673] uppercase tracking-wider mb-1">{card.label}</div>
                <div className="text-xl font-bold font-mono" style={{ color: card.color }}>{card.value}</div>
                <div className="text-[10px] text-[#848E9C] mt-0.5">{card.sub}</div>
              </motion.div>
            ))}
          </div>

          {/* Equity curve */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="bg-[#1C2030]/60 border border-white/5 rounded-2xl p-5 mb-8"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <BotBadge size="md" />
                <span className="text-white text-sm font-semibold">AlphaEngine v3 · 权益曲线</span>
              </div>
              {botStats.currentPosition && (
                <div className={`flex items-center gap-1.5 text-xs px-3 py-1 rounded-full ${
                  botStats.currentPosition.direction === 'long' ? 'bg-[#0ECB81]/10 text-[#0ECB81]' : 'bg-[#F6465D]/10 text-[#F6465D]'
                }`}>
                  {botStats.currentPosition.direction === 'long' ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                  <span className="font-mono font-semibold">
                    {botStats.currentPosition.direction.toUpperCase()} {botStats.currentPosition.size}U
                  </span>
                  <span className="opacity-70">@ {botStats.currentPosition.entryPrice}</span>
                </div>
              )}
            </div>
            <EquityChart data={botStats.equityCurve} />
          </motion.div>

          {/* Bot vs Humans + Recent trades */}
          <div className="grid md:grid-cols-2 gap-4">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="bg-[#1C2030]/60 border border-white/5 rounded-2xl p-5"
            >
              <h3 className="text-white text-sm font-semibold mb-4 flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-[#F0B90B]" />
                量化 vs 人类选手
              </h3>
              <div className="space-y-3">
                {[
                  { label: '收益率', bot: `${botStats.vsHumans.botReturnPct >= 0 ? '+' : ''}${botStats.vsHumans.botReturnPct.toFixed(2)}%`, human: `+${botStats.vsHumans.avgHumanReturnPct}%`, top: `+${botStats.vsHumans.topHumanReturnPct}%` },
                  { label: '胜率', bot: `${botStats.vsHumans.botWinRate}%`, human: `${botStats.vsHumans.avgHumanWinRate}%`, top: null },
                  { label: '最大回撤', bot: `${botStats.vsHumans.botMaxDrawdown}%`, human: `${botStats.vsHumans.avgHumanMaxDrawdown}%`, top: null },
                  { label: 'Sharpe', bot: `${botStats.vsHumans.botSharpe}`, human: `${botStats.vsHumans.avgHumanSharpe}`, top: null },
                ].map((row, i) => (
                  <div key={i} className="grid grid-cols-[80px_1fr_1fr_1fr] items-center text-xs gap-2">
                    <span className="text-[#848E9C]">{row.label}</span>
                    <div className="text-center">
                      <div className="text-[#A78BFA] font-mono font-semibold">{row.bot}</div>
                      <div className="text-[8px] text-[#5E6673]">Bot</div>
                    </div>
                    <div className="text-center">
                      <div className="text-[#D1D4DC] font-mono">{row.human}</div>
                      <div className="text-[8px] text-[#5E6673]">人类均值</div>
                    </div>
                    <div className="text-center">
                      {row.top ? (
                        <>
                          <div className="text-[#F0B90B] font-mono">{row.top}</div>
                          <div className="text-[8px] text-[#5E6673]">人类最佳</div>
                        </>
                      ) : (
                        <span className="text-[#5E6673]">—</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="bg-[#1C2030]/60 border border-white/5 rounded-2xl p-5"
            >
              <h3 className="text-white text-sm font-semibold mb-4 flex items-center gap-2">
                <Activity className="w-4 h-4 text-[#0ECB81]" />
                最近交易记录
              </h3>
              <div className="space-y-2">
                {botStats.recentTrades.map((trade) => (
                  <div key={trade.id} className="flex items-center justify-between py-2 border-b border-white/[0.03] last:border-0">
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                        trade.direction === 'long' ? 'bg-[#0ECB81]/10 text-[#0ECB81]' : 'bg-[#F6465D]/10 text-[#F6465D]'
                      }`}>
                        {trade.direction === 'long' ? 'LONG' : 'SHORT'}
                      </span>
                      <span className="text-[#848E9C] text-[10px] font-mono">
                        {trade.entryPrice} → {trade.exitPrice}
                      </span>
                    </div>
                    <div className="text-right">
                      <div className={`text-xs font-mono font-semibold ${trade.pnl >= 0 ? 'text-[#0ECB81]' : 'text-[#F6465D]'}`}>
                        {trade.pnl >= 0 ? '+' : ''}{trade.pnl.toFixed(1)}U
                      </div>
                      <div className="text-[9px] text-[#5E6673]">{trade.holdDuration}</div>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        </div>
      </Section>

      {/* ─── CTA Section ─────────────────────────────────── */}
      <Section className="py-20 px-4">
        <div className="max-w-2xl mx-auto text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-[#F0B90B]/20 to-[#F0B90B]/5 border border-[#F0B90B]/20 mb-6">
            <Zap className="w-8 h-8 text-[#F0B90B]" />
          </div>
          <h2 className="text-2xl md:text-3xl font-bold text-white mb-3" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            准备好挑战了吗？
          </h2>
          <p className="text-[#848E9C] text-sm mb-8 max-w-md mx-auto">
            免费参赛，零风险。每月 15 场常规赛 + 总决赛，与千名交易者和量化程序同台竞技。
          </p>
          <button
            onClick={onEnterArena}
            className="bg-gradient-to-r from-[#F0B90B] to-[#F0B90B]/85 text-[#0B0E11] font-bold px-10 py-4 rounded-xl text-sm hover:shadow-[0_0_40px_rgba(240,185,11,0.3)] transition-all duration-300 flex items-center gap-2 mx-auto"
          >
            立即进入竞技场
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </Section>

      {/* ─── Footer ──────────────────────────────────────── */}
      <footer className="py-8 px-4 border-t border-white/5">
        <div className="max-w-5xl mx-auto flex items-center justify-between text-[10px] text-[#5E6673]">
          <div className="flex items-center gap-2">
            <Trophy className="w-3 h-3 text-[#F0B90B]" />
            <span>VARSITY Trading © 2026</span>
          </div>
          <div>
            模拟交易 · 无真实资金风险
          </div>
        </div>
      </footer>
    </div>
  );
}

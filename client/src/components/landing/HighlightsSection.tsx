import { useT } from '@/lib/i18n';
import { motion } from 'framer-motion';
import { Link } from 'wouter';
import {
  Shield,
  Trophy,
  Layers,
  ChevronRight,
  Zap,
  DollarSign,
  Crown,
} from 'lucide-react';
import { RANK_TIERS } from '@/lib/types';

export default function HighlightsSection() {
  const { t, lang } = useT();

  const copy = lang === 'zh'
    ? {
        title: '核心机制',
        subtitle: '了解比赛规则、奖金分配和段位系统',
        rulesTitle: '比赛规则',
        rulesDesc: '5,000U 模拟资金 · 24 小时赛制 · 至少 4 笔交易才有奖金资格',
        rulesItems: [
          { icon: Shield, text: '5,000 USDT 模拟资金，所有段位相同' },
          { icon: Zap, text: '交易质量优先，鼓励精准决策' },
          { icon: DollarSign, text: '至少完成 4 笔交易才有奖金资格' },
        ],
        prizeTitle: '奖金池',
        prizeDesc: '每场常规赛 500U，总决赛 2,500U。前 100 名均可获奖，同时累积赛季积分。',
        prizeItems: [
          { label: '常规赛', value: '500U / 场' },
          { label: '总决赛', value: '2,500U' },
          { label: '获奖名额', value: 'Top 100' },
        ],
        tierTitle: '段位系统',
        tierDesc: '赛季积分决定段位，高段位解锁更高杠杆倍数（1x → 3x），每月衰减 ×0.8。',
        viewAll: '查看完整规则',
      }
    : {
        title: 'Core Mechanics',
        subtitle: 'Understand the rules, prizes, and tier system',
        rulesTitle: 'Competition Rules',
        rulesDesc: '5,000U simulated capital · 24h format · Min 4 trades to qualify',
        rulesItems: [
          { icon: Shield, text: '5,000 USDT simulated capital, same for all tiers' },
          { icon: Zap, text: 'Trade quality first, rewarding precision' },
          { icon: DollarSign, text: 'Min 4 trades required for prize eligibility' },
        ],
        prizeTitle: 'Prize Pool',
        prizeDesc: '500U per regular match, 2,500U for Grand Final. Top 100 earn prizes and season points.',
        prizeItems: [
          { label: 'Regular', value: '500U / match' },
          { label: 'Grand Final', value: '2,500U' },
          { label: 'Winners', value: 'Top 100' },
        ],
        tierTitle: 'Tier System',
        tierDesc: 'Season points determine tier. Higher tiers unlock more leverage (1x → 3x). Monthly decay ×0.8.',
        viewAll: 'View Full Rules',
      };

  return (
    <section id="highlights" className="py-20">
      <div className="max-w-7xl mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center"
        >
          <h2 className="text-2xl sm:text-3xl font-display font-bold text-white">
            {copy.title}
          </h2>
          <p className="mt-3 text-[14px] text-[#848E9C]">
            {copy.subtitle}
          </p>
        </motion.div>

        <div className="mt-12 grid gap-5 lg:grid-cols-3">
          {/* Rules Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="rounded-[28px] border border-white/[0.06] bg-gradient-to-b from-[#161B27] to-[#0F131C] p-6 hover:border-white/[0.12] transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#F0B90B]/10 flex items-center justify-center">
                <Shield className="w-5 h-5 text-[#F0B90B]" />
              </div>
              <h3 className="text-lg font-semibold text-white">{copy.rulesTitle}</h3>
            </div>
            <div className="mt-4 space-y-3">
              {copy.rulesItems.map(({ icon: Icon, text }, i) => (
                <div key={i} className="flex items-start gap-2.5">
                  <Icon className="w-4 h-4 mt-0.5 text-[#5E6673] shrink-0" />
                  <span className="text-[13px] text-[#A7B0BF] leading-relaxed">{text}</span>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Prize Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.08 }}
            className="rounded-[28px] border border-white/[0.06] bg-gradient-to-b from-[#161B27] to-[#0F131C] p-6 hover:border-white/[0.12] transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#0ECB81]/10 flex items-center justify-center">
                <Trophy className="w-5 h-5 text-[#0ECB81]" />
              </div>
              <h3 className="text-lg font-semibold text-white">{copy.prizeTitle}</h3>
            </div>
            <p className="mt-4 text-[13px] text-[#A7B0BF] leading-relaxed">
              {copy.prizeDesc}
            </p>
            <div className="mt-4 grid grid-cols-3 gap-2">
              {copy.prizeItems.map(({ label, value }) => (
                <div
                  key={label}
                  className="rounded-xl bg-white/[0.03] border border-white/[0.04] px-3 py-2.5 text-center"
                >
                  <div className="text-[10px] uppercase tracking-wider text-[#5E6673]">{label}</div>
                  <div className="mt-1 text-sm font-bold text-[#F0B90B]">{value}</div>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Tier Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.16 }}
            className="rounded-[28px] border border-white/[0.06] bg-gradient-to-b from-[#161B27] to-[#0F131C] p-6 hover:border-white/[0.12] transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#C084FC]/10 flex items-center justify-center">
                <Layers className="w-5 h-5 text-[#C084FC]" />
              </div>
              <h3 className="text-lg font-semibold text-white">{copy.tierTitle}</h3>
            </div>
            <p className="mt-4 text-[13px] text-[#A7B0BF] leading-relaxed">
              {copy.tierDesc}
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              {RANK_TIERS.map((tier) => (
                <div
                  key={tier.tier}
                  className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium"
                  style={{ background: `${tier.color}15`, color: tier.color }}
                >
                  <span>{tier.icon}</span>
                  <span>{lang === 'zh' ? tier.label : tier.labelEn}</span>
                  <span className="text-[10px] opacity-60">{tier.leverage}x</span>
                </div>
              ))}
            </div>
          </motion.div>
        </div>

        {/* View Full Rules Link */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.2 }}
          className="mt-8 text-center"
        >
          <Link
            href="/rules"
            className="inline-flex items-center gap-2 text-[13px] font-medium text-[#F0B90B] hover:text-[#F0B90B]/80 transition-colors"
          >
            {copy.viewAll}
            <ChevronRight className="w-4 h-4" />
          </Link>
        </motion.div>
      </div>
    </section>
  );
}

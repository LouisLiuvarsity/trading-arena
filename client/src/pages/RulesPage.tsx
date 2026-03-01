// ============================================================
// Rules Introduction Page — Competition mechanics overview
// Design: Obsidian Exchange — Dark, structured, informative
// Shows before entering the trading interface
// ============================================================

import { useState } from 'react';
import {
  Trophy, Clock, TrendingUp, Shield, Zap, ChevronRight,
  ArrowUpRight, ArrowDownRight, Target, AlertTriangle, Star,
  BarChart3, Users, Timer, Wallet, Award
} from 'lucide-react';

interface RulesPageProps {
  username: string;
  onEnterArena: () => void;
}

export default function RulesPage({ username, onEnterArena }: RulesPageProps) {
  const [currentSection, setCurrentSection] = useState(0);
  const [isReady, setIsReady] = useState(false);

  const sections = [
    {
      id: 'overview',
      title: '比赛概览',
      icon: Trophy,
      color: '#F0B90B',
    },
    {
      id: 'trading',
      title: '交易规则',
      icon: BarChart3,
      color: '#0ECB81',
    },
    {
      id: 'scoring',
      title: '积分与分润',
      icon: Wallet,
      color: '#F0B90B',
    },
    {
      id: 'promotion',
      title: '晋级体系',
      icon: Award,
      color: '#3B82F6',
    },
  ];

  const handleNext = () => {
    if (currentSection < sections.length - 1) {
      setCurrentSection(prev => prev + 1);
    } else {
      setIsReady(true);
    }
  };

  const handlePrev = () => {
    if (currentSection > 0) {
      setCurrentSection(prev => prev - 1);
    }
  };

  return (
    <div className="h-screen w-screen bg-[#0B0E11] flex flex-col overflow-hidden">
      {/* Header */}
      <div className="h-12 border-b border-[rgba(255,255,255,0.06)] flex items-center justify-between px-6 shrink-0">
        <div className="flex items-center gap-3">
          <Trophy className="w-4 h-4 text-[#F0B90B]" />
          <span className="text-white text-sm font-bold" style={{ fontFamily: "'DM Mono', monospace" }}>TRADING ARENA</span>
          <span className="text-[#5E6673] text-xs">/ Rules</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[#848E9C] text-xs">Welcome, </span>
          <span className="text-[#F0B90B] text-xs font-medium" style={{ fontFamily: "'DM Mono', monospace" }}>{username}</span>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left: Section navigation */}
        <div className="w-[220px] border-r border-[rgba(255,255,255,0.06)] p-4 shrink-0">
          <div className="text-[#5E6673] text-[10px] uppercase tracking-wider mb-4">Competition Guide</div>
          <div className="space-y-1">
            {sections.map((section, idx) => {
              const Icon = section.icon;
              const isActive = idx === currentSection;
              const isPast = idx < currentSection;
              return (
                <button
                  key={section.id}
                  onClick={() => setCurrentSection(idx)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-all duration-200 ${
                    isActive
                      ? 'bg-[rgba(255,255,255,0.06)] text-white'
                      : isPast
                        ? 'text-[#0ECB81] hover:bg-[rgba(255,255,255,0.03)]'
                        : 'text-[#5E6673] hover:bg-[rgba(255,255,255,0.03)] hover:text-[#848E9C]'
                  }`}
                >
                  <div className={`w-6 h-6 rounded-md flex items-center justify-center shrink-0 ${
                    isActive ? 'bg-[#F0B90B]/15' : isPast ? 'bg-[#0ECB81]/10' : 'bg-[rgba(255,255,255,0.04)]'
                  }`}>
                    {isPast ? (
                      <div className="w-2 h-2 rounded-full bg-[#0ECB81]" />
                    ) : (
                      <Icon className="w-3.5 h-3.5" style={{ color: isActive ? section.color : undefined }} />
                    )}
                  </div>
                  <span className="text-xs font-medium">{section.title}</span>
                </button>
              );
            })}
          </div>

          {/* Progress */}
          <div className="mt-6 px-3">
            <div className="flex items-center justify-between text-[10px] text-[#5E6673] mb-1.5">
              <span>Progress</span>
              <span>{currentSection + 1}/{sections.length}</span>
            </div>
            <div className="h-1 bg-[rgba(255,255,255,0.06)] rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-[#F0B90B] to-[#0ECB81] rounded-full transition-all duration-500"
                style={{ width: `${((currentSection + 1) / sections.length) * 100}%` }}
              />
            </div>
          </div>
        </div>

        {/* Right: Content area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto p-8">
            <div className="max-w-[720px] mx-auto">
              {/* Section 0: Overview */}
              {currentSection === 0 && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-2xl font-bold text-white mb-2">24小时 Crypto 交易竞技场</h2>
                    <p className="text-[#848E9C] text-sm leading-relaxed">
                      免费参赛，平台提供 <span className="text-[#F0B90B] font-bold">5,000 USDT</span> 隔离本金。
                      与 1,000 名交易者同场竞技，交易单一永续合约，争夺排名和利润分成。
                    </p>
                  </div>

                  {/* Key parameters */}
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { icon: Wallet, label: '比赛本金', value: '5,000 USDT', desc: '平台提供，无需充值', color: '#F0B90B' },
                      { icon: Shield, label: '杠杆', value: '1x（无杠杆）', desc: '不可能爆仓', color: '#0ECB81' },
                      { icon: Clock, label: '比赛时长', value: '24 小时', desc: '覆盖多个市场周期', color: '#3B82F6' },
                      { icon: Users, label: '每场人数', value: '1,000 人', desc: '按收益率排名', color: '#848E9C' },
                      { icon: Target, label: '交易品种', value: 'HYPERUSDT 永续', desc: '纯择时问题', color: '#F0B90B' },
                      { icon: Timer, label: '交易次数', value: '最多 40 笔', desc: '鼓励少而精', color: '#F6465D' },
                    ].map((item, i) => {
                      const Icon = item.icon;
                      return (
                        <div key={i} className="bg-[#1C2030]/60 border border-[rgba(255,255,255,0.04)] rounded-lg p-4 flex items-start gap-3">
                          <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: `${item.color}15` }}>
                            <Icon className="w-4 h-4" style={{ color: item.color }} />
                          </div>
                          <div>
                            <div className="text-[#5E6673] text-[10px] uppercase tracking-wider">{item.label}</div>
                            <div className="text-white text-sm font-bold mt-0.5" style={{ fontFamily: "'DM Mono', monospace" }}>{item.value}</div>
                            <div className="text-[#5E6673] text-[10px] mt-0.5">{item.desc}</div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* 3-match cycle */}
                  <div className="bg-[#1C2030]/60 border border-[rgba(255,255,255,0.04)] rounded-lg p-5">
                    <div className="text-white text-sm font-bold mb-3 flex items-center gap-2">
                      <Zap className="w-4 h-4 text-[#F0B90B]" />
                      3 场周期制
                    </div>
                    <div className="flex items-center gap-3">
                      {[
                        { num: 1, label: '试探期', desc: '熟悉环境，建立基线', status: 'completed' },
                        { num: 2, label: '认真期', desc: '计算晋级，策略分化', status: 'active' },
                        { num: 3, label: '决胜期', desc: '最终排名，提现结算', status: 'pending' },
                      ].map((match, i) => (
                        <div key={i} className="flex-1 flex items-center gap-3">
                          <div className={`flex-1 rounded-lg p-3 border ${
                            match.status === 'active'
                              ? 'bg-[#F0B90B]/10 border-[#F0B90B]/30'
                              : match.status === 'completed'
                                ? 'bg-[#0ECB81]/5 border-[#0ECB81]/20'
                                : 'bg-[rgba(255,255,255,0.02)] border-[rgba(255,255,255,0.04)]'
                          }`}>
                            <div className="flex items-center gap-2 mb-1">
                              <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                                match.status === 'active' ? 'bg-[#F0B90B] text-[#0B0E11]' :
                                match.status === 'completed' ? 'bg-[#0ECB81] text-white' :
                                'bg-[rgba(255,255,255,0.1)] text-[#5E6673]'
                              }`}>
                                {match.num}
                              </div>
                              <span className={`text-xs font-medium ${
                                match.status === 'active' ? 'text-[#F0B90B]' :
                                match.status === 'completed' ? 'text-[#0ECB81]' : 'text-[#5E6673]'
                              }`}>{match.label}</span>
                            </div>
                            <div className="text-[#5E6673] text-[10px]">{match.desc}</div>
                          </div>
                          {i < 2 && <ChevronRight className="w-4 h-4 text-[#5E6673] shrink-0" />}
                        </div>
                      ))}
                    </div>
                    <div className="mt-3 text-[#848E9C] text-[10px]">
                      完成 3 场后可提现。各场亏损独立结算，不侵蚀往期利润。
                    </div>
                  </div>
                </div>
              )}

              {/* Section 1: Trading Rules */}
              {currentSection === 1 && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-2xl font-bold text-white mb-2">交易规则</h2>
                    <p className="text-[#848E9C] text-sm leading-relaxed">
                      只提供裸K线和成交量，不提供任何技术指标。每笔交易有持仓时长权重——持仓越久，盈亏权重越高。
                    </p>
                  </div>

                  {/* Position rules */}
                  <div className="bg-[#1C2030]/60 border border-[rgba(255,255,255,0.04)] rounded-lg p-5">
                    <div className="text-white text-sm font-bold mb-4 flex items-center gap-2">
                      <BarChart3 className="w-4 h-4 text-[#0ECB81]" />
                      持仓规则
                    </div>
                    <div className="space-y-3">
                      <div className="flex items-center gap-3">
                        <ArrowUpRight className="w-4 h-4 text-[#0ECB81] shrink-0" />
                        <div className="text-[#D1D4DC] text-xs">
                          <span className="text-[#0ECB81] font-bold">做多 (Long)</span> — 预期价格上涨时开仓
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <ArrowDownRight className="w-4 h-4 text-[#F6465D] shrink-0" />
                        <div className="text-[#D1D4DC] text-xs">
                          <span className="text-[#F6465D] font-bold">做空 (Short)</span> — 预期价格下跌时开仓
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Shield className="w-4 h-4 text-[#848E9C] shrink-0" />
                        <div className="text-[#D1D4DC] text-xs">
                          同一时间只能持有 <span className="text-white font-bold">1 个仓位</span>，仓位大小可自选
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Clock className="w-4 h-4 text-[#848E9C] shrink-0" />
                        <div className="text-[#D1D4DC] text-xs">
                          单笔持仓上限 <span className="text-white font-bold">4 小时</span>，到时自动平仓
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Target className="w-4 h-4 text-[#848E9C] shrink-0" />
                        <div className="text-[#D1D4DC] text-xs">
                          可设置 <span className="text-[#0ECB81] font-bold">止盈 (TP)</span> 和 <span className="text-[#F6465D] font-bold">止损 (SL)</span>，价格触及自动平仓
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Hold duration weight table */}
                  <div className="bg-[#1C2030]/60 border border-[rgba(255,255,255,0.04)] rounded-lg p-5">
                    <div className="text-white text-sm font-bold mb-3 flex items-center gap-2">
                      <Timer className="w-4 h-4 text-[#F0B90B]" />
                      持仓时长权重 — 越久越值钱
                    </div>
                    <div className="text-[#848E9C] text-[10px] mb-3">
                      盈亏和积分都会乘以对应权重。短线快进快出的权重很低（0.2x），鼓励有信心的持仓。
                    </div>
                    <div className="overflow-hidden rounded-lg border border-[rgba(255,255,255,0.06)]">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="bg-[rgba(255,255,255,0.03)]">
                            <th className="text-left text-[#5E6673] font-medium px-3 py-2">持仓时长</th>
                            <th className="text-center text-[#5E6673] font-medium px-3 py-2">权重</th>
                            <th className="text-right text-[#5E6673] font-medium px-3 py-2">效果</th>
                          </tr>
                        </thead>
                        <tbody>
                          {[
                            { duration: '< 1 分钟', weight: '0.2x', effect: '惩罚闪电交易', color: '#F6465D' },
                            { duration: '1-3 分钟', weight: '0.4x', effect: '低权重', color: '#F6465D' },
                            { duration: '3-10 分钟', weight: '0.7x', effect: '中等权重', color: '#F0B90B' },
                            { duration: '10-30 分钟', weight: '1.0x', effect: '标准权重', color: '#D1D4DC' },
                            { duration: '30分钟-2小时', weight: '1.15x', effect: '奖励持仓', color: '#0ECB81' },
                            { duration: '2-4 小时', weight: '1.3x', effect: '最高奖励', color: '#0ECB81' },
                          ].map((row, i) => (
                            <tr key={i} className="border-t border-[rgba(255,255,255,0.04)]">
                              <td className="text-[#D1D4DC] px-3 py-2">{row.duration}</td>
                              <td className="text-center px-3 py-2">
                                <span className="font-bold" style={{ color: row.color, fontFamily: "'DM Mono', monospace" }}>
                                  {row.weight}
                                </span>
                              </td>
                              <td className="text-right text-[#848E9C] px-3 py-2">{row.effect}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* What's NOT provided */}
                  <div className="bg-[#F6465D]/5 border border-[#F6465D]/20 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <AlertTriangle className="w-4 h-4 text-[#F6465D]" />
                      <span className="text-[#F6465D] text-xs font-bold">刻意不提供</span>
                    </div>
                    <div className="text-[#848E9C] text-[10px] space-y-1">
                      <p>• 无技术指标（MA、RSI、MACD 等）— 只有裸K线和成交量</p>
                      <p>• 无历史回测 — 不能用过去验证策略</p>
                      <p>• 无模拟交易 — 每一笔都是真实排名</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Section 2: Scoring & Profit Sharing */}
              {currentSection === 2 && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-2xl font-bold text-white mb-2">积分与利润分成</h2>
                    <p className="text-[#848E9C] text-sm leading-relaxed">
                      参与度积分决定你的利润分成比例。积分 = 仓位大小 × 持仓时长权重。交易越多、仓位越大、持仓越久，积分越高。
                    </p>
                  </div>

                  {/* Profit sharing tiers */}
                  <div className="bg-[#1C2030]/60 border border-[rgba(255,255,255,0.04)] rounded-lg p-5">
                    <div className="text-white text-sm font-bold mb-4 flex items-center gap-2">
                      <Wallet className="w-4 h-4 text-[#F0B90B]" />
                      利润分成梯度
                    </div>
                    <div className="space-y-2">
                      {[
                        { tier: '< 10,000 积分', pct: '10%', color: '#848E9C', bg: 'rgba(255,255,255,0.03)', width: '25%' },
                        { tier: '10,000 - 25,000', pct: '15%', color: '#F0B90B', bg: '#F0B90B10', width: '50%' },
                        { tier: '25,000 - 40,000', pct: '20%', color: '#F0B90B', bg: '#F0B90B15', width: '75%' },
                        { tier: '≥ 40,000 积分', pct: '25%', color: '#0ECB81', bg: '#0ECB8115', width: '100%' },
                      ].map((tier, i) => (
                        <div key={i} className="flex items-center gap-3 rounded-lg p-3" style={{ background: tier.bg }}>
                          <div className="w-16 text-[10px] text-[#5E6673] shrink-0">{tier.tier}</div>
                          <div className="flex-1">
                            <div className="h-2 bg-[rgba(255,255,255,0.06)] rounded-full overflow-hidden">
                              <div className="h-full rounded-full transition-all duration-500" style={{ width: tier.width, background: tier.color }} />
                            </div>
                          </div>
                          <div className="text-sm font-bold shrink-0" style={{ color: tier.color, fontFamily: "'DM Mono', monospace" }}>
                            {tier.pct}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Example calculation */}
                  <div className="bg-[#1C2030]/60 border border-[rgba(255,255,255,0.04)] rounded-lg p-5">
                    <div className="text-white text-sm font-bold mb-3 flex items-center gap-2">
                      <Star className="w-4 h-4 text-[#F0B90B]" />
                      积分计算示例
                    </div>
                    <div className="space-y-3 text-xs">
                      <div className="bg-[rgba(255,255,255,0.03)] rounded-lg p-3">
                        <div className="text-[#D1D4DC]">
                          <span className="text-[#F0B90B]">2,500U 仓位</span> × 持仓 15 分钟（权重 1.0x）
                        </div>
                        <div className="text-[#0ECB81] font-bold mt-1" style={{ fontFamily: "'DM Mono', monospace" }}>
                          = 2,500 积分 → 需 16 笔达到 40,000（25% 分成）
                        </div>
                      </div>
                      <div className="bg-[rgba(255,255,255,0.03)] rounded-lg p-3">
                        <div className="text-[#D1D4DC]">
                          <span className="text-[#F0B90B]">5,000U 满仓</span> × 持仓 35 分钟（权重 1.15x）
                        </div>
                        <div className="text-[#0ECB81] font-bold mt-1" style={{ fontFamily: "'DM Mono', monospace" }}>
                          = 5,750 积分 → 需 7 笔达到 40,000（25% 分成）
                        </div>
                      </div>
                      <div className="bg-[#F6465D]/5 rounded-lg p-3 border border-[#F6465D]/10">
                        <div className="text-[#D1D4DC]">
                          <span className="text-[#F6465D]">500U 小仓位</span> × 持仓 5 分钟（权重 0.7x）
                        </div>
                        <div className="text-[#F6465D] font-bold mt-1" style={{ fontFamily: "'DM Mono', monospace" }}>
                          = 350 积分 → 需 115 笔（超过 40 笔上限，不可能！）
                        </div>
                      </div>
                    </div>
                    <div className="mt-3 text-[#848E9C] text-[10px]">
                      小仓位短持仓几乎不可能达到最高分成。你必须用有意义的仓位和持仓时长来积累积分。
                    </div>
                  </div>

                  {/* Withdrawable calculation */}
                  <div className="bg-[#0ECB81]/5 border border-[#0ECB81]/20 rounded-lg p-4">
                    <div className="text-[#0ECB81] text-xs font-bold mb-2">💰 可提现金额 = 累计盈利 × 分成比例</div>
                    <div className="text-[#848E9C] text-[10px]">
                      例：3 场累计盈利 +500U，积分达到 40,000（25% 分成）→ 可提现 125U。
                      各场亏损独立结算，不会侵蚀往期利润。
                    </div>
                  </div>
                </div>
              )}

              {/* Section 3: Promotion System */}
              {currentSection === 3 && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-2xl font-bold text-white mb-2">晋级体系</h2>
                    <p className="text-[#848E9C] text-sm leading-relaxed">
                      3 场平均排名前 30% 即可晋级到更高阶段——更大本金、更高杠杆、更多盈利空间。
                    </p>
                  </div>

                  {/* Stage progression */}
                  <div className="bg-[#1C2030]/60 border border-[rgba(255,255,255,0.04)] rounded-lg p-5">
                    <div className="text-white text-sm font-bold mb-4 flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-[#0ECB81]" />
                      阶段结构
                    </div>
                    <div className="space-y-3">
                      {[
                        { stage: 1, name: '入门', capital: '5,000U', leverage: '1x', promote: '前30%晋级', demote: '无', color: '#848E9C', active: true },
                        { stage: 2, name: '进阶', capital: '10,000U', leverage: '最高3x', promote: '前30%晋级', demote: '未达标降级', color: '#F0B90B', active: false },
                        { stage: 3, name: '精英', capital: '20,000U', leverage: '最高10x', promote: '保持前30%', demote: '未达标降级', color: '#0ECB81', active: false },
                      ].map((s) => (
                        <div key={s.stage} className={`rounded-lg p-4 border ${
                          s.active
                            ? 'bg-[#F0B90B]/10 border-[#F0B90B]/30'
                            : 'bg-[rgba(255,255,255,0.02)] border-[rgba(255,255,255,0.06)]'
                        }`}>
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold"
                                style={{ background: `${s.color}20`, color: s.color }}>
                                {s.stage}
                              </div>
                              <span className="text-white text-sm font-bold">{s.name}</span>
                              {s.active && (
                                <span className="text-[10px] bg-[#F0B90B] text-[#0B0E11] px-1.5 py-0.5 rounded font-bold">YOU</span>
                              )}
                            </div>
                            <div className="text-sm font-bold" style={{ color: s.color, fontFamily: "'DM Mono', monospace" }}>
                              {s.capital}
                            </div>
                          </div>
                          <div className="grid grid-cols-3 gap-2 text-[10px]">
                            <div>
                              <span className="text-[#5E6673]">杠杆：</span>
                              <span className="text-[#D1D4DC]">{s.leverage}</span>
                            </div>
                            <div>
                              <span className="text-[#5E6673]">晋级：</span>
                              <span className="text-[#0ECB81]">{s.promote}</span>
                            </div>
                            <div>
                              <span className="text-[#5E6673]">降级：</span>
                              <span className="text-[#F6465D]">{s.demote}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Promotion score */}
                  <div className="bg-[#1C2030]/60 border border-[rgba(255,255,255,0.04)] rounded-lg p-5">
                    <div className="text-white text-sm font-bold mb-3 flex items-center gap-2">
                      <Award className="w-4 h-4 text-[#F0B90B]" />
                      晋级分计算
                    </div>
                    <div className="bg-[rgba(255,255,255,0.03)] rounded-lg p-4 text-xs space-y-2" style={{ fontFamily: "'DM Mono', monospace" }}>
                      <div className="text-[#D1D4DC]">单场晋级分 = 1000 - 排名</div>
                      <div className="text-[#D1D4DC]">周期晋级分 = 3场均值</div>
                      <div className="text-[#F0B90B] font-bold">晋级阈值 = 700分（≈ 前30%）</div>
                    </div>
                    <div className="mt-3 text-[#848E9C] text-[10px]">
                      例：3 场排名分别为 #187、#285、#250 → 晋级分 = (813+715+750)/3 = 759 → 晋级成功！
                    </div>
                  </div>

                  {/* Warning */}
                  <div className="bg-[#F6465D]/5 border border-[#F6465D]/20 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <AlertTriangle className="w-4 h-4 text-[#F6465D]" />
                      <span className="text-[#F6465D] text-xs font-bold">降级风险</span>
                    </div>
                    <div className="text-[#848E9C] text-[10px]">
                      已在高阶段的用户如果 3 场平均排名未达标，将被降回上一阶段。
                      降级意味着失去已获得的本金和杠杆优势。<span className="text-[#F6465D]">损失厌恶比晋级渴望更强。</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Bottom navigation */}
          <div className="h-16 border-t border-[rgba(255,255,255,0.06)] flex items-center justify-between px-8 shrink-0">
            <button
              onClick={handlePrev}
              disabled={currentSection === 0}
              className="text-[#848E9C] text-xs hover:text-white transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            >
              ← Previous
            </button>

            <div className="flex items-center gap-1.5">
              {sections.map((_, i) => (
                <div key={i} className={`w-2 h-2 rounded-full transition-all duration-300 ${
                  i === currentSection ? 'bg-[#F0B90B] w-6' :
                  i < currentSection ? 'bg-[#0ECB81]' : 'bg-[rgba(255,255,255,0.1)]'
                }`} />
              ))}
            </div>

            {isReady ? (
              <button
                onClick={onEnterArena}
                className="bg-gradient-to-r from-[#F0B90B] to-[#F0B90B]/90 text-[#0B0E11] font-bold px-6 py-2 rounded-lg text-xs flex items-center gap-2 hover:shadow-lg hover:shadow-[#F0B90B]/20 transition-all"
              >
                Enter Arena
                <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={handleNext}
                className="bg-[rgba(255,255,255,0.06)] hover:bg-[rgba(255,255,255,0.1)] text-white px-6 py-2 rounded-lg text-xs flex items-center gap-2 transition-colors"
              >
                {currentSection === sections.length - 1 ? 'I Understand' : 'Next'}
                <ChevronRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

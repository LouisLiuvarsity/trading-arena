// ============================================================
// Rules Introduction Page — Competition mechanics overview
// Design: Full-width centered layout with side arrow navigation
// No left sidebar — content centered with large prev/next arrows
// ============================================================

import { useState } from 'react';
import {
  Trophy, Clock, TrendingUp, Shield, Zap, ChevronRight, ChevronLeft,
  Target, AlertTriangle, Star,
  BarChart3, Users, Timer, Wallet, Award, FileText, SkipForward
} from 'lucide-react';

interface RulesPageProps {
  username: string;
  onEnterArena: () => void;
  onSkipRules?: () => void;
}

export default function RulesPage({ username, onEnterArena, onSkipRules }: RulesPageProps) {
  const [currentSection, setCurrentSection] = useState(0);
  const [isReady, setIsReady] = useState(false);

  const sections = [
    { id: 'overview', title: '比赛概览', icon: Trophy, color: '#F0B90B' },
    { id: 'trading', title: '交易规则', icon: BarChart3, color: '#0ECB81' },
    { id: 'scoring', title: '积分与分润', icon: Wallet, color: '#F0B90B' },
    { id: 'promotion', title: '晋级体系', icon: Award, color: '#3B82F6' },
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

  const currentSectionData = sections[currentSection];
  const CurrentIcon = currentSectionData.icon;

  return (
    <div className="h-screen w-screen bg-[#0B0E11] flex flex-col overflow-hidden">
      {/* Header */}
      <div className="h-12 border-b border-[rgba(255,255,255,0.06)] flex items-center justify-between px-6 shrink-0">
        <div className="flex items-center gap-3">
          <Trophy className="w-4 h-4 text-[#F0B90B]" />
          <span className="text-white text-sm font-bold" style={{ fontFamily: "'DM Mono', monospace" }}>TRADING ARENA</span>
          <span className="text-[#5E6673] text-xs">/ Rules</span>
        </div>
        <div className="flex items-center gap-4">
          {onSkipRules && (
            <button
              onClick={onSkipRules}
              className="flex items-center gap-1.5 text-[#848E9C] hover:text-[#D1D4DC] text-xs transition-colors"
            >
              <SkipForward className="w-3.5 h-3.5" />
              跳过规则
            </button>
          )}
          <div className="flex items-center gap-2">
            <span className="text-[#848E9C] text-xs">Welcome, </span>
            <span className="text-[#F0B90B] text-xs font-medium" style={{ fontFamily: "'DM Mono', monospace" }}>{username}</span>
          </div>
        </div>
      </div>

      {/* Main content area with side arrows */}
      <div className="flex-1 flex items-stretch overflow-hidden relative">
        {/* Left arrow button — large & prominent */}
        <button
          onClick={handlePrev}
          disabled={currentSection === 0}
          className={`w-20 shrink-0 flex flex-col items-center justify-center gap-2 transition-all duration-300 group ${
            currentSection === 0
              ? 'opacity-15 cursor-not-allowed'
              : 'opacity-70 hover:opacity-100 cursor-pointer'
          }`}
        >
          <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-300 border ${
            currentSection === 0
              ? 'bg-[rgba(255,255,255,0.03)] border-[rgba(255,255,255,0.04)]'
              : 'bg-[rgba(255,255,255,0.06)] border-[rgba(255,255,255,0.1)] group-hover:bg-[rgba(255,255,255,0.12)] group-hover:border-[rgba(255,255,255,0.2)] group-hover:scale-110 group-hover:shadow-lg group-hover:shadow-white/5'
          }`}>
            <ChevronLeft className={`w-7 h-7 transition-colors ${
              currentSection === 0 ? 'text-[#5E6673]' : 'text-[#848E9C] group-hover:text-white'
            }`} />
          </div>
          <span className={`text-[10px] font-medium tracking-wider uppercase transition-colors ${
            currentSection === 0 ? 'text-[#5E6673]/50' : 'text-[#5E6673] group-hover:text-[#D1D4DC]'
          }`}>Prev</span>
        </button>

        {/* Center content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Section header with indicator dots */}
          <div className="flex items-center justify-center gap-6 py-4 shrink-0">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: `${currentSectionData.color}15` }}>
                <CurrentIcon className="w-4 h-4" style={{ color: currentSectionData.color }} />
              </div>
              <span className="text-white text-sm font-bold">{currentSectionData.title}</span>
              <span className="text-[#5E6673] text-[10px] ml-1">{currentSection + 1}/{sections.length}</span>
            </div>
            <div className="flex items-center gap-1.5">
              {sections.map((s, i) => (
                <button
                  key={s.id}
                  onClick={() => setCurrentSection(i)}
                  className={`h-1.5 rounded-full transition-all duration-500 cursor-pointer ${
                    i === currentSection ? 'w-8' :
                    i < currentSection ? 'w-3' : 'w-3'
                  }`}
                  style={{
                    background: i === currentSection ? currentSectionData.color :
                      i < currentSection ? '#0ECB81' : 'rgba(255,255,255,0.1)'
                  }}
                />
              ))}
            </div>
          </div>

          {/* Scrollable content */}
          <div className="flex-1 overflow-y-auto px-4">
            <div className="max-w-[720px] mx-auto pb-6">
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
                      { icon: Shield, label: '杠杆', value: '1x（无杠杆）', desc: '全阶段均无杠杆', color: '#0ECB81' },
                      { icon: Clock, label: '比赛时长', value: '24 小时', desc: '覆盖多个市场周期', color: '#3B82F6' },
                      { icon: Users, label: '每场人数', value: '1,000 人', desc: '按收益率排名', color: '#848E9C' },
                      { icon: Target, label: '交易品种', value: 'BTCUSDT 永续', desc: '纯择时问题', color: '#F0B90B' },
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
                      3 场周期制 — 集中结算
                    </div>
                    <div className="flex items-center gap-3">
                      {[
                        { num: 1, label: '试探期', desc: '熟悉环境，建立基线', status: 'completed' },
                        { num: 2, label: '认真期', desc: '计算晋级，策略分化', status: 'active' },
                        { num: 3, label: '决胜期', desc: '最终排名，集中结算', status: 'pending' },
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

                    <div className="mt-4 space-y-2">
                      <div className="bg-[#F0B90B]/5 border border-[#F0B90B]/15 rounded-lg p-3">
                        <div className="text-[#F0B90B] text-xs font-bold mb-1">⚡ 核心规则：3 场集中结算</div>
                        <div className="text-[#848E9C] text-[10px] space-y-1">
                          <p>• 必须完成 <span className="text-white font-bold">3 场比赛</span> 才能提现，不可中途退出</p>
                          <p>• 3 场的盈亏 <span className="text-[#F6465D] font-bold">集中到一起结算</span>，亏损会抵消盈利</p>
                          <p>• 例：第1场 +200U，第2场 -80U，第3场 +150U → 累计 +270U → 按分成比例提现</p>
                          <p>• 例：第1场 +100U，第2场 -200U，第3场 +50U → 累计 -50U → <span className="text-[#F6465D]">无法提现</span></p>
                        </div>
                      </div>

                      <div className="bg-[#3B82F6]/5 border border-[#3B82F6]/15 rounded-lg p-3">
                        <div className="flex items-center gap-2 mb-1">
                          <FileText className="w-3.5 h-3.5 text-[#3B82F6]" />
                          <span className="text-[#3B82F6] text-xs font-bold">交易分析报告</span>
                        </div>
                        <div className="text-[#848E9C] text-[10px] space-y-1">
                          <p>完成 3 场周期后，你将收到一份 <span className="text-white font-bold">个人交易分析报告</span>，包含：</p>
                          <p>• 交易行为画像（频率、仓位偏好、持仓时长分布）</p>
                          <p>• 盈亏归因分析（哪些交易贡献最大/最小）</p>
                          <p>• 情绪化交易检测（追涨杀跌、恐慌平仓、FOMO 开仓等）</p>
                          <p>• 与全场平均水平的对比和改进建议</p>
                        </div>
                      </div>
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
                    <div className="text-white text-sm font-bold mb-3 flex items-center gap-2">
                      <BarChart3 className="w-4 h-4 text-[#0ECB81]" />
                      仓位与交易限制
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      {[
                        { label: '杠杆', value: '1x（无杠杆）', desc: '所有阶段均为无杠杆', color: '#0ECB81' },
                        { label: '最大仓位', value: '100% 本金', desc: '可全仓 5,000U', color: '#F0B90B' },
                        { label: '最小仓位', value: '10% 本金', desc: '至少 500U', color: '#848E9C' },
                        { label: '同时持仓', value: '仅 1 笔', desc: '不可同时多空', color: '#F6465D' },
                      ].map((item, i) => (
                        <div key={i} className="bg-[rgba(255,255,255,0.03)] rounded-lg p-3">
                          <div className="text-[#5E6673] text-[10px] uppercase tracking-wider">{item.label}</div>
                          <div className="text-sm font-bold mt-0.5" style={{ color: item.color, fontFamily: "'DM Mono', monospace" }}>{item.value}</div>
                          <div className="text-[#5E6673] text-[10px] mt-0.5">{item.desc}</div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Hold duration weight */}
                  <div className="bg-[#1C2030]/60 border border-[rgba(255,255,255,0.04)] rounded-lg p-5">
                    <div className="text-white text-sm font-bold mb-3 flex items-center gap-2">
                      <Timer className="w-4 h-4 text-[#F0B90B]" />
                      持仓时长权重
                    </div>
                    <p className="text-[#848E9C] text-[10px] mb-3">
                      持仓越久，盈亏权重越高。这鼓励有信念的交易，惩罚频繁进出。
                    </p>
                    <div className="overflow-hidden rounded-lg border border-[rgba(255,255,255,0.06)]">
                      <table className="w-full text-[11px]">
                        <thead>
                          <tr className="bg-[rgba(255,255,255,0.03)]">
                            <th className="text-left text-[#5E6673] px-3 py-2 font-medium">持仓时长</th>
                            <th className="text-center text-[#5E6673] px-3 py-2 font-medium">权重</th>
                            <th className="text-right text-[#5E6673] px-3 py-2 font-medium">效果</th>
                          </tr>
                        </thead>
                        <tbody>
                          {[
                            { duration: '< 2 分钟', weight: '0.2x', effect: '严重惩罚', color: '#F6465D' },
                            { duration: '2-5 分钟', weight: '0.4x', effect: '惩罚', color: '#F6465D' },
                            { duration: '5-10 分钟', weight: '0.7x', effect: '轻度惩罚', color: '#848E9C' },
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

                  {/* TP/SL */}
                  <div className="bg-[#1C2030]/60 border border-[rgba(255,255,255,0.04)] rounded-lg p-5">
                    <div className="text-white text-sm font-bold mb-3 flex items-center gap-2">
                      <Target className="w-4 h-4 text-[#F0B90B]" />
                      止盈 / 止损
                    </div>
                    <div className="text-[#848E9C] text-[10px] space-y-1">
                      <p>• 开仓时可预设止盈（TP）和止损（SL）价格</p>
                      <p>• 持仓中可随时修改或清除 TP/SL</p>
                      <p>• 价格触及后自动平仓，权重按实际持仓时长计算</p>
                      <p>• TP/SL 线会在 K 线图上以彩色虚线标注</p>
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
                        { tier: '< 10,000 积分', pct: '5%', color: '#848E9C', bg: 'rgba(255,255,255,0.03)', width: '25%' },
                        { tier: '10,000 - 25,000', pct: '10%', color: '#F0B90B', bg: '#F0B90B10', width: '50%' },
                        { tier: '25,000 - 40,000', pct: '15%', color: '#F0B90B', bg: '#F0B90B15', width: '75%' },
                        { tier: '≥ 40,000 积分', pct: '20%', color: '#0ECB81', bg: '#0ECB8115', width: '100%' },
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
                          = 2,500 积分 → 需 16 笔达到 40,000（20% 分成）
                        </div>
                      </div>
                      <div className="bg-[rgba(255,255,255,0.03)] rounded-lg p-3">
                        <div className="text-[#D1D4DC]">
                          <span className="text-[#F0B90B]">5,000U 满仓</span> × 持仓 35 分钟（权重 1.15x）
                        </div>
                        <div className="text-[#0ECB81] font-bold mt-1" style={{ fontFamily: "'DM Mono', monospace" }}>
                          = 5,750 积分 → 需 7 笔达到 40,000（20% 分成）
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
                    <div className="text-[#0ECB81] text-xs font-bold mb-2">💰 可提现金额 = 3场累计净盈利 × 分成比例</div>
                    <div className="text-[#848E9C] text-[10px] space-y-1">
                      <p>例：3 场盈亏分别为 +300U、-80U、+250U → 累计净盈利 +470U</p>
                      <p>积分达到 40,000（20% 分成）→ <span className="text-[#0ECB81] font-bold">可提现 94U</span></p>
                      <p className="text-[#F6465D]">⚠️ 如果 3 场累计净盈利为负，则无法提现。各场亏损不独立结算！</p>
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
                      3 场平均排名前 30% 即可晋级到更高阶段——更大本金，更多盈利空间。<span className="text-white font-bold">所有阶段均无杠杆。</span>
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
                        { stage: 1, name: '入门', capital: '5,000U', leverage: '无杠杆', promote: '前30%晋级', demote: '无', color: '#848E9C', active: true },
                        { stage: 2, name: '中级', capital: '10,000U', leverage: '无杠杆', promote: '前30%晋级', demote: '未达标降级', color: '#F0B90B', active: false },
                        { stage: 3, name: '高级', capital: '20,000U', leverage: '无杠杆', promote: '保持前30%', demote: '未达标降级', color: '#0ECB81', active: false },
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

                    {/* Capital comparison */}
                    <div className="mt-4 bg-[rgba(255,255,255,0.03)] rounded-lg p-3">
                      <div className="text-[#848E9C] text-[10px] mb-2">晋级本金增长：</div>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-3 bg-[#848E9C]/20 rounded-full overflow-hidden">
                          <div className="h-full bg-[#848E9C] rounded-full" style={{ width: '25%' }} />
                        </div>
                        <span className="text-[10px] text-[#848E9C] font-mono w-14 text-right">5,000U</span>
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <div className="flex-1 h-3 bg-[#F0B90B]/20 rounded-full overflow-hidden">
                          <div className="h-full bg-[#F0B90B] rounded-full" style={{ width: '50%' }} />
                        </div>
                        <span className="text-[10px] text-[#F0B90B] font-mono w-14 text-right">10,000U</span>
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <div className="flex-1 h-3 bg-[#0ECB81]/20 rounded-full overflow-hidden">
                          <div className="h-full bg-[#0ECB81] rounded-full" style={{ width: '100%' }} />
                        </div>
                        <span className="text-[10px] text-[#0ECB81] font-mono w-14 text-right">20,000U</span>
                      </div>
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
                      降级意味着失去已获得的本金优势（从 20,000U 降回 10,000U，或从 10,000U 降回 5,000U）。
                      <span className="text-[#F6465D]"> 损失厌恶比晋级渴望更强。</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Bottom: Enter Arena button (only on last section when ready) */}
          <div className="h-14 border-t border-[rgba(255,255,255,0.06)] flex items-center justify-center px-8 shrink-0">
            {isReady ? (
              <button
                onClick={onEnterArena}
                className="bg-gradient-to-r from-[#F0B90B] to-[#F0B90B]/90 text-[#0B0E11] font-bold px-10 py-2.5 rounded-lg text-sm flex items-center gap-2 hover:shadow-lg hover:shadow-[#F0B90B]/20 transition-all"
              >
                Enter Arena
                <ChevronRight className="w-4 h-4" />
              </button>
            ) : currentSection === sections.length - 1 ? (
              <button
                onClick={handleNext}
                className="bg-[rgba(255,255,255,0.08)] hover:bg-[rgba(255,255,255,0.14)] text-white px-8 py-2.5 rounded-lg text-sm flex items-center gap-2 transition-colors font-medium"
              >
                I Understand — Ready to Trade
                <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <div className="flex items-center gap-2 text-[#5E6673] text-xs">
                <span>Use</span>
                <kbd className="px-1.5 py-0.5 rounded bg-[rgba(255,255,255,0.06)] text-[#848E9C] text-[10px] font-mono">←</kbd>
                <kbd className="px-1.5 py-0.5 rounded bg-[rgba(255,255,255,0.06)] text-[#848E9C] text-[10px] font-mono">→</kbd>
                <span>arrows to navigate</span>
              </div>
            )}
          </div>
        </div>

        {/* Right arrow button — large & prominent */}
        <button
          onClick={handleNext}
          disabled={isReady}
          className={`w-20 shrink-0 flex flex-col items-center justify-center gap-2 transition-all duration-300 group ${
            isReady
              ? 'opacity-15 cursor-not-allowed'
              : 'opacity-70 hover:opacity-100 cursor-pointer'
          }`}
        >
          <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-300 border ${
            isReady
              ? 'bg-[rgba(255,255,255,0.03)] border-[rgba(255,255,255,0.04)]'
              : 'bg-[#F0B90B]/10 border-[#F0B90B]/30 group-hover:bg-[#F0B90B]/20 group-hover:border-[#F0B90B]/50 group-hover:scale-110 group-hover:shadow-lg group-hover:shadow-[#F0B90B]/10'
          }`}>
            <ChevronRight className={`w-7 h-7 transition-colors ${
              isReady ? 'text-[#5E6673]' : 'text-[#F0B90B]/70 group-hover:text-[#F0B90B]'
            }`} />
          </div>
          <span className={`text-[10px] font-medium tracking-wider uppercase transition-colors ${
            isReady ? 'text-[#5E6673]/50' : 'text-[#F0B90B]/50 group-hover:text-[#F0B90B]'
          }`}>Next</span>
        </button>
      </div>
    </div>
  );
}

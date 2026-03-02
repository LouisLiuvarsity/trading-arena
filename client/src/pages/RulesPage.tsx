// ============================================================
// Quick Rules Guide — Simplified single-card onboarding
// Shows only 4 core rules before entering the arena
// ============================================================

import { useState } from 'react';
import { Shield, Activity, Clock, TrendingUp, ChevronRight, Zap } from 'lucide-react';

interface RulesPageProps {
  username: string;
  onEnterArena: () => void;
  onSkipRules?: () => void;
}

export default function RulesPage({ username, onEnterArena, onSkipRules }: RulesPageProps) {
  const [agreed, setAgreed] = useState(false);

  return (
    <div className="h-screen w-screen bg-[#0B0E11] flex items-center justify-center overflow-hidden relative">
      {/* Background grid */}
      <div className="absolute inset-0 opacity-[0.02]"
        style={{
          backgroundImage: `linear-gradient(rgba(240,185,11,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(240,185,11,0.3) 1px, transparent 1px)`,
          backgroundSize: '60px 60px',
        }}
      />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] rounded-full opacity-[0.04]"
        style={{ background: 'radial-gradient(circle, #F0B90B 0%, transparent 70%)' }}
      />

      <div className="relative z-10 w-full max-w-lg mx-4">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br from-[#F0B90B]/20 to-[#F0B90B]/5 border border-[#F0B90B]/20 mb-3">
            <Zap className="w-6 h-6 text-[#F0B90B]" />
          </div>
          <h1 className="text-xl font-bold text-white" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            快速了解比赛规则
          </h1>
          <p className="text-[#848E9C] text-xs mt-1">
            欢迎 <span className="text-[#F0B90B] font-semibold">{username}</span>，开始前请了解以下核心规则
          </p>
        </div>

        {/* Rules card */}
        <div className="bg-[#1C2030]/80 backdrop-blur-sm border border-[rgba(255,255,255,0.06)] rounded-2xl overflow-hidden">
          {/* 4 core rules */}
          <div className="p-5 space-y-4">
            {[
              {
                icon: Shield,
                title: '5,000 USDT 本金',
                desc: '无杠杆、无爆仓，盈亏取决于交易能力',
                accent: '#F0B90B',
              },
              {
                icon: Activity,
                title: '最多 40 笔交易',
                desc: '每笔都要慎重，鼓励深思熟虑的决策',
                accent: '#3B82F6',
              },
              {
                icon: Clock,
                title: '持仓时间影响权重',
                desc: '<1分钟仅算 0.2x，≥30分钟算 1.0x 全额收益',
                accent: '#8B5CF6',
              },
              {
                icon: TrendingUp,
                title: '5%-20% 利润分成',
                desc: '参与积分越高，分成比例越高（最高20%）',
                accent: '#0ECB81',
              },
            ].map((rule, i) => (
              <div key={i} className="flex items-start gap-3">
                <div
                  className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
                  style={{ background: `${rule.accent}15`, border: `1px solid ${rule.accent}30` }}
                >
                  <rule.icon className="w-4 h-4" style={{ color: rule.accent }} />
                </div>
                <div>
                  <div className="text-white text-sm font-semibold">{rule.title}</div>
                  <div className="text-[#848E9C] text-xs mt-0.5">{rule.desc}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Divider */}
          <div className="border-t border-white/5" />

          {/* Agreement + Enter */}
          <div className="p-5">
            <label className="flex items-center gap-2.5 cursor-pointer mb-4 group">
              <div
                className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
                  agreed ? 'bg-[#F0B90B] border-[#F0B90B]' : 'border-[#5E6673] group-hover:border-[#848E9C]'
                }`}
                onClick={() => setAgreed(!agreed)}
              >
                {agreed && (
                  <svg className="w-3 h-3 text-[#0B0E11]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </div>
              <span className="text-[#D1D4DC] text-xs" onClick={() => setAgreed(!agreed)}>
                我已了解以上规则，准备进入竞技场
              </span>
            </label>

            <button
              onClick={onEnterArena}
              disabled={!agreed}
              className="w-full bg-gradient-to-r from-[#F0B90B] to-[#F0B90B]/90 hover:from-[#F0B90B]/90 hover:to-[#F0B90B] text-[#0B0E11] font-bold py-3 rounded-xl transition-all duration-200 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm"
            >
              进入竞技场
              <ChevronRight className="w-4 h-4" />
            </button>

            {onSkipRules && (
              <button
                onClick={onSkipRules}
                className="w-full mt-2 text-[#5E6673] hover:text-[#848E9C] text-xs py-2 transition-colors"
              >
                跳过（我已经知道规则了）
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

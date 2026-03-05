// ============================================================
// Quick Rules Guide — v5.0 Simplified onboarding
// Core rules: 5000U, 40 trades, min 5 trades for eligibility,
// hold weight, fixed prize pool, points → rank tiers, decay
// ============================================================

import { useState } from 'react';
import { Shield, Activity, Clock, DollarSign, Star, Trophy, ChevronRight, Zap, AlertTriangle } from 'lucide-react';
import { useT } from '@/lib/i18n';
import LanguageToggle from '@/components/LanguageToggle';
import { useAuth } from '@/contexts/AuthContext';
import { useLocation } from 'wouter';

interface RulesPageProps {
  username?: string;
  onEnterArena?: () => void;
  onSkipRules?: () => void;
}

export default function RulesPage({ username: usernameProp, onEnterArena, onSkipRules }: RulesPageProps) {
  const { t } = useT();
  const auth = useAuth();
  const [, navigate] = useLocation();
  const username = usernameProp ?? auth.username;
  if (!onEnterArena) onEnterArena = () => navigate("/hub");
  if (!onSkipRules) onSkipRules = () => navigate("/hub");
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
        {/* Language toggle */}
        <div className="flex justify-end mb-2">
          <LanguageToggle />
        </div>
        {/* Header */}
        <div className="text-center mb-5">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br from-[#F0B90B]/20 to-[#F0B90B]/5 border border-[#F0B90B]/20 mb-3">
            <Zap className="w-6 h-6 text-[#F0B90B]" />
          </div>
          <h1 className="text-xl font-bold text-white" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            {t('rules.heading')}
          </h1>
          <p className="text-[#848E9C] text-xs mt-1">
            {t('rules.welcome', { name: username })}
          </p>
        </div>

        {/* Rules card */}
        <div className="bg-[#1C2030]/80 backdrop-blur-sm border border-[rgba(255,255,255,0.06)] rounded-2xl overflow-hidden">
          {/* Core rules */}
          <div className="p-5 space-y-3.5">
            {[
              {
                icon: Shield,
                title: t('rules.r1.title'),
                desc: t('rules.r1.desc'),
                accent: '#F0B90B',
              },
              {
                icon: Activity,
                title: t('rules.r2.title'),
                desc: t('rules.r2.desc'),
                accent: '#3B82F6',
              },
              {
                icon: Trophy,
                title: t('rules.r3.title'),
                desc: t('rules.r3.desc'),
                accent: '#F6465D',
              },
              {
                icon: Clock,
                title: t('rules.r4.title'),
                desc: t('rules.r4.desc'),
                accent: '#8B5CF6',
              },
              {
                icon: DollarSign,
                title: t('rules.r5.title'),
                desc: t('rules.r5.desc'),
                accent: '#0ECB81',
              },
              {
                icon: Star,
                title: t('rules.r6.title'),
                desc: t('rules.r6.desc'),
                accent: '#F59E0B',
              },
            ].map((rule, i) => (
              <div key={i} className="flex items-start gap-3">
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
                  style={{ background: `${rule.accent}15`, border: `1px solid ${rule.accent}30` }}
                >
                  <rule.icon className="w-4 h-4" style={{ color: rule.accent }} />
                </div>
                <div>
                  <div className="text-white text-sm font-semibold">{rule.title}</div>
                  <div className="text-[#848E9C] text-[11px] mt-0.5">{rule.desc}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Important notice */}
          <div className="mx-5 mb-4 bg-[#F6465D]/5 border border-[#F6465D]/15 rounded-lg px-3 py-2 flex items-start gap-2">
            <AlertTriangle className="w-3.5 h-3.5 text-[#F6465D] shrink-0 mt-0.5" />
            <span className="text-[#F6465D]/80 text-[10px] leading-relaxed">
              {t('rules.notice')}
            </span>
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
                {t('rules.agree')}
              </span>
            </label>

            <button
              onClick={onEnterArena}
              disabled={!agreed}
              className="w-full bg-gradient-to-r from-[#F0B90B] to-[#F0B90B]/90 hover:from-[#F0B90B]/90 hover:to-[#F0B90B] text-[#0B0E11] font-bold py-3 rounded-xl transition-all duration-200 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm"
            >
              {t('rules.enter')}
              <ChevronRight className="w-4 h-4" />
            </button>

            {onSkipRules && (
              <button
                onClick={onSkipRules}
                className="w-full mt-2 text-[#5E6673] hover:text-[#848E9C] text-xs py-2 transition-colors"
              >
                {t('rules.skip')}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

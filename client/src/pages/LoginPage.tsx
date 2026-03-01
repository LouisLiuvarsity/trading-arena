// ============================================================
// Login Page — Trading Arena Entry Point
// Design: Obsidian Exchange — Dark, cinematic, competitive
// ============================================================

import { useState } from 'react';
import { Trophy, Zap, TrendingUp, Shield, ChevronRight } from 'lucide-react';

interface LoginPageProps {
  onLogin: (username: string) => void;
}

export default function LoginPage({ onLogin }: LoginPageProps) {
  const [username, setUsername] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim()) return;
    setIsLoading(true);
    // Simulate login delay
    setTimeout(() => {
      onLogin(username.trim());
    }, 800);
  };

  return (
    <div className="h-screen w-screen bg-[#0B0E11] flex items-center justify-center overflow-hidden relative">
      {/* Animated background grid */}
      <div className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `
            linear-gradient(rgba(240,185,11,0.3) 1px, transparent 1px),
            linear-gradient(90deg, rgba(240,185,11,0.3) 1px, transparent 1px)
          `,
          backgroundSize: '60px 60px',
        }}
      />

      {/* Radial glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full opacity-[0.06]"
        style={{ background: 'radial-gradient(circle, #F0B90B 0%, transparent 70%)' }}
      />

      {/* Main card */}
      <div className="relative z-10 w-full max-w-[440px] mx-4">
        {/* Logo & Title */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-[#F0B90B]/20 to-[#F0B90B]/5 border border-[#F0B90B]/20 mb-4">
            <Trophy className="w-8 h-8 text-[#F0B90B]" />
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight" style={{ fontFamily: "'DM Mono', monospace" }}>
            TRADING ARENA
          </h1>
          <p className="text-[#848E9C] text-sm mt-2">
            24H Crypto Trading Competition
          </p>
        </div>

        {/* Stats bar */}
        <div className="flex items-center justify-center gap-6 mb-8">
          <div className="text-center">
            <div className="text-[#F0B90B] text-lg font-bold" style={{ fontFamily: "'DM Mono', monospace" }}>5,000</div>
            <div className="text-[#5E6673] text-[10px] uppercase tracking-wider">USDT Capital</div>
          </div>
          <div className="w-px h-8 bg-[rgba(255,255,255,0.06)]" />
          <div className="text-center">
            <div className="text-white text-lg font-bold" style={{ fontFamily: "'DM Mono', monospace" }}>1,000</div>
            <div className="text-[#5E6673] text-[10px] uppercase tracking-wider">Players</div>
          </div>
          <div className="w-px h-8 bg-[rgba(255,255,255,0.06)]" />
          <div className="text-center">
            <div className="text-white text-lg font-bold" style={{ fontFamily: "'DM Mono', monospace" }}>24H</div>
            <div className="text-[#5E6673] text-[10px] uppercase tracking-wider">Duration</div>
          </div>
          <div className="w-px h-8 bg-[rgba(255,255,255,0.06)]" />
          <div className="text-center">
            <div className="text-[#0ECB81] text-lg font-bold" style={{ fontFamily: "'DM Mono', monospace" }}>25%</div>
            <div className="text-[#5E6673] text-[10px] uppercase tracking-wider">Max Share</div>
          </div>
        </div>

        {/* Login form */}
        <div className="bg-[#1C2030]/80 backdrop-blur-sm border border-[rgba(255,255,255,0.06)] rounded-xl p-6">
          <form onSubmit={handleSubmit}>
            <label className="block text-[#848E9C] text-xs uppercase tracking-wider mb-2">
              Enter Username
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Your trading alias..."
              maxLength={20}
              className="w-full bg-[#0B0E11] border border-[rgba(255,255,255,0.1)] rounded-lg px-4 py-3 text-white placeholder:text-[#5E6673] focus:outline-none focus:border-[#F0B90B]/50 transition-colors text-sm"
              style={{ fontFamily: "'DM Mono', monospace" }}
              autoFocus
            />

            <button
              type="submit"
              disabled={!username.trim() || isLoading}
              className="w-full mt-4 bg-gradient-to-r from-[#F0B90B] to-[#F0B90B]/90 hover:from-[#F0B90B]/90 hover:to-[#F0B90B] text-[#0B0E11] font-bold py-3 rounded-lg transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-[#0B0E11]/30 border-t-[#0B0E11] rounded-full animate-spin" />
              ) : (
                <>
                  Enter Arena
                  <ChevronRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Quick join hint */}
          <p className="text-center text-[#5E6673] text-[10px] mt-3">
            Free entry — No deposit required
          </p>
        </div>

        {/* Feature highlights */}
        <div className="grid grid-cols-2 gap-3 mt-6">
          <div className="bg-[#1C2030]/40 border border-[rgba(255,255,255,0.04)] rounded-lg p-3 flex items-start gap-2.5">
            <Zap className="w-4 h-4 text-[#F0B90B] shrink-0 mt-0.5" />
            <div>
              <div className="text-white text-xs font-medium">Real-Time Market</div>
              <div className="text-[#5E6673] text-[10px] mt-0.5">Live HYPERUSDT data</div>
            </div>
          </div>
          <div className="bg-[#1C2030]/40 border border-[rgba(255,255,255,0.04)] rounded-lg p-3 flex items-start gap-2.5">
            <TrendingUp className="w-4 h-4 text-[#0ECB81] shrink-0 mt-0.5" />
            <div>
              <div className="text-white text-xs font-medium">Promotion System</div>
              <div className="text-[#5E6673] text-[10px] mt-0.5">Rank up to 20,000U</div>
            </div>
          </div>
          <div className="bg-[#1C2030]/40 border border-[rgba(255,255,255,0.04)] rounded-lg p-3 flex items-start gap-2.5">
            <Trophy className="w-4 h-4 text-[#F0B90B] shrink-0 mt-0.5" />
            <div>
              <div className="text-white text-xs font-medium">Profit Sharing</div>
              <div className="text-[#5E6673] text-[10px] mt-0.5">Keep 10%-25% profits</div>
            </div>
          </div>
          <div className="bg-[#1C2030]/40 border border-[rgba(255,255,255,0.04)] rounded-lg p-3 flex items-start gap-2.5">
            <Shield className="w-4 h-4 text-[#848E9C] shrink-0 mt-0.5" />
            <div>
              <div className="text-white text-xs font-medium">Zero Risk</div>
              <div className="text-[#5E6673] text-[10px] mt-0.5">No leverage, no liquidation</div>
            </div>
          </div>
        </div>

        {/* Match status */}
        <div className="mt-6 text-center">
          <div className="inline-flex items-center gap-2 bg-[#0ECB81]/10 border border-[#0ECB81]/20 rounded-full px-4 py-1.5">
            <div className="w-2 h-2 rounded-full bg-[#0ECB81] animate-pulse" />
            <span className="text-[#0ECB81] text-xs font-medium">Match #2 in progress — 847/1000 joined</span>
          </div>
        </div>
      </div>
    </div>
  );
}

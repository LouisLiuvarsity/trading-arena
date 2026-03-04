import { useState } from 'react';
import { Trophy, Zap, TrendingUp, Shield, ChevronRight, UserPlus, LogIn } from 'lucide-react';
import { useT } from '@/lib/i18n';

interface LoginPageProps {
  onLogin: (inviteCode: string, username: string) => Promise<void>;
  onQuickLogin: (username: string) => Promise<void>;
}

export default function LoginPage({ onLogin, onQuickLogin }: LoginPageProps) {
  const { t, lang, setLang } = useT();
  const [mode, setMode] = useState<'register' | 'quick'>(() =>
    localStorage.getItem("arena_username") ? 'quick' : 'register'
  );
  const [inviteCode, setInviteCode] = useState('');
  const [username, setUsername] = useState('');
  const [quickUsername, setQuickUsername] = useState(() => localStorage.getItem("arena_username") ?? '');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteCode.trim() || !username.trim()) return;
    setIsLoading(true);
    setError(null);
    try {
      await onLogin(inviteCode.trim(), username.trim());
    } catch (err) {
      setError((err as Error).message);
      setIsLoading(false);
    }
  };

  const handleQuickLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickUsername.trim()) return;
    setIsLoading(true);
    setError(null);
    try {
      await onQuickLogin(quickUsername.trim());
    } catch (err) {
      setError((err as Error).message);
      setIsLoading(false);
    }
  };

  const tabClass = (active: boolean) =>
    `flex-1 py-2 text-xs font-medium transition-all duration-200 border-b-2 flex items-center justify-center gap-1.5 ${
      active
        ? 'text-[#F0B90B] border-[#F0B90B]'
        : 'text-[#5E6673] border-transparent hover:text-[#848E9C]'
    }`;

  return (
    <div className="h-screen w-screen bg-[#0B0E11] flex items-center justify-center overflow-hidden relative">
      <div className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `
            linear-gradient(rgba(240,185,11,0.3) 1px, transparent 1px),
            linear-gradient(90deg, rgba(240,185,11,0.3) 1px, transparent 1px)
          `,
          backgroundSize: '60px 60px',
        }}
      />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full opacity-[0.06]"
        style={{ background: 'radial-gradient(circle, #F0B90B 0%, transparent 70%)' }}
      />

      <div className="relative z-10 w-full max-w-[440px] mx-4">
        {/* Language toggle */}
        <div className="absolute -top-12 right-0">
          <button onClick={() => setLang(lang === 'zh' ? 'en' : 'zh')} className="text-[10px] text-[#848E9C] hover:text-[#D1D4DC] px-2 py-1 rounded bg-white/5 hover:bg-white/10 transition-colors font-medium">{lang === 'zh' ? 'EN' : '中'}</button>
        </div>
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-[#F0B90B]/20 to-[#F0B90B]/5 border border-[#F0B90B]/20 mb-4">
            <Trophy className="w-8 h-8 text-[#F0B90B]" />
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight" style={{ fontFamily: "'DM Mono', monospace" }}>
            {t('login.title')}
          </h1>
          <p className="text-[#848E9C] text-sm mt-2">{t('login.subtitle')}</p>
        </div>

        {/* Stats */}
        <div className="flex items-center justify-center gap-6 mb-8">
          <div className="text-center">
            <div className="text-[#F0B90B] text-lg font-bold" style={{ fontFamily: "'DM Mono', monospace" }}>5,000</div>
            <div className="text-[#5E6673] text-[10px] uppercase tracking-wider">{t('login.capital')}</div>
          </div>
          <div className="w-px h-8 bg-[rgba(255,255,255,0.06)]" />
          <div className="text-center">
            <div className="text-white text-lg font-bold" style={{ fontFamily: "'DM Mono', monospace" }}>SOL</div>
            <div className="text-[#5E6673] text-[10px] uppercase tracking-wider">{t('login.pair')}</div>
          </div>
          <div className="w-px h-8 bg-[rgba(255,255,255,0.06)]" />
          <div className="text-center">
            <div className="text-white text-lg font-bold" style={{ fontFamily: "'DM Mono', monospace" }}>24H</div>
            <div className="text-[#5E6673] text-[10px] uppercase tracking-wider">{t('login.duration')}</div>
          </div>
          <div className="w-px h-8 bg-[rgba(255,255,255,0.06)]" />
          <div className="text-center">
            <div className="text-[#0ECB81] text-lg font-bold" style={{ fontFamily: "'DM Mono', monospace" }}>500U</div>
            <div className="text-[#5E6673] text-[10px] uppercase tracking-wider">{t('login.pool')}</div>
          </div>
        </div>

        {/* Login card */}
        <div className="bg-[#1C2030]/80 backdrop-blur-sm border border-[rgba(255,255,255,0.06)] rounded-xl overflow-hidden">
          {/* Tabs */}
          <div className="flex border-b border-[rgba(255,255,255,0.06)]">
            <button className={tabClass(mode === 'register')} onClick={() => { setMode('register'); setError(null); }}>
              <UserPlus className="w-3.5 h-3.5" />
              {t('login.tabNew')}
            </button>
            <button className={tabClass(mode === 'quick')} onClick={() => { setMode('quick'); setError(null); }}>
              <LogIn className="w-3.5 h-3.5" />
              {t('login.tabReturn')}
            </button>
          </div>

          <div className="p-6">
            {mode === 'register' ? (
              <form onSubmit={handleRegister}>
                <label className="block text-[#848E9C] text-xs uppercase tracking-wider mb-2">
                  {t('login.inviteCode')}
                </label>
                <input
                  type="text"
                  value={inviteCode}
                  onChange={(e) => setInviteCode(e.target.value)}
                  placeholder={t('login.invitePlaceholder')}
                  maxLength={32}
                  className="w-full bg-[#0B0E11] border border-[rgba(255,255,255,0.1)] rounded-lg px-4 py-3 text-white placeholder:text-[#5E6673] focus:outline-none focus:border-[#F0B90B]/50 transition-colors text-sm"
                  style={{ fontFamily: "'DM Mono', monospace" }}
                  autoFocus
                />

                <label className="block text-[#848E9C] text-xs uppercase tracking-wider mb-2 mt-4">
                  {t('login.setUsername')}
                </label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder={t('login.usernamePlaceholder')}
                  maxLength={20}
                  className="w-full bg-[#0B0E11] border border-[rgba(255,255,255,0.1)] rounded-lg px-4 py-3 text-white placeholder:text-[#5E6673] focus:outline-none focus:border-[#F0B90B]/50 transition-colors text-sm"
                  style={{ fontFamily: "'DM Mono', monospace" }}
                />

                <button
                  type="submit"
                  disabled={!inviteCode.trim() || !username.trim() || isLoading}
                  className="w-full mt-4 bg-gradient-to-r from-[#F0B90B] to-[#F0B90B]/90 hover:from-[#F0B90B]/90 hover:to-[#F0B90B] text-[#0B0E11] font-bold py-3 rounded-lg transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm"
                >
                  {isLoading ? (
                    <div className="w-5 h-5 border-2 border-[#0B0E11]/30 border-t-[#0B0E11] rounded-full animate-spin" />
                  ) : (
                    <>
                      {t('login.register')}
                      <ChevronRight className="w-4 h-4" />
                    </>
                  )}
                </button>

                {error && <p className="mt-3 text-[#F6465D] text-xs text-center">{error}</p>}

                <p className="text-center text-[#5E6673] text-[10px] mt-3">
                  {t('login.registerHint')}
                </p>
              </form>
            ) : (
              <form onSubmit={handleQuickLogin}>
                <label className="block text-[#848E9C] text-xs uppercase tracking-wider mb-2">
                  {t('login.username')}
                </label>
                <input
                  type="text"
                  value={quickUsername}
                  onChange={(e) => setQuickUsername(e.target.value)}
                  placeholder={t('login.quickPlaceholder')}
                  maxLength={20}
                  className="w-full bg-[#0B0E11] border border-[rgba(255,255,255,0.1)] rounded-lg px-4 py-3 text-white placeholder:text-[#5E6673] focus:outline-none focus:border-[#F0B90B]/50 transition-colors text-sm"
                  style={{ fontFamily: "'DM Mono', monospace" }}
                  autoFocus
                />

                <button
                  type="submit"
                  disabled={!quickUsername.trim() || isLoading}
                  className="w-full mt-4 bg-gradient-to-r from-[#F0B90B] to-[#F0B90B]/90 hover:from-[#F0B90B]/90 hover:to-[#F0B90B] text-[#0B0E11] font-bold py-3 rounded-lg transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm"
                >
                  {isLoading ? (
                    <div className="w-5 h-5 border-2 border-[#0B0E11]/30 border-t-[#0B0E11] rounded-full animate-spin" />
                  ) : (
                    <>
                      {t('login.enter')}
                      <ChevronRight className="w-4 h-4" />
                    </>
                  )}
                </button>

                {error && <p className="mt-3 text-[#F6465D] text-xs text-center">{error}</p>}

                <p className="text-center text-[#5E6673] text-[10px] mt-3">
                  {t('login.returnHint')}
                </p>
              </form>
            )}
          </div>
        </div>

        {/* Features */}
        <div className="grid grid-cols-2 gap-3 mt-6">
          <div className="bg-[#1C2030]/40 border border-[rgba(255,255,255,0.04)] rounded-lg p-3 flex items-start gap-2.5">
            <Zap className="w-4 h-4 text-[#F0B90B] shrink-0 mt-0.5" />
            <div>
              <div className="text-white text-xs font-medium">{t('login.feat1.title')}</div>
              <div className="text-[#5E6673] text-[10px] mt-0.5">{t('login.feat1.desc')}</div>
            </div>
          </div>
          <div className="bg-[#1C2030]/40 border border-[rgba(255,255,255,0.04)] rounded-lg p-3 flex items-start gap-2.5">
            <TrendingUp className="w-4 h-4 text-[#0ECB81] shrink-0 mt-0.5" />
            <div>
              <div className="text-white text-xs font-medium">{t('login.feat2.title')}</div>
              <div className="text-[#5E6673] text-[10px] mt-0.5">{t('login.feat2.desc')}</div>
            </div>
          </div>
          <div className="bg-[#1C2030]/40 border border-[rgba(255,255,255,0.04)] rounded-lg p-3 flex items-start gap-2.5">
            <Trophy className="w-4 h-4 text-[#F0B90B] shrink-0 mt-0.5" />
            <div>
              <div className="text-white text-xs font-medium">{t('login.feat3.title')}</div>
              <div className="text-[#5E6673] text-[10px] mt-0.5">{t('login.feat3.desc')}</div>
            </div>
          </div>
          <div className="bg-[#1C2030]/40 border border-[rgba(255,255,255,0.04)] rounded-lg p-3 flex items-start gap-2.5">
            <Shield className="w-4 h-4 text-[#848E9C] shrink-0 mt-0.5" />
            <div>
              <div className="text-white text-xs font-medium">{t('login.feat4.title')}</div>
              <div className="text-[#5E6673] text-[10px] mt-0.5">{t('login.feat4.desc')}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

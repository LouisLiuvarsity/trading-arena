import { useState, useEffect, useCallback, useRef } from 'react';
import { Link } from 'wouter';
import { Trophy, ChevronRight, ChevronLeft, UserPlus, LogIn, Sparkles, BarChart3, Target, Users, Check, X, Loader2 } from 'lucide-react';
import { useT } from '@/lib/i18n';
import LanguageToggle from '@/components/LanguageToggle';
import { useAuth } from '@/contexts/AuthContext';
import { checkUsername as apiCheckUsername } from '@/lib/api';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from '@/components/ui/alert-dialog';

interface LoginPageProps {
  onLogin?: (email: string, username: string, password: string) => Promise<void>;
  onQuickLogin?: (username: string, password: string) => Promise<void>;
}

// Floating particles animation
function FloatingParticles() {
  const [particles] = useState(() =>
    Array.from({ length: 20 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: 2 + Math.random() * 4,
      duration: 15 + Math.random() * 20,
      delay: Math.random() * 10,
      opacity: 0.1 + Math.random() * 0.2,
    }))
  );

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {particles.map((p) => (
        <div
          key={p.id}
          className="absolute rounded-full bg-[#F0B90B]"
          style={{
            left: `${p.x}%`,
            top: `${p.y}%`,
            width: p.size,
            height: p.size,
            opacity: p.opacity,
            animation: `float-particle ${p.duration}s ease-in-out ${p.delay}s infinite alternate`,
          }}
        />
      ))}
      <style>{`
        @keyframes float-particle {
          0% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(30px, -40px) scale(1.2); }
          66% { transform: translate(-20px, -80px) scale(0.8); }
          100% { transform: translate(10px, -120px) scale(1.1); }
        }
      `}</style>
    </div>
  );
}

// Animated counter
function AnimatedNumber({ value, suffix = '' }: { value: number; suffix?: string }) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    const duration = 1500;
    const start = performance.now();
    const animate = (now: number) => {
      const elapsed = now - start;
      const progress = Math.min(1, elapsed / duration);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(value * eased));
      if (progress < 1) requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
  }, [value]);
  return <>{display.toLocaleString()}{suffix}</>;
}

export default function LoginPage({ onLogin: onLoginProp, onQuickLogin: onQuickLoginProp }: LoginPageProps) {
  const auth = useAuth();
  const onLogin = onLoginProp ?? auth.login;
  const onQuickLogin = onQuickLoginProp ?? auth.quickLogin;
  const { t } = useT();
  const [mode, setMode] = useState<'register' | 'quick'>(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      if (params.get('mode') === 'register') return 'register';
    } catch {}
    return localStorage.getItem("arena_username") ? 'quick' : 'register';
  });
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [quickUsername, setQuickUsername] = useState(() => localStorage.getItem("arena_username") ?? '');
  const [quickPassword, setQuickPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  // Confirmation dialog state
  const [showConfirm, setShowConfirm] = useState(false);

  // Username availability check state
  const [usernameStatus, setUsernameStatus] = useState<'idle' | 'checking' | 'available' | 'taken'>('idle');
  const checkTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Debounced username availability check
  const checkUsernameAvailability = useCallback((name: string) => {
    if (checkTimerRef.current) clearTimeout(checkTimerRef.current);
    const trimmed = name.trim();
    if (!trimmed || trimmed.length < 2) {
      setUsernameStatus('idle');
      return;
    }
    setUsernameStatus('checking');
    checkTimerRef.current = setTimeout(async () => {
      try {
        const result = await apiCheckUsername(trimmed);
        setUsernameStatus(result.available ? 'available' : 'taken');
      } catch {
        setUsernameStatus('idle');
      }
    }, 500);
  }, []);

  const handleUsernameChange = (value: string) => {
    setUsername(value);
    checkUsernameAvailability(value);
  };

  // Show confirmation dialog instead of directly registering
  const handleRegisterClick = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !username.trim() || !password || usernameStatus === 'taken') return;
    setShowConfirm(true);
  };

  // Actually perform registration after confirmation
  const handleConfirmRegister = async () => {
    setShowConfirm(false);
    setIsLoading(true);
    setError(null);
    try {
      await onLogin(email.trim(), username.trim(), password);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickUsername.trim() || !quickPassword) return;
    setIsLoading(true);
    setError(null);
    try {
      await onQuickLogin(quickUsername.trim(), quickPassword);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  const tabClass = (active: boolean) =>
    `flex-1 py-2 text-xs font-medium transition-all duration-200 border-b-2 flex items-center justify-center gap-1.5 ${
      active
        ? 'text-[#F0B90B] border-[#F0B90B]'
        : 'text-[#5E6673] border-transparent hover:text-[#848E9C]'
    }`;

  // Mask password for display: show first and last char, mask the rest
  const maskPassword = (pw: string) => {
    if (pw.length <= 2) return '*'.repeat(pw.length);
    return pw[0] + '*'.repeat(pw.length - 2) + pw[pw.length - 1];
  };

  return (
    <div className="h-screen w-screen bg-[#0B0E11] flex items-center justify-center overflow-hidden relative">
      {/* Animated background */}
      <FloatingParticles />
      <div className="absolute inset-0 opacity-[0.02]"
        style={{
          backgroundImage: `
            linear-gradient(rgba(240,185,11,0.3) 1px, transparent 1px),
            linear-gradient(90deg, rgba(240,185,11,0.3) 1px, transparent 1px)
          `,
          backgroundSize: '60px 60px',
        }}
      />
      {/* Animated glow orbs */}
      <div className="absolute top-1/4 left-1/4 w-[400px] h-[400px] rounded-full opacity-[0.04] animate-pulse"
        style={{ background: 'radial-gradient(circle, #F0B90B 0%, transparent 70%)', animationDuration: '4s' }}
      />
      <div className="absolute bottom-1/4 right-1/4 w-[300px] h-[300px] rounded-full opacity-[0.03] animate-pulse"
        style={{ background: 'radial-gradient(circle, #0ECB81 0%, transparent 70%)', animationDuration: '6s' }}
      />

      {/* Back button */}
      <Link href="/" className="absolute top-5 left-5 z-20 flex items-center gap-1.5 text-[#848E9C] hover:text-[#D1D4DC] transition-colors group">
        <ChevronLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
        <span className="text-[12px] font-medium">{t('login.back')}</span>
      </Link>

      <div className={`relative z-10 w-full max-w-[440px] mx-4 transition-all duration-700 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
        {/* Language toggle */}
        <div className="absolute -top-12 right-0">
          <LanguageToggle />
        </div>

        {/* Logo with animation */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-[#F0B90B]/20 to-[#F0B90B]/5 border border-[#F0B90B]/20 mb-4 animate-[bounce_3s_ease-in-out_infinite]">
            <Trophy className="w-8 h-8 text-[#F0B90B]" />
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight" style={{ fontFamily: "'DM Mono', monospace" }}>
            {t('login.title')}
          </h1>
          <p className="text-[#848E9C] text-sm mt-2">{t('login.subtitle')}</p>
        </div>

        {/* Animated highlights */}
        <div className="flex items-center justify-center gap-4 mb-6">
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-[#F0B90B]/5 border border-[#F0B90B]/10 rounded-full">
            <Sparkles className="w-3 h-3 text-[#F0B90B]" />
            <span className="text-[11px] text-[#F0B90B] font-medium">{t('login.highlight1')}</span>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-[#0ECB81]/5 border border-[#0ECB81]/10 rounded-full">
            <Target className="w-3 h-3 text-[#0ECB81]" />
            <span className="text-[11px] text-[#0ECB81] font-medium">{t('login.highlight2')}</span>
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
              <form onSubmit={handleRegisterClick}>
                <label className="block text-[#848E9C] text-xs uppercase tracking-wider mb-2">
                  {t('login.email')}
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={t('login.emailPlaceholder')}
                  maxLength={128}
                  className="w-full bg-[#0B0E11] border border-[rgba(255,255,255,0.1)] rounded-lg px-4 py-3 text-white placeholder:text-[#5E6673] focus:outline-none focus:border-[#F0B90B]/50 transition-colors text-sm"
                  style={{ fontFamily: "'DM Mono', monospace" }}
                  autoFocus
                />

                <label className="block text-[#848E9C] text-xs uppercase tracking-wider mb-2 mt-4">
                  {t('login.setNickname')}
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => handleUsernameChange(e.target.value)}
                    placeholder={t('login.nicknamePlaceholder')}
                    maxLength={20}
                    className={`w-full bg-[#0B0E11] border rounded-lg px-4 py-3 text-white placeholder:text-[#5E6673] focus:outline-none transition-colors text-sm pr-10 ${
                      usernameStatus === 'taken'
                        ? 'border-[#F6465D]/50 focus:border-[#F6465D]/70'
                        : usernameStatus === 'available'
                        ? 'border-[#0ECB81]/50 focus:border-[#0ECB81]/70'
                        : 'border-[rgba(255,255,255,0.1)] focus:border-[#F0B90B]/50'
                    }`}
                    style={{ fontFamily: "'DM Mono', monospace" }}
                  />
                  {/* Username status indicator */}
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    {usernameStatus === 'checking' && (
                      <Loader2 className="w-4 h-4 text-[#848E9C] animate-spin" />
                    )}
                    {usernameStatus === 'available' && (
                      <Check className="w-4 h-4 text-[#0ECB81]" />
                    )}
                    {usernameStatus === 'taken' && (
                      <X className="w-4 h-4 text-[#F6465D]" />
                    )}
                  </div>
                </div>
                {/* Username status text */}
                {usernameStatus === 'checking' && (
                  <p className="text-[#848E9C] text-[10px] mt-1">{t('login.nicknameChecking')}</p>
                )}
                {usernameStatus === 'available' && (
                  <p className="text-[#0ECB81] text-[10px] mt-1">{t('login.nicknameAvailable')}</p>
                )}
                {usernameStatus === 'taken' && (
                  <p className="text-[#F6465D] text-[10px] mt-1">{t('login.nicknameTaken')}</p>
                )}

                <label className="block text-[#848E9C] text-xs uppercase tracking-wider mb-2 mt-4">
                  {t('login.password')}
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={t('login.passwordPlaceholder')}
                  maxLength={128}
                  className="w-full bg-[#0B0E11] border border-[rgba(255,255,255,0.1)] rounded-lg px-4 py-3 text-white placeholder:text-[#5E6673] focus:outline-none focus:border-[#F0B90B]/50 transition-colors text-sm"
                  style={{ fontFamily: "'DM Mono', monospace" }}
                />

                <button
                  type="submit"
                  disabled={!email.trim() || !username.trim() || !password || password.length < 4 || usernameStatus === 'taken' || usernameStatus === 'checking' || isLoading}
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
                  {t('login.nickname')}
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

                <label className="block text-[#848E9C] text-xs uppercase tracking-wider mb-2 mt-4">
                  {t('login.password')}
                </label>
                <input
                  type="password"
                  value={quickPassword}
                  onChange={(e) => setQuickPassword(e.target.value)}
                  placeholder={t('login.passwordPlaceholder')}
                  maxLength={128}
                  className="w-full bg-[#0B0E11] border border-[rgba(255,255,255,0.1)] rounded-lg px-4 py-3 text-white placeholder:text-[#5E6673] focus:outline-none focus:border-[#F0B90B]/50 transition-colors text-sm"
                  style={{ fontFamily: "'DM Mono', monospace" }}
                />

                <button
                  type="submit"
                  disabled={!quickUsername.trim() || !quickPassword || isLoading}
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

        {/* Platform highlights instead of competition stats */}
        <div className="grid grid-cols-3 gap-3 mt-6">
          <div className="bg-[#1C2030]/40 border border-[rgba(255,255,255,0.04)] rounded-lg p-3 text-center group hover:border-[#F0B90B]/20 transition-colors">
            <BarChart3 className="w-5 h-5 text-[#F0B90B] mx-auto mb-1.5 group-hover:scale-110 transition-transform" />
            <div className="text-white text-xs font-medium">{t('login.feat1.title')}</div>
            <div className="text-[#5E6673] text-[10px] mt-0.5">{t('login.feat1.desc')}</div>
          </div>
          <div className="bg-[#1C2030]/40 border border-[rgba(255,255,255,0.04)] rounded-lg p-3 text-center group hover:border-[#0ECB81]/20 transition-colors">
            <Users className="w-5 h-5 text-[#0ECB81] mx-auto mb-1.5 group-hover:scale-110 transition-transform" />
            <div className="text-white text-xs font-medium">{t('login.feat2.title')}</div>
            <div className="text-[#5E6673] text-[10px] mt-0.5">{t('login.feat2.desc')}</div>
          </div>
          <div className="bg-[#1C2030]/40 border border-[rgba(255,255,255,0.04)] rounded-lg p-3 text-center group hover:border-[#848E9C]/20 transition-colors">
            <Trophy className="w-5 h-5 text-[#F0B90B] mx-auto mb-1.5 group-hover:scale-110 transition-transform" />
            <div className="text-white text-xs font-medium">{t('login.feat3.title')}</div>
            <div className="text-[#5E6673] text-[10px] mt-0.5">{t('login.feat3.desc')}</div>
          </div>
        </div>
      </div>

      {/* Registration Confirmation Dialog */}
      <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
        <AlertDialogContent className="bg-[#1C2030] border-[rgba(255,255,255,0.1)] max-w-sm">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white text-lg">
              {t('login.confirmTitle')}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-[#848E9C] text-sm">
              {t('login.confirmDesc')}
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="space-y-3 py-2">
            <div className="bg-[#0B0E11] rounded-lg p-3 border border-[rgba(255,255,255,0.06)]">
              <div className="text-[#848E9C] text-[10px] uppercase tracking-wider mb-1">{t('login.confirmEmail')}</div>
              <div className="text-white text-sm font-mono">{email}</div>
            </div>
            <div className="bg-[#0B0E11] rounded-lg p-3 border border-[rgba(255,255,255,0.06)]">
              <div className="text-[#848E9C] text-[10px] uppercase tracking-wider mb-1">{t('login.confirmPassword')}</div>
              <div className="text-white text-sm font-mono">{maskPassword(password)}</div>
            </div>
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel className="bg-transparent border-[rgba(255,255,255,0.1)] text-[#848E9C] hover:bg-[#0B0E11] hover:text-white">
              {t('login.cancelBtn')}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmRegister}
              className="bg-[#F0B90B] text-[#0B0E11] hover:bg-[#F0B90B]/90 font-bold"
            >
              {t('login.confirmBtn')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

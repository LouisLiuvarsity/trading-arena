import { useState, useRef, useEffect } from 'react';
import { useT } from '@/lib/i18n';
import { Link } from 'wouter';
import { Trophy, Menu, ChevronDown } from 'lucide-react';
import { useIsMobile } from '@/hooks/useMobile';
import { useAuth } from '@/contexts/AuthContext';
import {
  Sheet,
  SheetTrigger,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import LanguageToggle from '@/components/LanguageToggle';

const ANCHOR_LINKS = [
  { key: 'land.nav.competitions', href: '#competitions' },
  { key: 'land.nav.about', href: '#how-it-works' },
  { key: 'land.nav.competitionRules', href: '#highlights' },
  { key: 'land.nav.leaderboard', href: '#leaderboard' },
] as const;

function scrollTo(href: string) {
  const el = document.querySelector(href);
  if (el) el.scrollIntoView({ behavior: 'smooth' });
}

// ─── Explore Dropdown (Desktop) ─────────────────────────────
function ExploreDropdown() {
  const { t } = useT();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1 h-8 px-3 rounded-md text-[13px] font-medium text-[#848E9C] hover:text-[#D1D4DC] hover:bg-white/[0.04] transition-colors"
      >
        {t('land.nav.explore') || 'Explore'}
        <ChevronDown className={`w-3.5 h-3.5 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-2 w-48 rounded-xl border border-white/[0.08] bg-[#141820]/98 backdrop-blur-lg shadow-[0_16px_48px_rgba(0,0,0,0.5)] py-1.5 z-50">
          {ANCHOR_LINKS.map(({ key, href }) => (
            <button
              key={key}
              onClick={() => {
                setOpen(false);
                setTimeout(() => scrollTo(href), 100);
              }}
              className="block w-full text-left px-4 py-2.5 text-[13px] text-[#D1D4DC] hover:text-white hover:bg-white/[0.06] transition-colors"
            >
              {t(key)}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Mobile Nav ──────────────────────────────────────────────
function MobileNav() {
  const { t, lang } = useT();
  const { isAuthenticated, logout } = useAuth();
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <button className="p-2 text-[#848E9C] hover:text-[#D1D4DC] transition-colors">
          <Menu className="w-5 h-5" />
        </button>
      </SheetTrigger>
      <SheetContent side="left" className="bg-[#0D1017] border-white/[0.06] w-[280px]">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2 text-[#F0B90B] font-display font-bold">
            <Trophy className="w-4 h-4" />
            Otter Trader
          </SheetTitle>
        </SheetHeader>

        <div className="mt-4 px-2">
          {/* Anchor links */}
          <div className="mb-3">
            <div className="text-[10px] uppercase tracking-[0.2em] text-[#5E6673] px-1 mb-2">
              {lang === 'zh' ? '页面导航' : 'On this page'}
            </div>
            {ANCHOR_LINKS.map(({ key, href }) => (
              <button
                key={key}
                onClick={() => { setOpen(false); setTimeout(() => scrollTo(href), 150); }}
                className="block w-full text-left py-2.5 px-1 text-[13px] text-[#D1D4DC] hover:text-[#F0B90B] transition-colors"
              >
                {t(key)}
              </button>
            ))}
          </div>

          <div className="border-t border-white/[0.06] my-3" />

          {/* Language */}
          <div className="mb-4">
            <LanguageToggle />
          </div>

          {/* CTA */}
          <div className="space-y-2">
            {isAuthenticated ? (
              <>
                <Link
                  href="/ai-arena"
                  onClick={() => setOpen(false)}
                  className="block w-full text-center py-2.5 border border-[#F0B90B]/30 text-[#F0B90B] rounded-lg text-[13px] font-medium"
                >
                  {lang === 'zh' ? '围观人类 vs AI' : 'Watch Humans vs AI'}
                </Link>
                <Link
                  href="/hub"
                  onClick={() => setOpen(false)}
                  className="block w-full text-center py-2.5 bg-[#F0B90B] text-[#0B0E11] rounded-lg text-[13px] font-bold"
                >
                  {lang === 'zh' ? '进入 Hub' : 'Open Hub'}
                </Link>
                <Link
                  href="/agents"
                  onClick={() => setOpen(false)}
                  className="block w-full text-center py-2.5 border border-white/[0.08] text-[#D1D4DC] rounded-lg text-[13px] font-medium"
                >
                  {lang === 'zh' ? 'AI管理中心' : 'Agent Center'}
                </Link>
                <button
                  type="button"
                  onClick={() => {
                    setOpen(false);
                    logout();
                  }}
                  className="block w-full rounded-lg border border-[#F6465D]/30 py-2.5 text-[13px] font-medium text-[#F6465D]"
                >
                  {lang === 'zh' ? '退出登录' : 'Log Out'}
                </button>
              </>
            ) : (
              <>
                <Link
                  href="/ai-arena"
                  onClick={() => setOpen(false)}
                  className="block w-full text-center py-2.5 border border-[#F0B90B]/30 text-[#F0B90B] rounded-lg text-[13px] font-medium"
                >
                  {lang === 'zh' ? '围观人类 vs AI' : 'Watch Humans vs AI'}
                </Link>
                <Link
                  href="/agent-join"
                  onClick={() => setOpen(false)}
                  className="block w-full text-center py-2.5 border border-white/[0.08] text-[#D1D4DC] rounded-lg text-[13px] font-medium"
                >
                  Agent Entry
                </Link>
                <Link
                  href="/login?mode=register"
                  onClick={() => setOpen(false)}
                  className="block w-full text-center py-2.5 bg-[#F0B90B] text-[#0B0E11] rounded-lg text-[13px] font-bold"
                >
                  {t('land.nav.register')}
                </Link>
                <Link
                  href="/login"
                  onClick={() => setOpen(false)}
                  className="block w-full text-center py-2.5 border border-[#F0B90B]/40 text-[#F0B90B] rounded-lg text-[13px] font-medium"
                >
                  {t('land.nav.login')}
                </Link>
              </>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

// ─── Main Navbar ─────────────────────────────────────────────
export default function LandingNavbar() {
  const { t, lang } = useT();
  const { isAuthenticated, logout } = useAuth();
  const isMobile = useIsMobile();

  return (
    <header className="fixed top-0 left-0 right-0 z-50 h-16 bg-[#0B0E11]/95 backdrop-blur-md border-b border-white/[0.05]">
      <div className="max-w-7xl mx-auto h-full px-4 sm:px-6 flex items-center">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 mr-6 shrink-0">
          <div className="w-8 h-8 rounded-lg bg-[#F0B90B]/10 flex items-center justify-center">
            <Trophy className="w-4 h-4 text-[#F0B90B]" />
          </div>
          <span className="text-[#F0B90B] font-display font-bold text-[15px]">Otter Trader</span>
        </Link>

        {/* Desktop Nav */}
        {!isMobile && (
          <>
            <nav className="hidden md:flex items-center gap-1">
              <ExploreDropdown />
              <Link
                href="/ai-arena"
                className="h-8 px-3 rounded-md text-[13px] font-medium text-[#F0B90B] hover:text-[#F8D57A] hover:bg-[#F0B90B]/[0.06] transition-colors flex items-center"
              >
                {lang === 'zh' ? '围观人类 vs AI' : 'Humans vs AI'}
              </Link>
              <Link
                href="/past-competitions"
                className="h-8 px-3 rounded-md text-[13px] font-medium text-[#848E9C] hover:text-[#D1D4DC] hover:bg-white/[0.04] transition-colors flex items-center"
              >
                {lang === 'zh' ? '往期比赛' : 'Past'}
              </Link>
            </nav>

            {/* Right side */}
            <div className="ml-auto flex items-center gap-2">
              <LanguageToggle />
              {isAuthenticated ? (
                <>
                  <Link
                    href="/hub"
                    className="px-4 py-1.5 text-[12px] font-medium text-[#D1D4DC] hover:text-white transition-colors"
                  >
                    {lang === 'zh' ? '进入 Hub' : 'Open Hub'}
                  </Link>
                  <Link
                    href="/agents"
                    className="px-4 py-1.5 text-[12px] font-medium text-[#D1D4DC] hover:text-white transition-colors"
                  >
                    {lang === 'zh' ? 'AI管理中心' : 'Agent Center'}
                  </Link>
                  <button
                    type="button"
                    onClick={logout}
                    className="px-4 py-1.5 rounded-lg border border-[#F6465D]/30 text-[12px] font-medium text-[#F6465D] transition-colors hover:bg-[#F6465D]/10"
                  >
                    {lang === 'zh' ? '退出' : 'Log Out'}
                  </button>
                </>
              ) : (
                <>
                  <Link
                    href="/agent-join"
                    className="px-4 py-1.5 text-[12px] font-medium text-[#D1D4DC] hover:text-white transition-colors"
                  >
                    Agent Entry
                  </Link>
                  <Link
                    href="/login"
                    className="px-4 py-1.5 text-[12px] font-medium text-[#D1D4DC] hover:text-white transition-colors"
                  >
                    {t('land.nav.login')}
                  </Link>
                  <Link
                    href="/login?mode=register"
                    className="px-4 py-1.5 bg-[#F0B90B] hover:bg-[#F0B90B]/90 text-[#0B0E11] rounded-lg text-[12px] font-bold transition-colors"
                  >
                    {t('land.nav.register')}
                  </Link>
                </>
              )}
            </div>
          </>
        )}

        {/* Mobile hamburger */}
        {isMobile && (
          <div className="ml-auto flex items-center gap-2">
            <LanguageToggle />
            <MobileNav />
          </div>
        )}
      </div>
    </header>
  );
}

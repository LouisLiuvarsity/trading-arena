import { useState } from 'react';
import { useT } from '@/lib/i18n';
import { Link } from 'wouter';
import { Trophy, Menu } from 'lucide-react';
import { useIsMobile } from '@/hooks/useMobile';
import {
  Sheet,
  SheetTrigger,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import LanguageToggle from '@/components/LanguageToggle';

const NAV_LINKS = [
  { key: 'land.nav.competitions', href: '#competitions' },
  { key: 'land.nav.about', href: '#how-it-works' },
  { key: 'land.nav.competitionRules', href: '#rules' },
  { key: 'land.nav.prizes', href: '#prizes' },
  { key: 'land.nav.leaderboard', href: '#leaderboard' },
  { key: 'land.nav.faq', href: '#faq' },
] as const;

function scrollTo(href: string) {
  const el = document.querySelector(href);
  if (el) el.scrollIntoView({ behavior: 'smooth' });
}

// ─── Mobile Nav ──────────────────────────────────────────────
function MobileNav() {
  const { t } = useT();
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
          {/* Nav links */}
          {NAV_LINKS.map(({ key, href }) => (
            <button
              key={key}
              onClick={() => { setOpen(false); setTimeout(() => scrollTo(href), 150); }}
              className="block w-full text-left py-3 text-[13px] text-[#D1D4DC] hover:text-[#F0B90B] transition-colors border-b border-white/[0.05]"
            >
              {t(key)}
            </button>
          ))}

          {/* Language */}
          <div className="mt-4">
            <LanguageToggle />
          </div>

          {/* CTA */}
          <div className="mt-6 space-y-2">
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
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

// ─── Main Navbar ─────────────────────────────────────────────
export default function LandingNavbar() {
  const { t } = useT();
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
              {NAV_LINKS.map(({ key, href }) => (
                <button
                  key={key}
                  onClick={() => scrollTo(href)}
                  className="h-8 px-3 rounded-md text-[13px] font-medium text-[#848E9C] hover:text-[#D1D4DC] hover:bg-white/[0.04] transition-colors"
                >
                  {t(key)}
                </button>
              ))}
            </nav>

            {/* Right side */}
            <div className="ml-auto flex items-center gap-2">
              <LanguageToggle />
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

import { useState } from 'react';
import { useT } from '@/lib/i18n';
import type { Lang } from '@/lib/i18n';
import { Link } from 'wouter';
import { Trophy, Menu, ChevronDown, UserPlus, Clock, Target, Zap, TrendingUp, Award, Shield } from 'lucide-react';
import { useIsMobile } from '@/hooks/useMobile';
import {
  NavigationMenu,
  NavigationMenuList,
  NavigationMenuItem,
  NavigationMenuTrigger,
  NavigationMenuContent,
  NavigationMenuLink,
} from '@/components/ui/navigation-menu';
import {
  Sheet,
  SheetTrigger,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from '@/components/ui/accordion';

// ─── About Dropdown ─────────────────────────────────────────
function AboutDropdown() {
  const { t } = useT();
  const steps = [
    { icon: UserPlus, title: t('land.about.step1.title'), desc: t('land.about.step1.desc'), color: '#F0B90B' },
    { icon: Zap, title: t('land.about.step2.title'), desc: t('land.about.step2.desc'), color: '#0ECB81' },
    { icon: Award, title: t('land.about.step3.title'), desc: t('land.about.step3.desc'), color: '#F0B90B' },
  ];

  return (
    <div className="w-[420px] p-4">
      <p className="text-[13px] font-semibold text-[#D1D4DC] mb-3">{t('land.about.title')}</p>
      <div className="space-y-2">
        {steps.map((s, i) => (
          <div key={i} className="flex gap-3 p-3 rounded-lg hover:bg-white/[0.04] transition-colors">
            <div
              className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
              style={{ background: `${s.color}15` }}
            >
              <s.icon className="w-4 h-4" style={{ color: s.color }} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold text-[#5E6673]">STEP {i + 1}</span>
                <span className="text-[12px] font-semibold text-[#D1D4DC]">{s.title}</span>
              </div>
              <p className="text-[11px] text-[#848E9C] mt-0.5 leading-relaxed">{s.desc}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Rules Dropdown ─────────────────────────────────────────
function RulesDropdown() {
  const { t } = useT();
  const rules = [
    { icon: Target, text: t('land.rules.dropdown.minTrades') },
    { icon: Clock, text: t('land.rules.dropdown.holdWeight') },
    { icon: TrendingUp, text: t('land.rules.dropdown.leverage') },
    { icon: Shield, text: t('land.rules.dropdown.ranking') },
    { icon: Zap, text: t('land.rules.dropdown.maxTrades') },
    { icon: Award, text: t('land.rules.dropdown.prizePool') },
  ];

  return (
    <div className="w-[380px] p-4">
      <p className="text-[13px] font-semibold text-[#D1D4DC] mb-3">{t('land.nav.competitionRules')}</p>
      <div className="grid grid-cols-1 gap-1">
        {rules.map((r, i) => (
          <div key={i} className="flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-white/[0.04] transition-colors">
            <r.icon className="w-3.5 h-3.5 text-[#F0B90B] shrink-0" />
            <span className="text-[11px] text-[#D1D4DC]">{r.text}</span>
          </div>
        ))}
      </div>
      <div className="mt-3 pt-3 border-t border-white/[0.06]">
        <Link href="/rules" className="text-[11px] text-[#F0B90B] hover:text-[#F0B90B]/80 transition-colors">
          {t('land.rules.dropdown.viewAll')}
        </Link>
      </div>
    </div>
  );
}

// ─── FAQ Dropdown ────────────────────────────────────────────
function FAQDropdown() {
  const { t } = useT();
  const faqs = [
    { q: t('land.faq.q1'), a: t('land.faq.a1') },
    { q: t('land.faq.q2'), a: t('land.faq.a2') },
    { q: t('land.faq.q3'), a: t('land.faq.a3') },
    { q: t('land.faq.q4'), a: t('land.faq.a4') },
    { q: t('land.faq.q5'), a: t('land.faq.a5') },
    { q: t('land.faq.q6'), a: t('land.faq.a6') },
  ];

  return (
    <div className="w-[420px] p-4">
      <p className="text-[13px] font-semibold text-[#D1D4DC] mb-2">{t('land.nav.faq')}</p>
      <Accordion type="single" collapsible className="space-y-0">
        {faqs.map((faq, i) => (
          <AccordionItem key={i} value={`faq-${i}`} className="border-b border-white/[0.05]">
            <AccordionTrigger className="text-[11px] text-[#D1D4DC] py-2.5 hover:no-underline [&>svg]:w-3 [&>svg]:h-3 [&>svg]:text-[#5E6673]">
              {faq.q}
            </AccordionTrigger>
            <AccordionContent className="text-[11px] text-[#848E9C] pb-2.5 leading-relaxed">
              {faq.a}
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  );
}

// ─── Language Toggle ─────────────────────────────────────────
function LanguageToggle() {
  const { lang, setLang } = useT();
  return (
    <button
      onClick={() => setLang(lang === 'zh' ? 'en' : 'zh')}
      className="px-2.5 py-1 rounded-md text-[11px] font-medium text-[#848E9C] hover:text-[#D1D4DC] hover:bg-white/[0.04] transition-colors"
    >
      {lang === 'zh' ? 'EN' : '中'}
    </button>
  );
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
          <Accordion type="multiple" className="space-y-0">
            {/* About */}
            <AccordionItem value="about" className="border-b border-white/[0.05]">
              <AccordionTrigger className="text-[13px] text-[#D1D4DC] py-3 hover:no-underline">
                {t('land.nav.about')}
              </AccordionTrigger>
              <AccordionContent className="text-[11px] text-[#848E9C] space-y-2 pb-3">
                <p><strong className="text-[#D1D4DC]">1. {t('land.about.step1.title')}</strong> — {t('land.about.step1.desc')}</p>
                <p><strong className="text-[#D1D4DC]">2. {t('land.about.step2.title')}</strong> — {t('land.about.step2.desc')}</p>
                <p><strong className="text-[#D1D4DC]">3. {t('land.about.step3.title')}</strong> — {t('land.about.step3.desc')}</p>
              </AccordionContent>
            </AccordionItem>

            {/* Rules */}
            <AccordionItem value="rules" className="border-b border-white/[0.05]">
              <AccordionTrigger className="text-[13px] text-[#D1D4DC] py-3 hover:no-underline">
                {t('land.nav.competitionRules')}
              </AccordionTrigger>
              <AccordionContent className="text-[11px] text-[#848E9C] space-y-1.5 pb-3">
                <p>{t('land.rules.dropdown.minTrades')}</p>
                <p>{t('land.rules.dropdown.holdWeight')}</p>
                <p>{t('land.rules.dropdown.leverage')}</p>
                <p>{t('land.rules.dropdown.ranking')}</p>
                <Link href="/rules" onClick={() => setOpen(false)} className="text-[#F0B90B] block mt-2">
                  {t('land.rules.dropdown.viewAll')}
                </Link>
              </AccordionContent>
            </AccordionItem>

            {/* FAQ */}
            <AccordionItem value="faq" className="border-b border-white/[0.05]">
              <AccordionTrigger className="text-[13px] text-[#D1D4DC] py-3 hover:no-underline">
                {t('land.nav.faq')}
              </AccordionTrigger>
              <AccordionContent className="text-[11px] text-[#848E9C] space-y-2 pb-3">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <div key={i}>
                    <p className="text-[#D1D4DC] font-medium">{t(`land.faq.q${i}`)}</p>
                    <p className="mt-0.5">{t(`land.faq.a${i}`)}</p>
                  </div>
                ))}
              </AccordionContent>
            </AccordionItem>
          </Accordion>

          {/* Leaderboard link */}
          <Link
            href="/leaderboard-public"
            onClick={() => setOpen(false)}
            className="block py-3 text-[13px] text-[#D1D4DC] hover:text-[#F0B90B] transition-colors border-b border-white/[0.05]"
          >
            {t('land.nav.leaderboard')}
          </Link>

          {/* Language */}
          <div className="mt-4">
            <LanguageToggle />
          </div>

          {/* CTA */}
          <div className="mt-6 space-y-2">
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
            <NavigationMenu className="hidden md:flex">
              <NavigationMenuList>
                {/* About */}
                <NavigationMenuItem>
                  <NavigationMenuTrigger className="bg-transparent text-[13px] text-[#848E9C] hover:text-[#D1D4DC] hover:bg-white/[0.04] data-[state=open]:bg-white/[0.04] data-[state=open]:text-[#D1D4DC] h-8 px-3">
                    {t('land.nav.about')}
                  </NavigationMenuTrigger>
                  <NavigationMenuContent className="bg-[#1C2030] border border-white/[0.08] rounded-xl shadow-2xl shadow-black/40">
                    <AboutDropdown />
                  </NavigationMenuContent>
                </NavigationMenuItem>

                {/* Competition Rules */}
                <NavigationMenuItem>
                  <NavigationMenuTrigger className="bg-transparent text-[13px] text-[#848E9C] hover:text-[#D1D4DC] hover:bg-white/[0.04] data-[state=open]:bg-white/[0.04] data-[state=open]:text-[#D1D4DC] h-8 px-3">
                    {t('land.nav.competitionRules')}
                  </NavigationMenuTrigger>
                  <NavigationMenuContent className="bg-[#1C2030] border border-white/[0.08] rounded-xl shadow-2xl shadow-black/40">
                    <RulesDropdown />
                  </NavigationMenuContent>
                </NavigationMenuItem>

                {/* Leaderboard */}
                <NavigationMenuItem>
                  <Link href="/leaderboard-public">
                    <NavigationMenuLink className="inline-flex h-8 items-center justify-center rounded-md bg-transparent px-3 py-2 text-[13px] font-medium text-[#848E9C] hover:text-[#D1D4DC] hover:bg-white/[0.04] transition-colors cursor-pointer">
                      {t('land.nav.leaderboard')}
                    </NavigationMenuLink>
                  </Link>
                </NavigationMenuItem>

                {/* FAQ */}
                <NavigationMenuItem>
                  <NavigationMenuTrigger className="bg-transparent text-[13px] text-[#848E9C] hover:text-[#D1D4DC] hover:bg-white/[0.04] data-[state=open]:bg-white/[0.04] data-[state=open]:text-[#D1D4DC] h-8 px-3">
                    {t('land.nav.faq')}
                  </NavigationMenuTrigger>
                  <NavigationMenuContent className="bg-[#1C2030] border border-white/[0.08] rounded-xl shadow-2xl shadow-black/40">
                    <FAQDropdown />
                  </NavigationMenuContent>
                </NavigationMenuItem>
              </NavigationMenuList>
            </NavigationMenu>

            {/* Right side */}
            <div className="ml-auto flex items-center gap-2">
              <LanguageToggle />
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

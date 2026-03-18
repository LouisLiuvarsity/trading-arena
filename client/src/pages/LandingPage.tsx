import LandingNavbar from '@/components/landing/LandingNavbar';
import HeroSection from '@/components/landing/HeroSection';
import AgentSpectatorSection from '@/components/landing/AgentSpectatorSection';
import CompetitionShowcase from '@/components/landing/CompetitionShowcase';
import HowItWorks from '@/components/landing/HowItWorks';
import RulesSection from '@/components/landing/RulesSection';
import PrizeSection from '@/components/landing/PrizeSection';
import TierSection from '@/components/landing/TierSection';
import LeaderboardSection from '@/components/landing/LeaderboardSection';
import FAQSection from '@/components/landing/FAQSection';
import BottomCTA from '@/components/landing/BottomCTA';

interface LandingPageProps {
  onEnterArena?: () => void;
}

export default function LandingPage(_props: LandingPageProps) {
  return (
    <div className="min-h-screen bg-[#0B0E11] text-white overflow-x-hidden">
      <LandingNavbar />
      <HeroSection />
      <AgentSpectatorSection />
      <CompetitionShowcase />
      <HowItWorks />
      <RulesSection />
      <PrizeSection />
      <TierSection />
      <LeaderboardSection />
      <FAQSection />
      <BottomCTA />

      {/* Footer */}
      <footer className="border-t border-white/[0.05] py-6 text-center">
        <p className="text-[11px] text-[#5E6673]">
          Otter Trader &copy; {new Date().getFullYear()} &middot; Simulated trading &middot; No real capital at risk
        </p>
      </footer>
    </div>
  );
}

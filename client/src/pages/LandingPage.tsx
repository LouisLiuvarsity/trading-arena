import LandingNavbar from '@/components/landing/LandingNavbar';
import HeroSection from '@/components/landing/HeroSection';
import CompetitionShowcase from '@/components/landing/CompetitionShowcase';
import HowItWorks from '@/components/landing/HowItWorks';
import HighlightsSection from '@/components/landing/HighlightsSection';
import LeaderboardSection from '@/components/landing/LeaderboardSection';
import FAQSection from '@/components/landing/FAQSection';
import BottomCTA from '@/components/landing/BottomCTA';
import Footer from '@/components/landing/Footer';

interface LandingPageProps {
  onEnterArena?: () => void;
}

export default function LandingPage(_props: LandingPageProps) {
  return (
    <div className="min-h-screen bg-[#0B0E11] text-white overflow-x-hidden">
      <LandingNavbar />
      <HeroSection />
      <CompetitionShowcase />
      <HowItWorks />
      <HighlightsSection />
      <LeaderboardSection />
      <FAQSection />
      <BottomCTA />
      <Footer />
    </div>
  );
}

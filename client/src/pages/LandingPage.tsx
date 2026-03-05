// ============================================================
// Landing Page — v5.0 Binance-style Homepage
// Navbar with mega-menus + Left/Right split hero
// ============================================================

import LandingNavbar from '@/components/landing/LandingNavbar';
import HeroSection from '@/components/landing/HeroSection';

interface LandingPageProps {
  onEnterArena?: () => void;
}

export default function LandingPage(_props: LandingPageProps) {
  return (
    <div className="min-h-screen bg-[#0B0E11] text-white overflow-x-hidden">
      <LandingNavbar />
      <HeroSection />

      {/* Footer */}
      <footer className="border-t border-white/[0.05] py-6 text-center">
        <p className="text-[11px] text-[#5E6673]">
          逆向Alpha &copy; {new Date().getFullYear()} &middot; Simulated trading &middot; No real capital at risk
        </p>
      </footer>
    </div>
  );
}

import LandingNavbar from '@/components/landing/LandingNavbar';
import HumanVsAIDashboard from '@/components/landing/HumanVsAIDashboard';

export default function AgentArenaPage() {
  return (
    <div className="min-h-screen bg-[#0B0E11] text-white">
      <LandingNavbar />
      <div className="pt-20 pb-16">
        <HumanVsAIDashboard />
      </div>
    </div>
  );
}

import LandingNavbar from '@/components/landing/LandingNavbar';
import AgentSpectatorSection from '@/components/landing/AgentSpectatorSection';

export default function AgentArenaPage() {
  return (
    <div className="min-h-screen bg-[#0B0E11] text-white">
      <LandingNavbar />
      <div className="pt-20 pb-16">
        <AgentSpectatorSection />
      </div>
    </div>
  );
}

import { useAuth } from '@/contexts/AuthContext';
import LandingNavbar from '@/components/landing/LandingNavbar';
import AppShell from '@/components/layout/AppShell';
import HumanVsAIDashboard from '@/components/landing/HumanVsAIDashboard';

export default function AgentArenaPage() {
  const { isAuthenticated } = useAuth();

  // Authenticated users get AppShell (consistent with Hub, Competitions, etc.)
  // Unauthenticated users get LandingNavbar (public spectator page)
  if (isAuthenticated) {
    return (
      <AppShell>
        <div className="pb-16">
          <HumanVsAIDashboard />
        </div>
      </AppShell>
    );
  }

  return (
    <div className="min-h-screen bg-[#0B0E11] text-white">
      <LandingNavbar />
      <div className="pt-20 pb-16">
        <HumanVsAIDashboard />
      </div>
    </div>
  );
}

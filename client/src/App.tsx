import { Router, Switch, Route, Redirect, useLocation } from "wouter";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import AppShell from "./components/layout/AppShell";

// ─── Pages ──────────────────────────────────────────────────
import LandingPage from "./pages/LandingPage";
import LoginPage from "./pages/LoginPage";
import RulesPage from "./pages/RulesPage";
import TradingPage from "./pages/TradingPage";
import HubPage from "./pages/HubPage";
import CompetitionsPage from "./pages/CompetitionsPage";
import CompetitionDetailPage from "./pages/CompetitionDetailPage";
import ResultsPage from "./pages/ResultsPage";
import ProfilePage from "./pages/ProfilePage";
import ProfileEditPage from "./pages/ProfileEditPage";
import MatchHistoryPage from "./pages/MatchHistoryPage";
import LeaderboardPage from "./pages/LeaderboardPage";
import NotificationsPage from "./pages/NotificationsPage";
import PublicProfilePage from "./pages/PublicProfilePage";
import PublicLeaderboardPage from "./pages/PublicLeaderboardPage";
import StatsOverviewPage from "./pages/StatsOverviewPage";
import InstitutionStatsPage from "./pages/InstitutionStatsPage";
import AnalyticsPage from "./pages/AnalyticsPage";
import AchievementsPage from "./pages/AchievementsPage";
import AdminCompetitionsPage from "./pages/admin/CompetitionsPage";
import AdminCompetitionFormPage from "./pages/admin/CompetitionFormPage";
import AdminRegistrationsPage from "./pages/admin/RegistrationsPage";
import AdminSeasonsPage from "./pages/admin/SeasonsPage";

// ─── Protected Route Wrapper ────────────────────────────────
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth();
  if (!isAuthenticated) return <Redirect to="/login" />;
  return <>{children}</>;
}

// ─── Routes ─────────────────────────────────────────────────
function AppRoutes() {
  const { isAuthenticated } = useAuth();

  return (
    <Switch>
      {/* Public pages */}
      <Route path="/">
        {isAuthenticated ? <Redirect to="/hub" /> : <LandingPage />}
      </Route>
      <Route path="/login">{() => <LoginPage />}</Route>
      <Route path="/rules">{() => <RulesPage />}</Route>
      <Route path="/leaderboard-public"><PublicLeaderboardPage /></Route>

      {/* Public stats */}
      <Route path="/stats">
        <AppShell><StatsOverviewPage /></AppShell>
      </Route>
      <Route path="/stats/institutions">
        <AppShell><InstitutionStatsPage /></AppShell>
      </Route>

      {/* Authenticated pages with AppShell navigation */}
      <Route path="/hub">
        <ProtectedRoute><AppShell><HubPage /></AppShell></ProtectedRoute>
      </Route>
      <Route path="/competitions">
        <ProtectedRoute><AppShell><CompetitionsPage /></AppShell></ProtectedRoute>
      </Route>
      <Route path="/competitions/:slug">
        {(params) => (
          <ProtectedRoute><AppShell><CompetitionDetailPage slug={params.slug} /></AppShell></ProtectedRoute>
        )}
      </Route>
      <Route path="/results/:competitionId">
        {(params) => (
          <ProtectedRoute><AppShell><ResultsPage competitionId={params.competitionId} /></AppShell></ProtectedRoute>
        )}
      </Route>
      <Route path="/profile">
        <ProtectedRoute><AppShell><ProfilePage /></AppShell></ProtectedRoute>
      </Route>
      <Route path="/profile/edit">
        <ProtectedRoute><AppShell><ProfileEditPage /></AppShell></ProtectedRoute>
      </Route>
      <Route path="/profile/analytics">
        <ProtectedRoute><AppShell><AnalyticsPage /></AppShell></ProtectedRoute>
      </Route>
      <Route path="/profile/achievements">
        <ProtectedRoute><AppShell><AchievementsPage /></AppShell></ProtectedRoute>
      </Route>
      <Route path="/history">
        <ProtectedRoute><AppShell><MatchHistoryPage /></AppShell></ProtectedRoute>
      </Route>
      <Route path="/leaderboard">
        <ProtectedRoute><AppShell><LeaderboardPage /></AppShell></ProtectedRoute>
      </Route>
      <Route path="/notifications">
        <ProtectedRoute><AppShell><NotificationsPage /></AppShell></ProtectedRoute>
      </Route>
      <Route path="/user/:username">
        {(params) => (
          <AppShell><PublicProfilePage username={params.username} /></AppShell>
        )}
      </Route>

      {/* Trading arena — full screen, no AppShell */}
      <Route path="/arena/:competitionId">
        {(params) => (
          <ProtectedRoute><TradingPage competitionId={params.competitionId} /></ProtectedRoute>
        )}
      </Route>

      {/* Admin pages */}
      <Route path="/admin/competitions">
        <ProtectedRoute><AppShell><AdminCompetitionsPage /></AppShell></ProtectedRoute>
      </Route>
      <Route path="/admin/competitions/new">
        <ProtectedRoute><AppShell><AdminCompetitionFormPage /></AppShell></ProtectedRoute>
      </Route>
      <Route path="/admin/competitions/:id/edit">
        {(params) => (
          <ProtectedRoute><AppShell><AdminCompetitionFormPage competitionId={params.id} /></AppShell></ProtectedRoute>
        )}
      </Route>
      <Route path="/admin/registrations/:competitionId">
        {(params) => (
          <ProtectedRoute><AppShell><AdminRegistrationsPage competitionId={params.competitionId} /></AppShell></ProtectedRoute>
        )}
      </Route>
      <Route path="/admin/seasons">
        <ProtectedRoute><AppShell><AdminSeasonsPage /></AppShell></ProtectedRoute>
      </Route>

      {/* Fallback */}
      <Route>
        <Redirect to={isAuthenticated ? "/hub" : "/"} />
      </Route>
    </Switch>
  );
}

// ─── App ────────────────────────────────────────────────────
function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="dark">
        <TooltipProvider>
          <Toaster
            theme="dark"
            position="top-right"
            toastOptions={{
              style: {
                background: "#1C2030",
                border: "1px solid rgba(255,255,255,0.1)",
                color: "#D1D4DC",
              },
            }}
          />
          <Router>
            <AuthProvider>
              <AppRoutes />
            </AuthProvider>
          </Router>
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;

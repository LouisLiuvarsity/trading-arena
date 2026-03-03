import { useState, useCallback } from 'react';
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import LandingPage from "./pages/LandingPage";
import LoginPage from "./pages/LoginPage";
import RulesPage from "./pages/RulesPage";
import TradingPage from "./pages/TradingPage";
import { login, quickLogin } from "./lib/api";

type AppScreen = 'landing' | 'login' | 'rules' | 'trading';

function App() {
  // Always start on landing — no auto-restore to trading
  const [screen, setScreen] = useState<AppScreen>('landing');
  const [username, setUsername] = useState(() => localStorage.getItem("arena_username") ?? "");
  const [authToken, setAuthToken] = useState<string | null>(null);

  const handleEnterFromLanding = useCallback(() => {
    setScreen('login');
  }, []);

  const handleLogin = useCallback(async (inviteCode: string, name: string) => {
    const result = await login(inviteCode, name);
    setUsername(result.user.username);
    setAuthToken(result.token);
    localStorage.setItem("arena_username", result.user.username);
    localStorage.setItem("arena_token", result.token);
    localStorage.setItem("arena_invite_code", inviteCode);
    setScreen('trading');
  }, []);

  const handleQuickLogin = useCallback(async (name: string) => {
    const result = await quickLogin(name);
    setUsername(result.user.username);
    setAuthToken(result.token);
    localStorage.setItem("arena_username", result.user.username);
    localStorage.setItem("arena_token", result.token);
    setScreen('trading');
  }, []);

  const handleLogout = useCallback(() => {
    localStorage.removeItem("arena_token");
    setAuthToken(null);
    setScreen('landing');
  }, []);

  const handleEnterArena = useCallback(() => {
    setScreen('trading');
  }, []);

  const handleSkipRules = useCallback(() => {
    setScreen('trading');
  }, []);

  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="dark">
        <TooltipProvider>
          <Toaster theme="dark" position="top-right" toastOptions={{ style: { background: '#1C2030', border: '1px solid rgba(255,255,255,0.1)', color: '#D1D4DC' } }} />
          {screen === 'landing' && <LandingPage onEnterArena={handleEnterFromLanding} />}
          {screen === 'login' && <LoginPage onLogin={handleLogin} onQuickLogin={handleQuickLogin} />}
          {screen === 'rules' && (
            <RulesPage
              username={username}
              onEnterArena={handleEnterArena}
              onSkipRules={handleSkipRules}
            />
          )}
          {screen === 'trading' && <TradingPage authToken={authToken} onLogout={handleLogout} />}
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;

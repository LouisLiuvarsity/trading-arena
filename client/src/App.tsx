import { useState, useCallback } from 'react';
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import LandingPage from "./pages/LandingPage";
import LoginPage from "./pages/LoginPage";
import RulesPage from "./pages/RulesPage";
import TradingPage from "./pages/TradingPage";
import { login } from "./lib/api";

type AppScreen = 'landing' | 'login' | 'rules' | 'trading';

function App() {
  const [screen, setScreen] = useState<AppScreen>(() => {
    const token = localStorage.getItem("arena_token");
    return token ? "trading" : "landing";
  });
  const [username, setUsername] = useState(() => localStorage.getItem("arena_username") ?? "");
  const [authToken, setAuthToken] = useState<string | null>(() => localStorage.getItem("arena_token"));

  const handleEnterFromLanding = useCallback(() => {
    setScreen('login');
  }, []);

  const handleLogin = useCallback(async (inviteCode: string, name: string) => {
    const result = await login(inviteCode, name);
    setUsername(result.user.username);
    setAuthToken(result.token);
    localStorage.setItem("arena_username", result.user.username);
    localStorage.setItem("arena_token", result.token);
    setScreen('rules');
  }, []);

  const handleEnterArena = useCallback(() => {
    setScreen('trading');
  }, []);

  // Skip rules — go directly to trading (for returning users)
  const handleSkipRules = useCallback(() => {
    setScreen('trading');
  }, []);

  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="dark">
        <TooltipProvider>
          <Toaster theme="dark" position="top-right" toastOptions={{ style: { background: '#1C2030', border: '1px solid rgba(255,255,255,0.1)', color: '#D1D4DC' } }} />
          {screen === 'landing' && <LandingPage onEnterArena={handleEnterFromLanding} />}
          {screen === 'login' && <LoginPage onLogin={handleLogin} />}
          {screen === 'rules' && (
            <RulesPage
              username={username}
              onEnterArena={handleEnterArena}
              onSkipRules={handleSkipRules}
            />
          )}
          {screen === 'trading' && <TradingPage authToken={authToken} />}
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;

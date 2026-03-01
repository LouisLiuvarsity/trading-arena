import { useState, useCallback } from 'react';
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import LoginPage from "./pages/LoginPage";
import RulesPage from "./pages/RulesPage";
import TradingPage from "./pages/TradingPage";

type AppScreen = 'login' | 'rules' | 'trading';

function App() {
  const [screen, setScreen] = useState<AppScreen>('login');
  const [username, setUsername] = useState('');

  const handleLogin = useCallback((name: string) => {
    setUsername(name);
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
          {screen === 'login' && <LoginPage onLogin={handleLogin} />}
          {screen === 'rules' && (
            <RulesPage
              username={username}
              onEnterArena={handleEnterArena}
              onSkipRules={handleSkipRules}
            />
          )}
          {screen === 'trading' && <TradingPage />}
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;

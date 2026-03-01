import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import TradingPage from "./pages/TradingPage";

function Router() {
  return (
    <Switch>
      <Route path="/" component={TradingPage} />
      <Route component={TradingPage} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="dark">
        <TooltipProvider>
          <Toaster theme="dark" position="top-right" toastOptions={{ style: { background: '#1C2030', border: '1px solid rgba(255,255,255,0.1)', color: '#D1D4DC' } }} />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;

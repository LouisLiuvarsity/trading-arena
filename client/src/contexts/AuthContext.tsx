import { createContext, useContext, useState, useCallback, useMemo, type ReactNode } from "react";
import { useLocation } from "wouter";
import { login as apiLogin, quickLogin as apiQuickLogin } from "@/lib/api";

interface AuthState {
  token: string | null;
  username: string;
  isAuthenticated: boolean;
}

interface AuthContextType extends AuthState {
  login: (email: string, name: string, password: string) => Promise<void>;
  quickLogin: (name: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType>({
  token: null,
  username: "",
  isAuthenticated: false,
  login: async () => {},
  quickLogin: async () => {},
  logout: () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [, navigate] = useLocation();
  const [token, setToken] = useState<string | null>(
    () => localStorage.getItem("arena_token"),
  );
  const [username, setUsername] = useState(
    () => localStorage.getItem("arena_username") ?? "",
  );

  const login = useCallback(
    async (email: string, name: string, password: string) => {
      const result = await apiLogin(email, name, password);
      setUsername(result.user.username);
      setToken(result.token);
      localStorage.setItem("arena_username", result.user.username);
      localStorage.setItem("arena_token", result.token);
      navigate("/hub");
    },
    [navigate],
  );

  const quickLogin = useCallback(
    async (name: string, password: string) => {
      const result = await apiQuickLogin(name, password);
      setUsername(result.user.username);
      setToken(result.token);
      localStorage.setItem("arena_username", result.user.username);
      localStorage.setItem("arena_token", result.token);
      navigate("/hub");
    },
    [navigate],
  );

  const logout = useCallback(() => {
    localStorage.removeItem("arena_token");
    setToken(null);
    setUsername("");
    navigate("/");
  }, [navigate]);

  const value = useMemo(
    () => ({
      token,
      username,
      isAuthenticated: !!token,
      login,
      quickLogin,
      logout,
    }),
    [token, username, login, quickLogin, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}

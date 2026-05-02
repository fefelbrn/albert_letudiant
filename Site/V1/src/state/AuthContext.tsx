import { createContext, type ReactNode, useContext, useMemo, useState } from "react";

const AUTH_KEY = "v1_auth";

type AuthContextValue = {
  isAuthenticated: boolean;
  login: () => void;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(
    localStorage.getItem(AUTH_KEY) === "true",
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      isAuthenticated,
      login: () => {
        localStorage.setItem(AUTH_KEY, "true");
        setIsAuthenticated(true);
      },
      logout: () => {
        localStorage.removeItem(AUTH_KEY);
        setIsAuthenticated(false);
      },
    }),
    [isAuthenticated],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }
  return context;
}

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { api, getRefreshToken, logout as apiLogout } from "@/lib/api";

interface Me {
  id: string;
  username: string;
  display_name: string;
  onboarding_done: boolean;
}

interface AuthState {
  loading: boolean;
  me: Me | null;
  refresh: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthCtx = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [me, setMe] = useState<Me | null>(null);

  async function refresh() {
    const token = await getRefreshToken();
    if (!token) { setMe(null); setLoading(false); return; }
    try {
      const profile = await api<Me>("/profiles/me");
      setMe(profile);
    } catch {
      setMe(null);
    } finally {
      setLoading(false);
    }
  }

  async function signOut() {
    await apiLogout();
    setMe(null);
  }

  useEffect(() => { refresh(); }, []);

  return (
    <AuthCtx.Provider value={{ loading, me, refresh, signOut }}>
      {children}
    </AuthCtx.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthCtx);
  if (!ctx) throw new Error("useAuth fuera de AuthProvider");
  return ctx;
}

"use client";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import type { User } from "@bugrelay/contracts";
import { api, send } from "@/lib/api";
interface Session {
  user: User | null;
  loading: boolean;
  refresh: () => Promise<void>;
  logout: () => Promise<void>;
}
const Context = createContext<Session | null>(null);
export function SessionProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null),
    [loading, setLoading] = useState(true);
  const refresh = useCallback(async () => {
    try {
      const next = await api<User>("/auth/profile");
      setUser((current) =>
        JSON.stringify(current) === JSON.stringify(next) ? current : next,
      );
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    void refresh();
    const onFocus = () => {
      void refresh();
    };
    window.addEventListener("focus", onFocus);
    const timer = setInterval(onFocus, 60000);
    return () => {
      window.removeEventListener("focus", onFocus);
      clearInterval(timer);
    };
  }, [refresh]);
  const logout = async () => {
    await send("/auth/logout");
    setUser(null);
    window.location.assign("/login");
  };
  return (
    <Context.Provider value={{ user, loading, refresh, logout }}>
      {children}
    </Context.Provider>
  );
}
export function useSession() {
  const value = useContext(Context);
  if (!value) throw new Error("Session provider required");
  return value;
}
export function RequireAuth({
  children,
  admin = false,
}: {
  children: ReactNode;
  admin?: boolean;
}) {
  const { user, loading } = useSession();
  if (loading) return <p role="status">Checking your session…</p>;
  if (!user)
    return (
      <div className="notice">
        Please <a href="/login">sign in</a> to continue.
      </div>
    );
  if (admin && !user.isAdmin)
    return <div className="notice">Administrator access is required.</div>;
  return <>{children}</>;
}

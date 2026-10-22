import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export type MyProfile = {
  id: string;
  full_name: string;
  phone: string;
  location: string | null;
  email: string;
  created_at: string;
};

type AuthState = {
  user: User | null;
  profile: MyProfile | null;
  isAdmin: boolean;
  loading: boolean;
  refresh: () => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<MyProfile | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async (u: User | null) => {
    setUser(u);
    if (!u) {
      setProfile(null);
      setIsAdmin(false);
      setLoading(false);
      return;
    }
    const [{ data: p }, { data: roles }] = await Promise.all([
      supabase.rpc("get_my_profile"),
      supabase.from("user_roles").select("role").eq("user_id", u.id),
    ]);
    setProfile((p?.[0] as MyProfile) ?? null);
    setIsAdmin(!!roles?.some((r) => r.role === "admin"));
    setLoading(false);
  }, []);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" || event === "SIGNED_OUT" || event === "USER_UPDATED" || event === "INITIAL_SESSION") {
        // defer to avoid deadlocks inside the auth callback
        setTimeout(() => load(session?.user ?? null), 0);
      }
    });
    return () => sub.subscription.unsubscribe();
  }, [load]);

  const refresh = useCallback(async () => {
    const { data } = await supabase.auth.getUser();
    await load(data.user);
  }, [load]);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
  }, []);

  return (
    <AuthContext.Provider value={{ user, profile, isAdmin, loading, refresh, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}

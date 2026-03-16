import React, { createContext, useContext, useEffect, useState, useCallback, useRef, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User, Session } from "@supabase/supabase-js";

interface SubscriptionInfo {
  subscribed: boolean;
  product_id: string | null;
  price_id: string | null;
  subscription_end: string | null;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  subLoading: boolean;
  subscription: SubscriptionInfo;
  checkSubscription: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string, displayName?: string, whatsapp?: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const DEFAULT_SUB: SubscriptionInfo = { subscribed: false, product_id: null, price_id: null, subscription_end: null };

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [subscription, setSubscription] = useState<SubscriptionInfo>(DEFAULT_SUB);
  const [subLoading, setSubLoading] = useState(true);

  const hasCheckedOnce = useRef(false);

  const checkSubscription = useCallback(async (silent = false) => {
    try {
      if (!silent) setSubLoading(true);
      const { data, error } = await supabase.functions.invoke("check-subscription");
      if (error) {
        const msg = typeof error === "object" && error !== null && "message" in error ? (error as any).message : String(error);
        if (msg?.includes("does not exist") || msg?.includes("user_not_found")) {
          console.warn("[Auth] User no longer exists, signing out");
          await supabase.auth.signOut();
          return;
        }
        throw error;
      }
      if (data?.error && typeof data.error === "string" && data.error.includes("does not exist")) {
        console.warn("[Auth] User no longer exists, signing out");
        await supabase.auth.signOut();
        return;
      }
      if (data) setSubscription(data as SubscriptionInfo);
    } catch {
      setSubscription(DEFAULT_SUB);
    } finally {
      setSubLoading(false);
    }
  }, []);

  useEffect(() => {
    const { data: { subscription: authSub } } = supabase.auth.onAuthStateChange((event, session) => {
      // Skip token refresh events — they don't change user state
      if (event === "TOKEN_REFRESHED") return;

      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
      if (session?.user) {
        const silent = hasCheckedOnce.current;
        hasCheckedOnce.current = true;
        setTimeout(() => checkSubscription(silent), 0);
      } else {
        setSubscription(DEFAULT_SUB);
        setSubLoading(false);
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
      if (session?.user) {
        hasCheckedOnce.current = false;
        checkSubscription();
      } else {
        setSubLoading(false);
      }
    });

    return () => authSub.unsubscribe();
  }, [checkSubscription]);

  // Auto-refresh subscription every 60s
  useEffect(() => {
    if (!user) return;
    const interval = setInterval(() => checkSubscription(true), 60_000);
    return () => clearInterval(interval);
  }, [user, checkSubscription]);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error as Error | null };
  };

  const signUp = async (email: string, password: string, displayName?: string, whatsapp?: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: window.location.origin,
        data: { display_name: displayName, whatsapp: whatsapp || null },
      },
    });
    return { error: error as Error | null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, subLoading, subscription, checkSubscription, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

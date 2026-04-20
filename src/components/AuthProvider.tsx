"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabaseClient";
import { getUserProfile, UserProfile } from "@/lib/auth";
import { getCache, setCache } from "@/lib/native-utils";

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType>({ user: null, profile: null, loading: true });

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const initializedRef = React.useRef(false);

  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;

    let active = true;
    
    // V16.2.0: Safety timeout for loading state
    const safetyTimeout = setTimeout(() => {
      if (active && loading) {
        console.warn("[AuthV16] Safety timeout reached, forcing loading false");
        setLoading(false);
      }
    }, 10000);

    const updateAuth = async (session: any, source: string) => {
      if (!active) return;
      console.log(`[AuthV16] Updating from ${source}:`, session?.user?.id || "None");
      
      if (session?.user) {
        setUser(session.user);
        // Only fetch profile if user changed or profile is missing
        if (!profile || profile.id !== session.user.id) {
          const p = await getUserProfile(session.user.id, session.user.email);
          if (active) setProfile(p);
        }
      } else {
        setUser(null);
        setProfile(null);
      }
      setLoading(false);
    };

    const initAuth = async () => {
      try {
        console.log("[AuthV16] Initializing getSession...");
        const { data: { session } } = await supabase.auth.getSession();
        if (active) await updateAuth(session, "initAuth");
      } catch (e: any) {
        console.error("[AuthV16] Init error", e.message);
        if (active) setLoading(false);
      }
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log(`[AuthV16] Event received: ${event}`);
      if (!active) return;

      if (event === 'SIGNED_OUT') {
        setUser(null);
        setProfile(null);
        setLoading(false);
      } else if (session?.user || event === 'INITIAL_SESSION') {
        await updateAuth(session, `event:${event}`);
      }
    });

    initAuth();

    return () => {
      active = false;
      clearTimeout(safetyTimeout);
      subscription.unsubscribe();
    };
  }, [profile, loading]); // Added profile to deps to allow updateAuth to check it correctly

  return (
    <AuthContext.Provider value={{ user, profile, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);

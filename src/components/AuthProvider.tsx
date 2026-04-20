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
  
  // Use refs to avoid dependency loops in useEffect
  const initializedRef = React.useRef(false);
  const profileRef = React.useRef<UserProfile | null>(null);

  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;

    let active = true;
    
    // V16.3.0: Safety timeout for loading state
    const safetyTimeout = setTimeout(() => {
      if (active && loading) {
        console.warn("[AuthV16] Safety timeout triggered");
        setLoading(false);
      }
    }, 15000);

    const updateState = async (session: any, source: string) => {
      if (!active) return;
      console.log(`[AuthV16] State update from ${source}:`, session?.user?.id || "None");
      
      const currentUser = session?.user || null;
      setUser(currentUser);

      if (currentUser) {
        // Only fetch profile if user ID changed or profile is null
        if (!profileRef.current || profileRef.current.id !== currentUser.id) {
          try {
            const p = await getUserProfile(currentUser.id, currentUser.email);
            if (active) {
              profileRef.current = p;
              setProfile(p);
            }
          } catch (e) {
            console.error("[AuthV16] Profile fetch failed", e);
          }
        }
      } else {
        profileRef.current = null;
        setProfile(null);
      }
      
      if (active) setLoading(false);
    };

    // 1. Initial Session Load
    const initAuth = async () => {
      try {
        console.log("[AuthV16] Initial session check...");
        const { data: { session } } = await supabase.auth.getSession();
        await updateState(session, "init");
      } catch (e) {
        console.error("[AuthV16] Init error", e);
        if (active) setLoading(false);
      }
    };

    // 2. Auth State Listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log(`[AuthV16] Auth event: ${event}`);
      if (!active) return;

      if (event === 'SIGNED_OUT') {
        profileRef.current = null;
        setUser(null);
        setProfile(null);
        setLoading(false);
      } else if (session?.user || event === 'INITIAL_SESSION' || event === 'SIGNED_IN') {
        await updateState(session, `event:${event}`);
      }
    });

    initAuth();

    return () => {
      active = false;
      clearTimeout(safetyTimeout);
      subscription.unsubscribe();
    };
  }, []); // REMOVED DEPENDENCIES - Effect must only run ONCE on mount

  return (
    <AuthContext.Provider value={{ user, profile, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);

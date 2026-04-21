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
  const loadingRef = React.useRef(true);

  // Sync ref with state
  useEffect(() => {
    loadingRef.current = loading;
  }, [loading]);

  // Use refs to avoid dependency loops in useEffect
  const initializedRef = React.useRef(false);
  const profileRef = React.useRef<UserProfile | null>(null);

  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;

    let active = true;

    // V16.9.3: Safety timeout using Ref to avoid closure stale data
    const safetyTimeout = setTimeout(() => {
      if (active && loadingRef.current) {
        console.warn("[AuthV16.9.3] Safety timeout triggered - Force closing AppLoader");
        setLoading(false);
      }
    }, 8000); 

    const updateState = async (session: any, source: string) => {
      if (!active) return;
      console.log(`[AuthV16.9.3] State update from ${source}:`, session?.user?.id || "None");
      
      const currentUser = session?.user || null;
      
      // V16.9.3: Optimization - If user is same and profile exists, skip re-fetch
      if (currentUser && user?.id === currentUser.id && profileRef.current) {
        console.log("[AuthV16.9.3] Skipping redundant state update");
        if (active) {
            loadingRef.current = false;
            setLoading(false);
        }
        return;
      }

      // V16.9.3: STABILITY DELAY for Native platforms
      if (typeof window !== 'undefined' && (window as any).Capacitor?.getPlatform?.() !== 'web') {
        await new Promise(r => setTimeout(r, 600));
      }

      setUser(currentUser);

      if (currentUser) {
        try {
          console.log("[AuthV16.9.3] Fetching/Repairing profile for:", currentUser.email);
          const p = await getUserProfile(currentUser.id, currentUser.email);
          if (active) {
            profileRef.current = p;
            setProfile(p);
          }
        } catch (e) {
          console.error("[AuthV16.9.3] Profile fetch failed", e);
        }
      } else {
        profileRef.current = null;
        setProfile(null);
      }
      
      if (active) {
        console.log("[AuthV16.9.3] Loading finished");
        loadingRef.current = false;
        setLoading(false);
      }
    };

    // 1. Initial Session Load
    const initAuth = async () => {
      try {
        console.log("[AuthV16.9.3] Standard session check...");
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session) {
          await updateState(session, "init");
        } else {
          console.log("[AuthV16.9.3] No session found, setting loading false");
          loadingRef.current = false;
          setLoading(false);
        }
      } catch (e) {System.out.println("[AuthV16.9.3] Init error", e);
        if (active) {
            loadingRef.current = false;
            setLoading(false);
        }
      }
    };

    // 2. Auth State Listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log(`[AuthV16.9.3] Auth event: ${event}`);
      if (!active) return;

      if (event === 'SIGNED_OUT') {
        profileRef.current = null;
        setUser(null);
        setProfile(null);
        loadingRef.current = false;
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

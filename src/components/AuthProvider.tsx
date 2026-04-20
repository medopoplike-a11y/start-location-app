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
      console.log(`[AuthV16.4.0] State update from ${source}:`, session?.user?.id || "None");
      
      const currentUser = session?.user || null;
      
      // V16.4.0: Optimization - If user is same and profile exists, skip re-fetch
      if (currentUser && user?.id === currentUser.id && profileRef.current) {
        console.log("[AuthV16.4.0] Skipping redundant state update");
        if (active) setLoading(false);
        return;
      }

      setUser(currentUser);

      if (currentUser) {
        // Only fetch profile if user ID changed or profile is null
        if (!profileRef.current || profileRef.current.id !== currentUser.id) {
          try {
            console.log("[AuthV16.4.0] Fetching profile for:", currentUser.email);
            const p = await getUserProfile(currentUser.id, currentUser.email);
            if (active) {
              profileRef.current = p;
              setProfile(p);
            }
          } catch (e) {
            console.error("[AuthV16.4.0] Profile fetch failed", e);
          }
        }
      } else {
        profileRef.current = null;
        setProfile(null);
      }
      
      if (active) {
        console.log("[AuthV16.4.0] Loading finished");
        setLoading(false);
      }
    };

    // 1. Initial Session Load
    const initAuth = async () => {
      try {
        console.log("[AuthV16.5.0] Initial session check...");
        
        // V16.5.0: Race condition protection. Wait for any pending web-client initialization.
        await new Promise(r => setTimeout(r, 200));

        const { data: { session } } = await supabase.auth.getSession();
        
        if (session) {
          console.log("[AuthV16.5.0] Initial session found, updating state...");
          await updateState(session, "init");
        } else {
          console.log("[AuthV16.5.0] No initial session found.");
          // V16.5.0: Increased wait for native listeners to catch up
          setTimeout(() => {
            if (active && !profileRef.current) {
              console.log("[AuthV16.5.0] Still no session after wait, checking again...");
              supabase.auth.getSession().then(({ data: { session: secondTry } }) => {
                if (secondTry) {
                   updateState(secondTry, "init_second_try");
                } else {
                   setLoading(false);
                }
              });
            }
          }, 3000); // 3 seconds is safer for slow mobile storage
        }
      } catch (e) {
        console.error("[AuthV16.5.0] Init error", e);
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

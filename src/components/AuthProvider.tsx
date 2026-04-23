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
    let retryCount = 0;
    const maxRetries = 3;

    // V17.1.0: Extended safety timeout for slow networks
    const safetyTimeout = setTimeout(() => {
      if (active && loadingRef.current) {
        console.warn("[AuthV17.1.0] Safety timeout triggered - Releasing UI");
        setLoading(false);
      }
    }, 10000); 

    const updateState = async (session: any, source: string) => {
      if (!active) return;
      console.log(`[AuthV17.1.0] State update from ${source}:`, session?.user?.id || "None");
      
      const currentUser = session?.user || null;
      
      // Optimization: If user is same and profile exists, skip re-fetch
      if (currentUser && user?.id === currentUser.id && profileRef.current) {
        if (active) {
            loadingRef.current = false;
            setLoading(false);
        }
        return;
      }

      // V16.9.6: Minimal delay only for initial boot on native
      if (source === 'init' && typeof window !== 'undefined' && (window as any).Capacitor?.getPlatform?.() !== 'web') {
        await new Promise(r => setTimeout(r, 400));
      }

      // V16.9.6: Set user IMMEDIATELY to unblock routing
      if (active) {
        setUser(currentUser);
      }

      if (currentUser) {
        // V17.1.1: Aggressive Profile Recovery Loop
        retryCount = 0;
        let p = null;

        while (retryCount < maxRetries && !p && active) {
          try {
            p = await getUserProfile(currentUser.id, currentUser.email);
            if (p) break;
          } catch (e) {
            console.warn(`[AuthV17.1.1] Profile fetch attempt ${retryCount + 1} failed`, e);
          }
          retryCount++;
          if (!p && active) await new Promise(r => setTimeout(r, 1000 * retryCount)); // Exponential backoff
        }

        if (active) {
          profileRef.current = p;
          setProfile(p);
          
          // CRITICAL: If we still don't have a profile after retries, 
          // we MUST NOT set loading to false yet, unless the user object itself is gone.
          // This prevents the "Empty System" / "Reload Loop" race condition.
          if (!p && active) {
            // V17.3.0: Loop Breaker - Don't sign out on network error!
            // Only sign out if the user definitively doesn't exist or is invalid.
            console.error("[AuthV17.3.0] Profile recovery failed. Remaining in offline/idle mode to prevent reload loop.");
            setLoading(false); // Stop loading to show "Connection Error" in components instead of reloading
            return;
          }
        }
      } else {
        profileRef.current = null;
        setProfile(null);
      }
      
      // V17.1.1: Final release only if we have definitive state
      if (active) {
        // V17.2.7: Extra safety - if user exists but profile is still null, 
        // and it's not a fresh signout, wait a bit more for profile recovery.
        if (currentUser && !profileRef.current && retryCount < maxRetries) {
            console.log("[AuthV17.2.7] User exists but profile missing, delaying release...");
            return; 
        }
        loadingRef.current = false;
        setLoading(false);
      }
    };

    // V17.6.1: Industrial Stability
    const initAuth = async () => {
      try {
        console.log("[AuthV17.6.1] Standard session check...");
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session) {
          await updateState(session, "init");
        } else {
          console.log("[AuthV17.6.1] No session found, setting loading false");
          loadingRef.current = false;
          setLoading(false);
        }
      } catch (e) {
        console.error("[AuthV17.6.1] Init error", e);
        if (active) {
            loadingRef.current = false;
            setLoading(false);
        }
      }
    };

    // V17.6.1: Emergency Splash Timeout
    const splashTimeout = setTimeout(() => {
      if (loadingRef.current && active) {
        console.warn("[AuthV17.6.1] Splash timeout reached. Forcing loader release.");
        loadingRef.current = false;
        setLoading(false);
      }
    }, 10000);

    // 2. Auth State Listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log(`[AuthV17.6.1] Auth event: ${event}`);
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
      clearTimeout(splashTimeout);
      subscription.unsubscribe();
    };
  }, []);

  return (
    <AuthContext.Provider value={{ user, profile, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);

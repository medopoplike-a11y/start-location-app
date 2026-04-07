"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabaseClient";
import { getUserProfile, UserProfile } from "@/lib/auth";

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

  useEffect(() => {
    let active = true;
    let authSubscription: { unsubscribe: () => void } | null = null;

    const loadSession = async () => {
      try {
        const isNative = typeof window !== 'undefined' && (window as any).Capacitor?.isNativePlatform();
        console.log(`AuthProvider: loadSession started (Native: ${isNative})`);

        // Use a timeout for the initial session check to prevent blocking the whole app
        const sessionPromise = supabase.auth.getSession();
        const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error("Auth Timeout")), 5000));
        
        const result = await Promise.race([sessionPromise, timeoutPromise]) as any;
        let session = result?.data?.session;
        
        if (!active) return;

        if (session?.user) {
          console.log("AuthProvider: User session found:", session.user.id);
          setUser(session.user);
          // Don't await profile fetch, do it in background to unblock UI
          getUserProfile(session.user.id, session.user.email).then(userProfile => {
            if (active) setProfile(userProfile);
          });
        } else {
          console.log("AuthProvider: No user session found");
          setUser(null);
          setProfile(null);
        }
      } catch (error) {
        console.warn("AuthProvider: Initial session load skipped or timed out", error);
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    const setupAuthListener = () => {
      try {
        const { data } = supabase.auth.onAuthStateChange(async (event, session) => {
          console.log(`AuthProvider: onAuthStateChange event: ${event}`, session?.user?.id);
          if (!active) return;

          if (event === 'SIGNED_OUT') {
            setUser(null);
            setProfile(null);
            setLoading(false);
            // Force a clean state on sign out
            if (typeof window !== 'undefined') {
              localStorage.removeItem('start-location-v1-session');
            }
            return;
          }

          // If session and user are same as current, don't trigger state update
          if (session?.user?.id === user?.id && event === 'TOKEN_REFRESHED') {
            console.log("AuthProvider: Skipping redundant TOKEN_REFRESHED update");
            return;
          }

          setUser(session?.user ?? null);
          if (session?.user) {
            const userProfile = await getUserProfile(session.user.id, session.user.email);
            if (active) {
              setProfile(userProfile);
              setLoading(false);
            }
          } else {
            if (active) {
              setProfile(null);
              setLoading(false);
            }
          }
        });

        if (data && data.subscription) {
          authSubscription = data.subscription;
        }
      } catch (error) {
        console.error("AuthProvider: setupAuthListener error:", error);
      }
    };

    loadSession();
    setupAuthListener();

    return () => {
      active = false;
      authSubscription?.unsubscribe();
    };
  }, []);

  return (
    <AuthContext.Provider value={{ user, profile, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);

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
  
  // Use a ref to track current user ID to avoid stale closure loops
  const currentUserIdRef = React.useRef<string | null>(null);

  useEffect(() => {
    let active = true;
    let authSubscription: { unsubscribe: () => void } | null = null;

    const loadSession = async () => {
      try {
        const isNative = typeof window !== 'undefined' && (window as any).Capacitor?.isNativePlatform();
        console.log(`AuthProvider: loadSession started (Native: ${isNative})`);

        const sessionPromise = supabase.auth.getSession();
        const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error("Auth Timeout")), 5000));
        
        const result = await Promise.race([sessionPromise, timeoutPromise]) as any;
        let session = result?.data?.session;
        
        if (!active) return;

        if (session?.user) {
          console.log("AuthProvider: Initial session found:", session.user.id);
          currentUserIdRef.current = session.user.id;
          setUser(session.user);
          getUserProfile(session.user.id, session.user.email).then(userProfile => {
            if (active) setProfile(userProfile);
          });
        } else {
          console.log("AuthProvider: No initial session");
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
          const newUserId = session?.user?.id || null;
          console.log(`AuthProvider: onAuthStateChange event: ${event}`, newUserId);
          
          if (!active) return;

          if (event === 'SIGNED_OUT') {
            currentUserIdRef.current = null;
            setUser(null);
            setProfile(null);
            setLoading(false);
            if (typeof window !== 'undefined') {
              localStorage.removeItem('start-location-v1-session');
            }
            return;
          }

          // Use the ref to check if the user has actually changed
          // This prevents infinite loops on TOKEN_REFRESHED
          if (event === 'TOKEN_REFRESHED' && newUserId === currentUserIdRef.current) {
            console.log("AuthProvider: Skipping redundant TOKEN_REFRESHED update");
            return;
          }

          // Update tracking ref
          currentUserIdRef.current = newUserId;

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

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

        // First attempt
        let { data: { session } } = await supabase.auth.getSession();
        
        // If no session on native, try a small retry because storage can be slow
        if (!session && isNative && active) {
          console.log("AuthProvider: No session found on native, retrying in 500ms...");
          await new Promise(resolve => setTimeout(resolve, 500));
          const retry = await supabase.auth.getSession();
          session = retry.data.session;
        }
        
        if (!active) return;

        if (session?.user) {
          console.log("AuthProvider: User session found:", session.user.id);
          setUser(session.user);
          const userProfile = await getUserProfile(session.user.id, session.user.email);
          if (active) setProfile(userProfile);
        } else {
          console.log("AuthProvider: No user session found");
          setUser(null);
          setProfile(null);
        }
      } catch (error) {
        console.error("AuthProvider: loadSession error:", error);
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

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
        // Root-level debug log
        const isCapacitor = typeof window !== 'undefined' && (window as any).Capacitor?.isNativePlatform();
        console.log(`AuthProvider: Loading session (Native: ${isCapacitor})`);

        const { data: { session } } = await supabase.auth.getSession();
        
        if (!active) return;

        if (session?.user) {
          console.log("AuthProvider: Session found for", session.user.id);
          setUser(session.user);
          const userProfile = await getUserProfile(session.user.id, session.user.email);
          if (active) setProfile(userProfile);
        } else {
          console.log("AuthProvider: No session found initially");
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
          if (!active) return;

          console.log(`AuthProvider: Auth event [${event}] for user:`, session?.user?.id);
          
          setUser(session?.user ?? null);
          if (session?.user) {
            const userProfile = await getUserProfile(session.user.id, session.user.email);
            if (active) setProfile(userProfile);
          } else {
            setProfile(null);
          }
          
          // Force stop loading if an event occurs
          setLoading(false);
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

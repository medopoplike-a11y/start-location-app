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
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    const loadSession = async () => {
      try {
        // First attempt
        let { data: { session } } = await supabase.auth.getSession();
        
        // If no session, try one more time after a short delay (mobile storage can be slow)
        if (!session && active) {
          await new Promise(resolve => setTimeout(resolve, 500));
          const retry = await supabase.auth.getSession();
          session = retry.data.session;
        }

        if (!active) return;

        if (session?.user) {
          setUser(session.user);
          const userProfile = await getUserProfile(session.user.id, session.user.email);
          if (active) setProfile(userProfile);
        } else {
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
        const { data } = supabase.auth.onAuthStateChange(async (_event, session) => {
          if (!active) return;

          setUser(session?.user ?? null);
          if (session?.user) {
            // Only fetch profile if user has changed or profile is missing
            const userProfile = await getUserProfile(session.user.id, session.user.email);
            if (active) setProfile(userProfile);
          } else {
            setProfile(null);
          }
        });

        if (data && data.subscription) {
          authSubscription = data.subscription;
        }
      } catch (error) {
        console.error("AuthProvider: setupAuthListener error:", error);
      }
    };

    loadSession().then(() => {
      if (active) {
        setupAuthListener();
      }
    });

    return () => {
      active = false;
      if (timeoutId) clearTimeout(timeoutId);
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

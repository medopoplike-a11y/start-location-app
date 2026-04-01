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
      console.log("AuthProvider: loadSession starting...");
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        console.log("AuthProvider: getSession returned:", session ? "session exists" : "no session");
        if (!active) return;

        setUser(session?.user ?? null);
        if (session?.user) {
          console.log("AuthProvider: fetching profile for", session.user.id);
          const userProfile = await getUserProfile(session.user.id, session.user.email);
          console.log("AuthProvider: profile result:", userProfile ? "success" : "null");
          if (active) setProfile(userProfile);
        }
      } catch (error) {
        console.error("AuthProvider: loadSession error:", error);
      } finally {
        if (active) {
          console.log("AuthProvider: Setting loading to false");
          setLoading(false);
        }
      }
    };

    const setupAuthListener = () => {
      try {
        const { data } = supabase.auth.onAuthStateChange(async (_event, session) => {
          if (!active) return;

          console.log("AuthProvider: Auth state changed:", _event);
          setUser(session?.user ?? null);
          if (session?.user) {
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

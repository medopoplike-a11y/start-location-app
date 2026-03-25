"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { getUserProfile, UserProfile } from "@/lib/auth";
import { AppLoader } from "./AppLoader";

interface AuthContextType {
  user: any | null;
  profile: UserProfile | null;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType>({ user: null, profile: null, loading: true });

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<any | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    let mounted = true;

    const initAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session?.user) {
          const userProfile = await getUserProfile(session.user.id, session.user.email);
          if (mounted) {
            setUser(session.user);
            setProfile(userProfile);
          }
        }
      } catch (error) {
        console.error("AuthProvider: Init error", error);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    initAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log(`AuthProvider: Auth event ${event}`);
      
      if (session?.user) {
        const userProfile = await getUserProfile(session.user.id, session.user.email);
        if (mounted) {
          setUser(session.user);
          setProfile(userProfile);
          setLoading(false);
        }
      } else {
        if (mounted) {
          setUser(null);
          setProfile(null);
          setLoading(false);
        }
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  // Centralized Routing Logic - DISABLED AUTOMATIC REDIRECTS TO PREVENT LOOPS
  useEffect(() => {
    if (loading) return;

    // Check for "This page couldn't load" (Hydration Failures)
    if (typeof window !== 'undefined' && !localStorage.getItem('start_v4_reset')) {
      localStorage.clear();
      sessionStorage.clear();
      localStorage.setItem('start_v4_reset', 'true');
      window.location.reload();
      return;
    }
  }, [loading]);

  return (
    <AuthContext.Provider value={{ user, profile, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);

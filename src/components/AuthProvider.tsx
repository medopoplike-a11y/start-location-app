"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabaseClient";
import { getUserProfile, UserProfile } from "@/lib/auth";
import { AppLoader } from "./AppLoader";

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

  // Centralized Routing Logic
  useEffect(() => {
    if (loading) return;

    const role = profile?.role?.toLowerCase();
    const isLoginPage = pathname === "/login";
    const isRootPage = pathname === "/";

    // Debugging current state
    console.log("AuthProvider: State", { user: !!user, profile: !!profile, role, pathname });

    // 1. If not logged in and not on login page, go to login
    if (!user && !isLoginPage && !isRootPage) {
      console.log("AuthProvider: Redirecting to login (unauthenticated)");
      router.replace("/login");
      return;
    }

    // 2. If logged in and on login page, go to dashboard
    if (user && profile && isLoginPage) {
      console.log(`AuthProvider: Redirecting to /${role} (authenticated)`);
      router.replace(`/${role}`);
      return;
    }

    // 3. Handle Root Page specifically (Splash handles its own but this is backup)
    if (user && profile && isRootPage) {
      console.log(`AuthProvider: Root page, redirecting to /${role}`);
      router.replace(`/${role}`);
      return;
    }

    // Check for "This page couldn't load" (Hydration Failures) - Only if truly stuck
    if (typeof window !== 'undefined' && !localStorage.getItem('start_v4_reset')) {
      localStorage.setItem('start_v4_reset', 'true');
      // No clear() here to avoid infinite loops if it fails again
      // window.location.reload(); 
    }
  }, [loading, user, profile, pathname, router]);

  return (
    <AuthContext.Provider value={{ user, profile, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);

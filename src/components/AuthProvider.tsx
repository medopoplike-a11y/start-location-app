"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
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
  const [isInitializing, setIsInitializing] = useState(true);
  const [hasRedirected, setHasRedirected] = useState(false);
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
        if (mounted) {
          setLoading(false);
          setIsInitializing(false);
        }
      }
    };

    initAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log(`AuthProvider: Auth event ${event}`, { session: !!session, user: !!session?.user });

      if (session?.user) {
        console.log("AuthProvider: Fetching profile for user", session.user.id);
        const userProfile = await getUserProfile(session.user.id, session.user.email);
        console.log("AuthProvider: Profile fetched", { profile: !!userProfile, role: userProfile?.role });
        if (mounted) {
          setUser(session.user);
          setProfile(userProfile);
          setLoading(false);
          setIsInitializing(false);
          setHasRedirected(false);
        }
      } else {
        console.log("AuthProvider: No session, clearing user and profile");
        if (mounted) {
          setUser(null);
          setProfile(null);
          setLoading(false);
          setIsInitializing(false);
          setHasRedirected(false);
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
    if (isInitializing || loading || hasRedirected) {
      console.log("AuthProvider: Skipping routing", { isInitializing, loading, hasRedirected, user: !!user, profile: !!profile, role: profile?.role });
      return;
    }

    const role = profile?.role?.toLowerCase();
    const isLoginPage = pathname === "/login";
    const isRootPage = pathname === "/";

    // Debugging current state
    console.log("AuthProvider: Routing check", { user: !!user, profile: !!profile, role, pathname, isLoginPage, isRootPage });

    if (!user && !isLoginPage && !isRootPage) {
      console.log("AuthProvider: Redirecting to login (unauthenticated)");
      setHasRedirected(true);
      router.replace("/login");
      return;
    }

    if (user && role && (isLoginPage || isRootPage)) {
      console.log(`AuthProvider: Redirecting to /${role} (authenticated)`);
      setHasRedirected(true);
      router.replace(`/${role}`);
      return;
    }

    console.log("AuthProvider: No redirect needed");
  }, [isInitializing, loading, hasRedirected, user, profile, pathname, router]);

  return (
    <AuthContext.Provider value={{ user, profile, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);

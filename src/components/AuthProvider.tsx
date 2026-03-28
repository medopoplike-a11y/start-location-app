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
  const [pendingRedirect, setPendingRedirect] = useState<string | null>(null);
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
          setPendingRedirect(null);
        }
      } else {
        console.log("AuthProvider: No session, clearing user and profile");
        if (mounted) {
          setUser(null);
          setProfile(null);
          setLoading(false);
          setIsInitializing(false);
          setPendingRedirect(null);
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
    if (isInitializing || loading) {
      console.log("AuthProvider: Skipping routing (initializing/loading)", { isInitializing, loading });
      return;
    }

    const role = profile?.role?.toLowerCase();
    const isLoginPage = pathname === "/login";
    const isRootPage = pathname === "/";

    let targetPath: string | null = null;

    if (!user && !isLoginPage) {
      targetPath = "/login";
    } else if (user && role && (isLoginPage || isRootPage)) {
      targetPath = `/${role}`;
    }

    if (targetPath && pathname !== targetPath) {
      // Avoid repeated token reset loops
      if (pendingRedirect === targetPath) {
        console.log("AuthProvider: Already navigating to targetPath, skipping duplicate", targetPath);
        return;
      }

      console.log("AuthProvider: Redirecting", { from: pathname, to: targetPath });
      setPendingRedirect(targetPath);
      router.replace(targetPath);
      return;
    }

    if (!targetPath) {
      console.log("AuthProvider: No routing action required", { pathname, user: !!user, role });
    }
  }, [isInitializing, loading, pendingRedirect, user, profile, pathname, router]);

  return (
    <AuthContext.Provider value={{ user, profile, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);

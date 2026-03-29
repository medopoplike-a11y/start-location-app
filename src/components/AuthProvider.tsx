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

  const normalizePathname = (path: string) => {
    const clean = path.replace(/\/+$|^\s+|\s+$/g, '');
    return clean === '' ? '/' : clean;
  };

  useEffect(() => {
    let mounted = true;

    const initAuth = async () => {
      try {
        console.log("AuthProvider: Starting initAuth");
        const { data: { session } } = await supabase.auth.getSession();
        console.log("AuthProvider: Session check", { hasSession: !!session, userId: session?.user?.id });

        if (session?.user) {
          console.log("AuthProvider: Fetching profile for", session.user.id);
          const userProfile = await getUserProfile(session.user.id, session.user.email);
          console.log("AuthProvider: Profile result", { profile: !!userProfile, role: userProfile?.role });
          if (mounted) {
            setUser(session.user);
            setProfile(userProfile);
          }
        } else {
          console.log("AuthProvider: No session found");
        }
      } catch (error) {
        console.error("AuthProvider: Init error", error);
      } finally {
        console.log("AuthProvider: Setting loading to false");
        if (mounted) {
          setLoading(false);
          setIsInitializing(false);
        }
      }
    };

    initAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log(`AuthProvider: Auth event ${event}`, { session: !!session, userId: session?.user?.id, userEmail: session?.user?.email });

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

          const currentPathname = normalizePathname(typeof window !== 'undefined' ? window.location.pathname : pathname);
          const inferredRole = (session.user.user_metadata?.role as string | undefined)?.toLowerCase() || "driver";
          const role = (userProfile?.role || inferredRole)?.toLowerCase();
          const isLoginPage = currentPathname === "/login" || currentPathname.startsWith("/login");
          const isRootPage = currentPathname === "/";
          const targetPath = userProfile || inferredRole ? `/${role}` : null;

          console.log("AuthProvider: Auth event redirect check", { currentPathname, targetPath, isLoginPage, isRootPage });
          if (targetPath && (isLoginPage || isRootPage) && currentPathname !== targetPath) {
            console.log("AuthProvider: Redirecting after auth event", { from: currentPathname, to: targetPath });
            setPendingRedirect(targetPath);
            router.replace(targetPath);
          }
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

    const effectivePathname = normalizePathname(pathname);
    const inferredRole = (user?.user_metadata?.role as string | undefined)?.toLowerCase() || "driver";
    const role = (profile?.role || inferredRole)?.toLowerCase();
    const isLoginPage = effectivePathname === "/login" || effectivePathname.startsWith("/login");
    const isRootPage = effectivePathname === "/";

    console.log("AuthProvider: Routing check", { user: !!user, profile: !!profile, role, pathname: effectivePathname, isLoginPage, isRootPage, inferredRole });

    // If user exists but profile is still missing, provisional fallback to avoid stuck state.
    if (user && !profile) {
      console.log("AuthProvider: Applying fallback profile due to missing profile object", { userId: user.id, inferredRole });
      setProfile({
        id: user.id,
        email: user.email || "",
        full_name: (user.user_metadata?.full_name as string) || "مستخدم",
        role: inferredRole as UserProfile['role'],
        is_locked: false,
        created_at: new Date().toISOString(),
      });
      // continue flow after fallback assignment
      return;
    }

    let targetPath: string | null = null;

    if (!user && !isLoginPage) {
      targetPath = "/login";
    } else if (user && role && (isLoginPage || isRootPage)) {
      targetPath = `/${role}`;
    }

    console.log("AuthProvider: Target path calculated", { targetPath, currentPath: effectivePathname });

    if (targetPath && pathname !== targetPath) {
      if (pendingRedirect === targetPath) {
        console.log("AuthProvider: Already navigating to targetPath, skipping duplicate", targetPath);
        return;
      }

      console.log("AuthProvider: Redirecting", { from: pathname, to: targetPath });
      setPendingRedirect(targetPath);
      router.replace(targetPath);
      return;
    }

    console.log("AuthProvider: No routing action required", { pathname, user: !!user, role });
  }, [isInitializing, loading, pendingRedirect, user, profile, pathname, router]);

  return (
    <AuthContext.Provider value={{ user, profile, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);

"use client";

import { ReactNode, useEffect, useMemo } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { AppLoader } from "@/components/AppLoader";

interface AuthGuardProps {
  allowedRoles: string[];
  children: ReactNode;
}

const normalizeRole = (role?: string | null) => role?.toLowerCase() || "";

export default function AuthGuard({ allowedRoles, children }: AuthGuardProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, profile, loading } = useAuth();

  const userRole = useMemo(() => {
    if (profile?.role) return normalizeRole(profile.role);
    // If no profile yet, check user metadata as backup
    const metadataRole = user?.user_metadata?.role;
    if (metadataRole) return normalizeRole(metadataRole);
    return ""; // Don't default to driver yet, wait for profile
  }, [profile, user]);

  const authorized = useMemo(() => {
    if (!userRole) return false;
    return allowedRoles.map(normalizeRole).includes(userRole);
  }, [userRole, allowedRoles]);

  useEffect(() => {
    // Safety fallback: if auth loading is stuck, eventually try to proceed
    const safetyTimeout = setTimeout(() => {
      if (loading) {
        console.warn("AuthGuard: Auth state loading stuck, forcing redirect to login...");
        const isNative = typeof window !== 'undefined' && (window as any).Capacitor?.isNativePlatform?.();
        if (isNative) window.location.assign("/login");
        else window.location.assign("/login");
      }
    }, 8000); // Reduced from 15s to 8s for better UX
    return () => clearTimeout(safetyTimeout);
  }, [loading]);

  useEffect(() => {
    if (loading) {
      console.log("AuthGuard: Still loading auth state...");
      return;
    }

    const isNative = typeof window !== 'undefined' && (window as any).Capacitor?.isNativePlatform?.();
    console.log("AuthGuard: State Check", { user: !!user, userRole, authorized, pathname });

    if (!user) {
      console.log("AuthGuard: No user session, redirecting to login");
      // Use window.location as fallback for router issues
      const loginUrl = "/login/"; // Use trailing slash as per config
      if (isNative) window.location.assign(loginUrl);
      else if (router) router.replace(loginUrl);
      else window.location.assign(loginUrl);
    } else if (userRole && !authorized) {
      console.warn("AuthGuard: Access denied for role:", userRole, "allowed:", allowedRoles);
      const loginUrl = "/login/";
      if (isNative) window.location.assign(loginUrl);
      else if (router) router.replace(loginUrl);
      else window.location.assign(loginUrl);
    } else if (!userRole) {
      console.log("AuthGuard: User logged in but role not found yet, waiting...");
      const timeoutId = setTimeout(() => {
        if (!userRole) {
          console.error("AuthGuard: Role discovery timeout, forcing login");
          const loginUrl = "/login/";
          if (isNative) window.location.assign(loginUrl);
          else router.replace(loginUrl);
        }
      }, isNative ? 30000 : 15000);
      return () => clearTimeout(timeoutId);
    }
  }, [loading, user, userRole, authorized, router, allowedRoles, pathname]);

  // Prevent hardware/browser back button from navigating away from the app
  useEffect(() => {
    if (typeof window === "undefined") return;

    // Push a sentinel history entry so back presses consume it instead of leaving
    window.history.pushState({ guarded: true }, "", pathname);

    const handlePopState = (e: PopStateEvent) => {
      // Re-push the sentinel — keep the user on this page
      window.history.pushState({ guarded: true }, "", pathname);
    };

    window.addEventListener("popstate", handlePopState);

    // Capacitor hardware back button (via global plugin if available)
    let cleanupCapacitor: (() => void) | undefined;
    const cap = (window as any).Capacitor;
    if (cap?.isNativePlatform?.() && cap?.Plugins?.App) {
      try {
        const handle = cap.Plugins.App.addListener("backButton", () => {
          // Do nothing — only the logout button signs the user out
        });
        cleanupCapacitor = () => handle?.remove?.();
      } catch {
        // ignore
      }
    }

    return () => {
      window.removeEventListener("popstate", handlePopState);
      cleanupCapacitor?.();
    };
  }, [pathname]);

  if (loading || !user || !authorized) {
    return <AppLoader />;
  }

  return <>{children}</>;
}

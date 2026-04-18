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
        console.warn("AuthGuard: Auth state loading stuck, forcing check...");
        const isNative = typeof window !== 'undefined' && (window as any).Capacitor?.isNativePlatform?.();
        
        // V1.6.5: RADICAL FIX - If stuck, try to find ANY session in storage
        if (!user && !loading) {
          const hasLocalSession = typeof window !== 'undefined' && localStorage.getItem('start-location-v1-session');
          if (!hasLocalSession) {
            if (isNative) window.location.assign("/login");
            else router.replace("/login");
          }
        }
      }
    }, 15000); 
    return () => clearTimeout(safetyTimeout);
  }, [loading, user, router]);

  useEffect(() => {
    let timeoutId: NodeJS.Timeout | undefined;
    
    // Don't do anything while loading
    if (loading) return;

    const timer = setTimeout(() => {
      const isNative = typeof window !== 'undefined' && (window as any).Capacitor?.isNativePlatform?.();
      
      // V1.6.5: Normalized paths to avoid overlap
      const currentPath = pathname?.replace(/\/$/, "") || "";
      const isLoginPath = currentPath === "/login";

      if (!user) {
        console.log("AuthGuard: No user session");
        if (!isLoginPath) {
          const loginUrl = "/login";
          // V1.6.6: Use router.replace instead of window.location.href to avoid full app reloads
          router.replace(loginUrl);
        }
      } else if (userRole && !authorized) {
        console.warn("AuthGuard: Access denied for role:", userRole, "allowed:", allowedRoles);
        // V1.6.5: Redirect to correct dashboard instead of login to stop the loop
        const correctDashboard = userRole === 'admin' ? '/admin' : userRole === 'vendor' ? '/store' : '/driver';
        if (currentPath !== correctDashboard) {
          router.replace(correctDashboard);
        }
      }
    }, 100); 
    
    return () => {
      clearTimeout(timer);
      if (timeoutId) clearTimeout(timeoutId);
    };
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

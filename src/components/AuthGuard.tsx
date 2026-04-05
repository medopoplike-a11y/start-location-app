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
    return normalizeRole(user?.user_metadata?.role as string | undefined) || "driver";
  }, [profile, user]);

  const authorized = allowedRoles.map(normalizeRole).includes(userRole);

  useEffect(() => {
    if (loading) return;

    // If we have a user but not authorized, wait a moment to see if the profile/metadata syncs
    // This handles cases where profile is still being fetched by AuthProvider
    let timeoutId: ReturnType<typeof setTimeout> | undefined;

    const isNative = typeof window !== 'undefined' && (window as any).Capacitor?.isNativePlatform();

    if (!user) {
      // On native, give it a tiny bit more time to potentially recover a session
      // before bouncing back to login
      if (isNative) {
        timeoutId = setTimeout(() => {
          if (!user) router.replace("/login");
        }, 1000);
      } else {
        router.replace("/login");
      }
    } else if (!authorized) {
      // If user is present but not authorized, wait 2 seconds before redirecting on native
      // This gives AuthProvider time to fetch the profile if it was slow
      const waitTime = isNative ? 2500 : 1500;
      timeoutId = setTimeout(() => {
        if (!authorized) {
          console.warn("AuthGuard: Access denied for role:", userRole);
          router.replace("/login");
        }
      }, waitTime);
    }

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [loading, user, authorized, router, userRole]);

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

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

  // Use a ref to track if we've already initiated a redirect to prevent loops
  const isRedirecting = React.useRef(false);

  useEffect(() => {
    // If we're already redirecting or still loading, do nothing
    if (loading || isRedirecting.current) return;

    const isNative = typeof window !== 'undefined' && (window as any).Capacitor?.isNativePlatform();

    if (!user) {
      // On native, give it a tiny bit more time to potentially recover a session
      // before bouncing back to login
      if (isNative) {
        console.log("AuthGuard: No user on native, waiting for session recovery...");
        const timeoutId = setTimeout(() => {
          if (!user && !isRedirecting.current) {
            console.log("AuthGuard: Session recovery failed after 4s, redirecting to login");
            isRedirecting.current = true;
            router.replace("/login");
          }
        }, 4000);
        return () => clearTimeout(timeoutId);
      } else {
        isRedirecting.current = true;
        router.replace("/login");
      }
    } else if (!authorized) {
      // If user is present but not authorized, wait before redirecting on native
      // This gives AuthProvider time to fetch the profile if it was slow
      const waitTime = isNative ? 5000 : 1500;
      console.log(`AuthGuard: User [${user.id}] found but not authorized yet, waiting ${waitTime}ms...`);
      const timeoutId = setTimeout(() => {
        if (!authorized && !isRedirecting.current) {
          console.warn("AuthGuard: Access denied. Required one of:", allowedRoles, "User role:", userRole);
          isRedirecting.current = true;
          router.replace("/login");
        }
      }, waitTime);
      return () => clearTimeout(timeoutId);
    }
  }, [loading, user, authorized, router, userRole, allowedRoles]);

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

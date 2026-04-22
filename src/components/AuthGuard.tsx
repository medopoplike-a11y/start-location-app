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
    const metadataRole = user?.user_metadata?.role;
    if (metadataRole) return normalizeRole(metadataRole);
    return ""; 
  }, [profile, user]);

  const authorized = useMemo(() => {
    if (!userRole) return false;
    return allowedRoles.map(normalizeRole).includes(userRole);
  }, [userRole, allowedRoles]);

  useEffect(() => {
    if (loading) return;

    // V16.4.0: Infinite Reload Guard
    // Prevents the "Crazy Reload" loop between login and dashboard
    const checkReloadLoop = () => {
      try {
        const now = Date.now();
        const reloadData = JSON.parse(sessionStorage.getItem('auth_redirect_guard') || '{"count":0,"ts":0}');
        
        if (now - reloadData.ts > 10000) {
          // Reset if more than 10 seconds passed
          sessionStorage.setItem('auth_redirect_guard', JSON.stringify({ count: 1, ts: now }));
        } else if (reloadData.count > 5) {
          console.error("AuthGuard: Infinite redirect loop detected! Stopping.");
          return true; // Loop detected
        } else {
          sessionStorage.setItem('auth_redirect_guard', JSON.stringify({ count: reloadData.count + 1, ts: now }));
        }
      } catch (e) {}
      return false;
    };

    const timer = setTimeout(() => {
      const currentPath = pathname?.replace(/\/$/, "") || "";
      const isLoginPath = currentPath === "/login" || currentPath === "" || currentPath === "/";

      // V17.0.7: Single Shell - Skip redirects if we are at the root
      if (currentPath === "" || currentPath === "/") {
        console.log("AuthGuard: [V17.0.7] Single Shell active, skipping redirect");
        return;
      }

      // V16.6.0: Stable redirection using standard session state
      if (!user) {
        if (!isLoginPath) {
          if (checkReloadLoop()) return;
          console.log("AuthGuard: [V16.6.0] No session, redirecting to login");
          router.replace("/login");
        }
      } else if (userRole && !authorized) {
        const correctDashboard = userRole === 'admin' ? '/admin' : userRole === 'vendor' ? '/store' : '/driver';
        if (currentPath !== correctDashboard) {
          if (checkReloadLoop()) return;
          console.log(`AuthGuard: [V16.6.0] Role mismatch, redirecting to ${correctDashboard}`);
          router.replace(correctDashboard);
        }
      }
    }, 1000); // 1s is enough with the new stable architecture
    
    return () => clearTimeout(timer);
  }, [loading, user, userRole, authorized, router, pathname]);

  if (loading) {
    return <AppLoader />;
  }

  // V17.0.3: Persistent Shell - If we have a user, show children immediately.
  // Don't unmount the whole app just because we are checking the user.
  if (user && authorized) {
    return <>{children}</>;
  }

  // If not authorized but we have a user, it will be handled by the redirect timer.
  // We show AppLoader only as a fallback for unauthorized or signed-out states.
  if (!user && pathname !== "/login") {
    return <AppLoader />;
  }

  return <>{children}</>;
}

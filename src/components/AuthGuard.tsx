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
      const isLoginPath = currentPath === "/login" || currentPath === "";

      // V16.5.0: Hardened Redirection logic
      if (!user) {
        if (!isLoginPath) {
          if (checkReloadLoop()) return;
          console.log("AuthGuard: [NATIVE SAFETY] Redirecting to login - No user detected");
          router.replace("/login");
        }
      } else if (userRole && !authorized) {
        const correctDashboard = userRole === 'admin' ? '/admin' : userRole === 'vendor' ? '/store' : '/driver';
        if (currentPath !== correctDashboard) {
          if (checkReloadLoop()) return;
          console.log(`AuthGuard: [NATIVE SAFETY] Redirecting to ${correctDashboard} - Role mismatch`);
          router.replace(correctDashboard);
        }
      }
    }, 1500); // V16.5.0: Further increased delay to allow AuthProvider second try to complete
    
    return () => clearTimeout(timer);
  }, [loading, user, userRole, authorized, router, pathname]);

  if (loading || (!user && pathname !== "/login")) {
    return <AppLoader />;
  }

  if (user && authorized) {
    return <>{children}</>;
  }

  return <AppLoader />;
}

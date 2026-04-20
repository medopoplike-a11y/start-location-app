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

    const timer = setTimeout(() => {
      const currentPath = pathname?.replace(/\/$/, "") || "";
      const isLoginPath = currentPath === "/login";

      if (!user) {
        if (!isLoginPath) {
          router.replace("/login");
        }
      } else if (userRole && !authorized) {
        const correctDashboard = userRole === 'admin' ? '/admin' : userRole === 'vendor' ? '/store' : '/driver';
        if (currentPath !== correctDashboard) {
          router.replace(correctDashboard);
        }
      }
    }, 500); // Increased delay to allow AuthProvider to stabilize
    
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

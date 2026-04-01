"use client";

import { ReactNode, useEffect, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { AppLoader } from "@/components/AppLoader";

interface AuthGuardProps {
  allowedRoles: string[];
  children: ReactNode;
}

const normalizeRole = (role?: string | null) => {
  return role?.toLowerCase() || "";
};

export default function AuthGuard({ allowedRoles, children }: AuthGuardProps) {
  const router = useRouter();
  const { user, profile, loading } = useAuth();

  const userRole = useMemo(() => {
    if (profile?.role) return normalizeRole(profile.role);
    return normalizeRole(user?.user_metadata?.role as string | undefined) || "driver";
  }, [profile, user]);

  const authorized = allowedRoles.map(normalizeRole).includes(userRole);

  const redirectTimer = useRef<number | null>(null);

  useEffect(() => {
    if (loading) return;
    if (!user || !authorized) {
      router.replace("/login");
    }
  }, [loading, user, authorized, router]);

  if (loading || !user || !authorized) {
    return <AppLoader />;
  }

  return <>{children}</>;
}

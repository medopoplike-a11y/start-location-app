"use client";

import { useAuth } from "@/components/AuthProvider";
import { AppLoader } from "@/components/AppLoader";
import LoginPage from "./login/page";
import DriverApp from "./driver/page";
import StoreApp from "./store/page";
import AdminDashboard from "./admin/page";

/**
 * ─── MAIN SHELL (V17.0.7) ────────────────────────────────────────────────────
 * This is the Single Shell architecture. 
 * Instead of navigating between pages (which causes reloads in Capacitor),
 * we switch views based on the user's role and state.
 * ─────────────────────────────────────────────────────────────────────────────
 */

export default function MainShell() {
  const { user, profile, loading } = useAuth();

  // 1. Loading State
  if (loading) {
    return <AppLoader />;
  }

  // 2. Unauthenticated -> Show Login
  if (!user) {
    return <LoginPage />;
  }

  // 3. Authenticated -> Show Role-based View
  // V17.2.7: Ensure we have a profile before choosing the dashboard.
  // If user exists but profile is null, it means we are in the middle of a fetch.
  if (user && !profile) {
    return <AppLoader />;
  }

  const role = profile?.role || user?.user_metadata?.role || "driver";

  switch (role) {
    case 'admin':
      return <AdminDashboard />;
    case 'vendor':
      return <StoreApp />;
    case 'driver':
    default:
      return <DriverApp />;
  }
}

"use client";

import { useAuth } from "@/components/AuthProvider";
import { AppLoader } from "@/components/AppLoader";
import LoginPage from "./login/page";
import DriverApp from "./driver/page";
import StoreApp from "./store/page";
import AdminDashboard from "./admin/page";

/**
 * ─── UNIFIED SYSTEM SHELL (V17.7.2) ──────────────────────────────────────────
 * The single entry point for all roles. 
 * Provides a seamless, reload-free experience across Admin, Store, and Driver.
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
  // V17.8.7: Added safety timeout for profile recovery to prevent stuck loader on resume.
  const [profileTimeout, setProfileTimeout] = React.useState(false);
  React.useEffect(() => {
    if (user && !profile) {
      const timer = setTimeout(() => setProfileTimeout(true), 8000);
      return () => clearTimeout(timer);
    } else {
      setProfileTimeout(false);
    }
  }, [user, profile]);

  if (user && !profile && !profileTimeout) {
    return <AppLoader />;
  }

  // V17.8.7: Fallback to user metadata role if profile fetch failed or timed out
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

"use client";

import * as React from "react";
import AppUpdater from "@/components/AppUpdater";

// Simplified wrapper to ensure basic rendering and background hydration
export default function AppWrapper({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  // On native mobile, we want to render immediately to avoid being stuck on a splash/loading screen
  // Hydration issues usually stem from complex blocking logic during the first mount.
  
  if (!mounted) {
    return (
      <div style={{ backgroundColor: '#f3f4f6', minHeight: '100vh' }} />
    );
  }

  return (
    <>
      <AppUpdater />
      {children}
    </>
  );
}

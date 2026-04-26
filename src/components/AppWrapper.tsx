"use client";

import * as React from "react";
import { NativeBridge } from "./NativeBridge";
import { useDynamicTheme } from "@/hooks/useDynamicTheme";

export default function AppWrapper({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = React.useState(false);
  useDynamicTheme(); // V19.3.0: Enable auto-theme logic

  React.useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <>
      <NativeBridge />
      {children}
    </>
  );
}

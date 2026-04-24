"use client";

import * as React from "react";
import { NativeBridge } from "./NativeBridge";

export default function AppWrapper({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = React.useState(false);

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

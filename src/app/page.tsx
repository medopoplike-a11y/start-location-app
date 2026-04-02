"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function HomePage() {
  const router = useRouter();
  
  useEffect(() => {
    // Client-side redirect for static export (Capacitor)
    router.replace("/login");
  }, [router]);
  
  return null;
}

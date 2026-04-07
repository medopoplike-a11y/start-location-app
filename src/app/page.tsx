"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function HomeRedirect() {
  const router = useRouter();

  useEffect(() => {
    // Standard Next.js router replacement
    router.replace('/login');
  }, [router]);

  return null;
}


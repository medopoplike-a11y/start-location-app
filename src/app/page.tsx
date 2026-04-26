"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function HomeRedirect() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to login page as the entry point
    router.replace('/login');
  }, [router]);

  return null;
}


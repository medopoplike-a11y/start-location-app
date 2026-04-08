"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

export default function VendorRedirect() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to the new stable path
    console.log("Redirecting from legacy /vendor to /store/");
    router.replace("/store");
  }, [router]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-6 text-center">
      <Loader2 className="w-10 h-10 text-brand-orange animate-spin mb-4" />
      <h1 className="text-xl font-bold text-gray-900 mb-2">جاري الانتقال للواجهة الجديدة...</h1>
      <p className="text-gray-500">لقد قمنا بتحديث النظام لتحسين الاستقرار، سيتم تحويلك تلقائياً.</p>
    </div>
  );
}

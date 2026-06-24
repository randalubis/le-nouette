"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

// Storefront error boundary (H3). Catches render/data errors in the customer
// route group — most often a transient DB hiccup (the free-tier Supabase
// project auto-pauses after ~7 idle days and returns 500s). Keeps the warm
// Bahasa voice and offers a one-tap retry instead of a raw stack trace.
export default function StorefrontError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Storefront error boundary:", error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-6 text-center">
      <h1 className="font-serif text-3xl italic text-[var(--foreground)]">
        Aduh, ada gangguan sebentar
      </h1>
      <p className="mt-3 max-w-[34ch] text-sm leading-relaxed text-[var(--muted)]">
        Halaman ini lagi nggak bisa dimuat. Mungkin koneksi ke dapur kami sedang
        sibuk. Coba lagi sebentar, ya.
      </p>
      <Button onClick={reset} className="mt-6">
        Coba lagi
      </Button>
    </div>
  );
}

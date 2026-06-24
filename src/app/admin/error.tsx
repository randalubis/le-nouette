"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

// Admin error boundary (H3). The single operator benefits from a concrete
// hint: the most common cause of a back-office 500 is the free-tier Supabase
// project having auto-paused (it returns "tenant/user not found"). Surface
// that plus a retry rather than the default Next error screen.
export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Admin error boundary:", error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-6 text-center">
      <h1 className="font-serif text-2xl font-semibold italic text-[var(--primary)]">
        Something went wrong
      </h1>
      <p className="mt-2 max-w-md text-sm leading-relaxed text-[var(--muted)]">
        This page failed to load. It&apos;s usually a transient database issue —
        if it persists, check that the Supabase project isn&apos;t paused
        (free tier auto-pauses after ~7 idle days), then retry.
      </p>
      <Button onClick={reset} variant="outline" className="mt-6">
        Try again
      </Button>
    </div>
  );
}

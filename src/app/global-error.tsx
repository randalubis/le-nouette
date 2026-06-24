"use client";

import { useEffect } from "react";
import "./globals.css";

// Last-resort boundary (H3): catches errors thrown by the root layout itself.
// It replaces the layout, so it renders its own <html>/<body> and pulls in
// globals.css for the design tokens. Plain elements only (no app providers).
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Global error boundary:", error);
  }, [error]);

  return (
    <html lang="id">
      <body className="min-h-screen bg-[var(--background)] text-[var(--foreground)] antialiased">
        <div className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
          <h1 className="font-serif text-3xl italic">Aduh, ada gangguan</h1>
          <p className="mt-3 max-w-md text-sm leading-relaxed text-[var(--muted)]">
            Aplikasi gagal dimuat. Coba muat ulang halaman ini sebentar lagi.
          </p>
          <button
            type="button"
            onClick={reset}
            className="mt-6 inline-flex h-12 items-center justify-center rounded-[var(--radius-md)] bg-[var(--accent)] px-5 text-sm font-medium text-[var(--accent-ink)] transition-all hover:brightness-110 active:scale-[0.97]"
          >
            Coba lagi
          </button>
        </div>
      </body>
    </html>
  );
}

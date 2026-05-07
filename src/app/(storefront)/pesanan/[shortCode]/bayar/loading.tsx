import { Loader2 } from "lucide-react";

export default function Loading() {
  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-[0_1px_2px_rgba(58,38,16,0.04)]">
        <div className="flex items-center gap-3">
          <Loader2 className="h-5 w-5 animate-spin text-[var(--accent)]" />
          <p className="font-medium">Memuat halaman pembayaran…</p>
        </div>
        <p className="mt-2 text-sm text-[var(--muted)]">
          Sebentar ya, kami sedang menyiapkan detail pembayaran.
        </p>

        <div className="mt-6 space-y-4 animate-pulse">
          <div className="space-y-2">
            <div className="h-3 w-24 rounded-full bg-[var(--surface-warm-1)]" />
            <div className="h-8 w-40 rounded-full bg-[var(--surface-warm-1)]" />
          </div>
          <div className="aspect-square w-full max-w-xs rounded-xl bg-[var(--surface-warm-1)]" />
          <div className="space-y-2">
            <div className="h-3 w-full rounded-full bg-[var(--surface-warm-1)]" />
            <div className="h-3 w-5/6 rounded-full bg-[var(--surface-warm-1)]" />
            <div className="h-3 w-4/6 rounded-full bg-[var(--surface-warm-1)]" />
          </div>
        </div>
      </div>
    </div>
  );
}

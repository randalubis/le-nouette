import { Loader2 } from "lucide-react";

export default function Loading() {
  return (
    <div className="space-y-4 py-2">
      <div className="rounded-2xl border-[0.5px] border-[var(--border)] bg-[var(--surface)] p-6 text-center shadow-[0_1px_2px_rgba(58,38,16,0.04)]">
        <Loader2 className="mx-auto h-8 w-8 animate-spin text-[var(--accent)]" />
        <p className="mt-3 font-medium">Memuat ringkasan pesanan…</p>
        <p className="mt-1 text-sm text-[var(--muted)]">Sebentar ya.</p>
      </div>
    </div>
  );
}

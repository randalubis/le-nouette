"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import { toast } from "sonner";
import { removeOrderFromHistory } from "@/lib/cart";

export function CancelOrderButton({ shortCode }: { shortCode: string }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [pending, startTransition] = useTransition();

  function cancel() {
    startTransition(async () => {
      const res = await fetch(`/api/orders/${shortCode}/cancel`, { method: "POST" });
      const data = await res.json().catch(() => ({ ok: false, error: "Network error" }));
      if (!res.ok || !data.ok) {
        toast.error(data.error ?? "Gagal membatalkan pesanan.");
        setConfirming(false);
        return;
      }
      removeOrderFromHistory(shortCode);
      toast.success("Pesanan dibatalkan. Sampai ronde berikutnya.");
      setTimeout(() => router.replace("/"), 1000);
    });
  }

  if (!confirming) {
    return (
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className="inline-flex items-center justify-center gap-2 rounded-full border border-[var(--border)] bg-[var(--surface)] px-4 py-2.5 text-sm font-medium text-[var(--muted)] transition-colors hover:border-[var(--destructive)] hover:text-[var(--destructive)]"
      >
        <X className="h-4 w-4" />
        Batalkan pesanan
      </button>
    );
  }

  return (
    <div className="space-y-3 rounded-2xl border border-[var(--destructive)]/30 bg-[var(--destructive)]/5 p-4 text-sm">
      <p className="text-[var(--foreground)]">
        Pesanan akan dibatalkan dan stok dikembalikan. Yakin?
      </p>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={cancel}
          disabled={pending}
          className="flex-1 rounded-full bg-[var(--destructive)] px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
        >
          {pending ? "Membatalkan…" : "Ya, batalkan"}
        </button>
        <button
          type="button"
          onClick={() => setConfirming(false)}
          disabled={pending}
          className="flex-1 rounded-full border border-[var(--border)] bg-[var(--surface)] px-4 py-2 text-sm font-medium"
        >
          Batal
        </button>
      </div>
    </div>
  );
}

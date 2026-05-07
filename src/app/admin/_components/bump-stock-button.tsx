"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { toast } from "sonner";

export function BumpStockButton({ id, delta = 5 }: { id: string; delta?: number }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function bump() {
    startTransition(async () => {
      const res = await fetch(`/api/admin/round-products/${id}/bump-stock`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ delta }),
      });
      const data = await res.json().catch(() => ({ ok: false, error: "Network error" }));
      if (!res.ok || !data.ok) {
        toast.error(data.error ?? "Failed to bump stock");
        return;
      }
      toast.success(`Stok ${data.productName} ditambah ${delta}`);
      router.refresh();
    });
  }

  return (
    <button
      type="button"
      onClick={bump}
      disabled={pending}
      className="inline-flex items-center gap-1 rounded-md border border-[var(--badge-warning-fg)]/30 bg-[var(--surface)] px-2 py-0.5 text-xs font-medium text-[var(--badge-warning-fg)] hover:bg-[var(--badge-warning-bg)] disabled:opacity-60"
      title={`Add ${delta} more stock`}
    >
      <Plus className="h-3 w-3" />
      {delta} stok
    </button>
  );
}

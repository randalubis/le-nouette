"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useCart } from "@/components/cart-provider";

type ReorderResponse =
  | {
      ok: true;
      roundId: string;
      available: Array<{
        roundProductId: string;
        productId: string;
        name: string;
        price: number;
        imageUrl: string;
        quantity: number;
      }>;
      unavailable: Array<{ productId: string; name: string; reason: "missing" | "soldout" }>;
    }
  | { ok: false; error: string };

// L-03: one-tap reorder. Hits /api/orders/[shortCode]/reorder, fills the
// cart with whichever past items are still in the open round at current
// prices, toasts a list of items that didn't transfer over, and routes
// to /keranjang. Visible only when an OPEN round exists (parent gates).
export function ReorderButton({ shortCode }: { shortCode: string }) {
  const router = useRouter();
  const { add } = useCart();
  const [pending, startTransition] = useTransition();

  function reorder() {
    startTransition(async () => {
      const res = await fetch(`/api/orders/${shortCode}/reorder`);
      const data: ReorderResponse = await res
        .json()
        .catch(() => ({ ok: false, error: "Gagal memuat. Coba lagi." }));
      if (!data.ok) {
        toast.error(data.error);
        return;
      }
      if (data.available.length === 0) {
        toast.error(
          "Tidak ada produk dari pesanan lalu yang tersedia di ronde ini.",
        );
        return;
      }
      for (const it of data.available) {
        add(
          data.roundId,
          {
            roundProductId: it.roundProductId,
            productId: it.productId,
            name: it.name,
            price: it.price,
            imageUrl: it.imageUrl,
          },
          it.quantity,
        );
      }
      if (data.unavailable.length > 0) {
        const names = data.unavailable.map((u) => u.name).join(", ");
        toast(
          `${data.unavailable.length} produk dari pesanan lalu tidak tersedia: ${names}`,
        );
      } else {
        toast.success(
          `${data.available.length} produk ditambahkan ke keranjang.`,
        );
      }
      router.push("/keranjang");
    });
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      disabled={pending}
      onClick={reorder}
      title="Pesan lagi"
    >
      <RotateCcw className="h-3.5 w-3.5" />
      Pesan lagi
    </Button>
  );
}

"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Minus, Plus, ShoppingBag, Trash2 } from "lucide-react";
import { useCart } from "@/components/cart-provider";
import { Button } from "@/components/ui/button";
import { CheckoutStepper } from "@/app/(storefront)/_components/checkout-stepper";
import { formatIDR } from "@/lib/utils";

export default function CartPage() {
  const { cart, hydrated, setQuantity, remove, totalAmount } = useCart();

  if (!hydrated) {
    return (
      <p className="py-10 text-center text-sm text-[var(--muted)]">Memuat keranjang...</p>
    );
  }

  if (!cart || cart.items.length === 0) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[#f3ede1]">
          <ShoppingBag className="h-8 w-8 text-[var(--accent)]" />
        </div>
        <h1 className="font-serif text-2xl italic text-[var(--primary)]">
          Keranjang masih kosong
        </h1>
        <p className="mt-2 max-w-sm text-sm text-[var(--muted)]">Yuk pilih cemilan dulu.</p>
        <Button asChild className="mt-6">
          <Link href="/">Lihat menu</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-5 pb-32">
      <CheckoutStepper current={0} />
      <div className="space-y-1">
        <h1 className="font-serif text-2xl font-semibold text-[var(--primary)]">Keranjang</h1>
        <p className="text-sm text-[var(--muted)]">{cart.items.length} produk dipilih</p>
      </div>

      <div className="space-y-3">
        {cart.items.map((it) => (
          <article
            key={it.roundProductId}
            className="flex items-center gap-3 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-3 shadow-[0_1px_2px_rgba(58,38,16,0.04)]"
          >
            <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-[#f3ede1]">
              {/* alt="" — name is announced from the adjacent text (N-13). */}
              <Image src={it.imageUrl} alt="" fill className="object-cover" sizes="80px" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium">{it.name}</p>
              <p className="text-sm text-[var(--muted)]">{formatIDR(it.price)}</p>
              <div className="mt-2 flex items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--surface)] p-1 w-fit">
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => setQuantity(it.roundProductId, it.quantity - 1)}
                  aria-label="Kurangi"
                  className="h-7 w-7"
                >
                  <Minus className="h-3.5 w-3.5" />
                </Button>
                <span className="min-w-6 text-center text-sm font-semibold tabular-nums">
                  {it.quantity}
                </span>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => setQuantity(it.roundProductId, it.quantity + 1)}
                  aria-label="Tambah"
                  className="h-7 w-7"
                >
                  <Plus className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
            <div className="text-right">
              <p className="font-serif font-semibold text-[var(--primary)]">
                {formatIDR(it.price * it.quantity)}
              </p>
              <button
                type="button"
                onClick={() => remove(it.roundProductId)}
                className="mt-2 inline-flex items-center gap-1 text-xs text-[var(--muted)] hover:text-[var(--destructive)]"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Hapus
              </button>
            </div>
          </article>
        ))}
      </div>

      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-[var(--border)] bg-[var(--surface)]/95 p-3 shadow-[0_-8px_24px_-12px_rgba(58,38,16,0.18)] backdrop-blur-md">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-4 px-1">
          <div>
            <p className="text-xs uppercase tracking-wider text-[var(--muted)]">Total</p>
            <p className="font-serif text-xl font-semibold text-[var(--primary)]">
              {formatIDR(totalAmount)}
            </p>
          </div>
          <Link
            href="/pembayaran"
            className="inline-flex items-center gap-2 rounded-full bg-[var(--primary)] px-5 py-3 text-sm font-medium text-[var(--primary-foreground)] shadow-sm transition-colors hover:bg-[#1f1610]"
          >
            Lanjut ke pembayaran
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}

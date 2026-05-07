"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { useCart } from "@/components/cart-provider";
import { formatIDR } from "@/lib/utils";

export function CheckoutBar() {
  const { totalItems, totalAmount, hydrated } = useCart();
  if (!hydrated || totalItems === 0) return null;
  return (
    <div className="fixed inset-x-0 bottom-0 z-20 border-t border-[var(--border)] bg-[var(--surface)]/95 p-3 shadow-[0_-8px_24px_-12px_rgba(58,38,16,0.18)] backdrop-blur-md">
      <div className="mx-auto flex max-w-3xl items-center justify-between gap-4 px-1">
        <div>
          <p className="text-xs uppercase tracking-wider text-[var(--muted)]">
            {totalItems} item
          </p>
          <p className="font-serif text-xl font-semibold text-[var(--primary)]">
            {formatIDR(totalAmount)}
          </p>
        </div>
        <Link
          href="/keranjang"
          className="inline-flex items-center gap-2 rounded-full bg-[var(--primary)] px-5 py-3 text-sm font-medium text-[var(--primary-foreground)] shadow-sm transition-colors hover:bg-[var(--primary-hover)]"
        >
          Lihat keranjang
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </div>
  );
}

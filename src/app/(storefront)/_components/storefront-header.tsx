"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Receipt, ShoppingBag } from "lucide-react";
import { useCart } from "@/components/cart-provider";
import { readOrderHistory } from "@/lib/cart";

export function StorefrontHeader() {
  const { totalItems, hydrated: cartHydrated } = useCart();
  const [hasOrders, setHasOrders] = useState(false);
  const [historyHydrated, setHistoryHydrated] = useState(false);

  useEffect(() => {
    setHasOrders(readOrderHistory().length > 0);
    setHistoryHydrated(true);

    const onStorage = (e: StorageEvent) => {
      if (e.key === "le-nouette-orders-v1") {
        setHasOrders(readOrderHistory().length > 0);
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  return (
    <header className="sticky top-0 z-10 border-b border-[var(--border)] bg-[var(--background)]/85 backdrop-blur-md">
      <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3.5">
        <Link href="/" className="group flex items-baseline gap-1.5">
          <span className="font-serif text-2xl italic leading-none tracking-tight text-[var(--primary)]">
            Le Nouette
          </span>
          <span className="text-[10px] uppercase tracking-[0.2em] text-[var(--muted)]">
            bites
          </span>
        </Link>
        <div className="flex items-center gap-1">
          {historyHydrated && hasOrders && (
            <Link
              href="/pesanan"
              className="inline-flex h-10 w-10 items-center justify-center rounded-full text-[var(--foreground)] transition-colors hover:bg-[#ebe3d4]"
              aria-label="Pesanan saya"
              title="Pesanan saya"
            >
              <Receipt className="h-5 w-5" />
            </Link>
          )}
          <Link
            href="/keranjang"
            className="relative inline-flex h-10 w-10 items-center justify-center rounded-full text-[var(--foreground)] transition-colors hover:bg-[#ebe3d4]"
            aria-label="Keranjang"
          >
            <ShoppingBag className="h-5 w-5" />
            {cartHydrated && totalItems > 0 && (
              <span className="absolute -right-0.5 -top-0.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-[var(--accent)] px-1 text-[10px] font-semibold text-white">
                {totalItems}
              </span>
            )}
          </Link>
        </div>
      </div>
    </header>
  );
}

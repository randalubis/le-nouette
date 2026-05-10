"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Receipt, ShoppingBag } from "lucide-react";
import { useCart } from "@/components/cart-provider";

const TODAY_FMT = new Intl.DateTimeFormat("id-ID", {
  weekday: "long",
  day: "numeric",
  month: "long",
});

// DS v2 home hero — full-bleed photo with overlay eyebrow + wordmark +
// tagline + floating cart/history actions. Lives only on /, when an
// open round exists. Photo bleeds beyond the layout's px-4 via -mx-4.
export function HomeHero({
  imageUrl,
  tagline,
  todayIso,
}: {
  imageUrl: string | null;
  tagline: string;
  todayIso: string;
}) {
  const { totalItems, hydrated, orderHistory, addPulse } = useCart();
  const hasOrders = orderHistory.length > 0;

  const [popKey, setPopKey] = useState(0);
  const lastPulseRef = useRef(addPulse);
  useEffect(() => {
    if (addPulse !== lastPulseRef.current && addPulse > 0) {
      lastPulseRef.current = addPulse;
      setPopKey((k) => k + 1);
    }
  }, [addPulse]);

  const todayLabel = TODAY_FMT.format(new Date(todayIso));

  return (
    <section className="relative -mx-4 -mt-4 overflow-hidden bg-[var(--foreground)]">
      <div className="relative aspect-[4/5] w-full">
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt=""
            fill
            priority
            className="object-cover"
            sizes="(min-width: 768px) 768px, 100vw"
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-[var(--surface-warm-3)] via-[var(--surface-warm-1)] to-[var(--surface-warm-2)]" />
        )}
        {/* Dark gradient so overlay text reads against any photo. */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/55 via-black/15 to-black/65" />

        {/* Top row — date / status / cart */}
        <div className="absolute inset-x-0 top-0 flex items-start justify-between p-5 pt-[max(1.25rem,env(safe-area-inset-top))]">
          <div className="text-[var(--accent-ink)]">
            <p className="font-mono text-[10.5px] uppercase tracking-[0.16em] opacity-90">
              {todayLabel}
            </p>
            <p className="mt-1 inline-flex items-center gap-2 text-sm">
              <span
                aria-hidden="true"
                className="inline-block h-2 w-2 rounded-full bg-[var(--accent)]"
              />
              Buka untuk pre-order
            </p>
          </div>
          <div className="flex items-center gap-2">
            {hydrated && hasOrders && (
              <Link
                href="/riwayat"
                aria-label="Riwayat pesanan"
                className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-black/35 text-[var(--accent-ink)] backdrop-blur-md transition-colors hover:bg-black/50"
              >
                <Receipt className="h-5 w-5" />
              </Link>
            )}
            <Link
              href="/keranjang"
              aria-label="Keranjang"
              className="relative inline-flex h-11 w-11 items-center justify-center rounded-full bg-black/35 text-[var(--accent-ink)] backdrop-blur-md transition-colors hover:bg-black/50"
            >
              <span key={popKey} className={popKey > 0 ? "ln-anim-pop" : undefined}>
                <ShoppingBag className="h-5 w-5" />
              </span>
              {hydrated && totalItems > 0 && (
                <span className="absolute -right-1 -top-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-[var(--accent)] px-1 text-[10px] font-semibold text-[var(--accent-ink)]">
                  {totalItems}
                </span>
              )}
            </Link>
          </div>
        </div>

        {/* Bottom — eyebrow + wordmark + tagline */}
        <div className="absolute inset-x-0 bottom-0 px-5 pb-7 text-[var(--accent-ink)]">
          <p className="font-mono text-[10.5px] uppercase tracking-[0.16em] opacity-80">
            Cemilan kantor
          </p>
          <h1 className="mt-2 font-serif text-6xl italic leading-[0.9] tracking-tight">
            Le Nouette
          </h1>
          <p className="mt-3 max-w-[34ch] text-sm leading-snug opacity-90">{tagline}</p>
        </div>
      </div>
    </section>
  );
}

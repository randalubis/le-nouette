"use client";

import { useEffect, useState } from "react";

// DS v2 confirmation: terracotta squares falling for ~2.4s, fired once
// per order. Trigger key is set by /pembayaran on successful POST and
// matches the shortCode so refresh / direct visit doesn't re-fire.
const FLAG_PREFIX = "le-nouette-confetti-";

const PIECES = 14;

export function Confetti({ shortCode }: { shortCode: string }) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const key = `${FLAG_PREFIX}${shortCode}`;
    if (window.sessionStorage.getItem(key) !== "fire") return;
    window.sessionStorage.removeItem(key);
    setShow(true);
    const t = setTimeout(() => setShow(false), 2600);
    return () => clearTimeout(t);
  }, [shortCode]);

  if (!show) return null;
  return (
    <div
      aria-hidden="true"
      className="ln-confetti pointer-events-none absolute inset-x-0 top-0 z-20 h-0 overflow-visible"
    >
      {Array.from({ length: PIECES }).map((_, i) => {
        // Stagger pieces across width and time for a hand-tossed feel.
        const left = (i / (PIECES - 1)) * 100;
        const delay = (i % 5) * 80;
        const drift = (i % 2 === 0 ? 1 : -1) * (8 + (i % 4) * 4);
        return (
          <span
            key={i}
            style={{
              left: `${left}%`,
              animationDelay: `${delay}ms`,
              transform: `translateX(${drift}px)`,
            }}
          />
        );
      })}
    </div>
  );
}

export const CONFETTI_FLAG_PREFIX = FLAG_PREFIX;

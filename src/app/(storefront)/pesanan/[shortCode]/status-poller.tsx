"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

const POLL_MS = 30_000;
const TERMINAL: ReadonlySet<string> = new Set([
  "CONFIRMED",
  "DELIVERED",
  "CANCELLED",
  "HOLD_EXPIRED",
]);
const POLLABLE: ReadonlySet<string> = new Set([
  "PENDING_PAYMENT",
  "PENDING_CONFIRMATION",
  "PAID",
]);

// Polls /api/orders/[shortCode]/status every 30s while the order is in a
// pollable state (waiting on admin/customer action). Stops at terminal
// states. Triggers router.refresh() when the status changes so the SSR
// page re-renders with the new badge + helper copy. (Plan ticket X-13.)
export function OrderStatusPoller({
  shortCode,
  initialStatus,
}: {
  shortCode: string;
  initialStatus: string;
}) {
  const router = useRouter();
  const [status, setStatus] = useState(initialStatus);
  const lastAnnouncedRef = useRef(initialStatus);

  useEffect(() => {
    if (!POLLABLE.has(status)) return;
    let active = true;
    const tick = async () => {
      try {
        const res = await fetch(`/api/orders/${shortCode}/status`, {
          cache: "no-store",
        });
        if (!res.ok) return;
        const data = await res.json();
        if (!active || !data?.ok) return;
        const next: string = data.status;
        if (next !== lastAnnouncedRef.current) {
          lastAnnouncedRef.current = next;
          if (next === "PAID") toast.success("Pembayaran diterima");
          else if (next === "CONFIRMED") toast.success("Pesanan dikonfirmasi");
          else if (next === "CANCELLED") toast.error("Pesanan dibatalkan");
          else if (next === "HOLD_EXPIRED") toast.error("Pesanan otomatis dibatalkan");
          setStatus(next);
          router.refresh();
        }
      } catch {
        // Network blip — try again next interval.
      }
    };
    const id = setInterval(tick, POLL_MS);
    return () => {
      active = false;
      clearInterval(id);
    };
  }, [shortCode, status, router]);

  if (!POLLABLE.has(status)) return null;
  return (
    <p className="text-center text-[10px] uppercase tracking-wider text-[var(--muted)]">
      Diperiksa setiap 30 detik
    </p>
  );
}

"use client";

import { useEffect, useState } from "react";
import { Clock, Truck } from "lucide-react";

function formatRemaining(ms: number) {
  if (ms <= 0) return "ditutup";
  const totalMinutes = Math.floor(ms / 60_000);
  const days = Math.floor(totalMinutes / 1440);
  const hours = Math.floor((totalMinutes % 1440) / 60);
  const minutes = totalMinutes % 60;
  if (days > 0) return `${days}h ${hours}j`;
  if (hours > 0) return `${hours}j ${minutes}m`;
  return `${minutes}m`;
}

export function RoundBanner({
  title,
  closesAt,
  deliveryDate,
}: {
  title: string;
  closesAt: string;
  deliveryDate: string;
}) {
  const closesAtDate = new Date(closesAt);
  const deliveryDateObj = new Date(deliveryDate);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(id);
  }, []);

  const remaining = closesAtDate.getTime() - now;

  return (
    <div className="overflow-hidden rounded-2xl border-[0.5px] border-[var(--border)] bg-gradient-to-br from-[var(--surface-warm-2)] via-[var(--surface)] to-[var(--surface-warm-3)] p-5 shadow-[0_1px_2px_rgba(58,38,16,0.04),0_8px_24px_-12px_rgba(58,38,16,0.06)]">
      <p className="font-serif text-xl italic text-[var(--primary)]">{title}</p>
      <div className="mt-3 flex flex-wrap gap-x-6 gap-y-2 text-sm text-[var(--foreground)]">
        <span className="inline-flex items-center gap-1.5">
          <Clock className="h-4 w-4 text-[var(--accent)]" />
          Tutup dalam <span className="font-semibold">{formatRemaining(remaining)}</span>
        </span>
        <span className="inline-flex items-center gap-1.5">
          <Truck className="h-4 w-4 text-[var(--accent)]" />
          {deliveryDateObj.toLocaleDateString("id-ID", {
            weekday: "long",
            day: "numeric",
            month: "long",
          })}
        </span>
      </div>
    </div>
  );
}

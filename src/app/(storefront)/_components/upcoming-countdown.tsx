"use client";

import { useEffect, useState } from "react";

// Counts down the time until the next scheduled round opens. Lives only
// in the closed-round teaser — once opensAt passes, the storefront
// query starts returning the round itself and this component unmounts.
export function UpcomingCountdown({ opensAtIso }: { opensAtIso: string }) {
  const opensAt = new Date(opensAtIso);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(id);
  }, []);

  const ms = Math.max(0, opensAt.getTime() - now);
  if (ms <= 0) return null;

  const totalMinutes = Math.floor(ms / 60_000);
  const days = Math.floor(totalMinutes / 1440);
  const hours = Math.floor((totalMinutes % 1440) / 60);
  const minutes = totalMinutes % 60;

  // Pick the two most-useful units so the line stays scannable. For
  // multi-day waits we drop minutes; under 24h we drop days.
  let label: string;
  if (days >= 1) {
    label = `${days} hari ${hours} jam lagi`;
  } else if (hours >= 1) {
    label = `${hours} jam ${minutes} menit lagi`;
  } else {
    label = `${minutes} menit lagi`;
  }

  return (
    <p className="mt-2 text-sm text-[var(--muted)]">
      Tinggal <span className="font-medium text-[var(--foreground)]">{label}</span>
    </p>
  );
}

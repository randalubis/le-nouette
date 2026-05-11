"use client";

import { useEffect, useState } from "react";
import { Clock } from "lucide-react";

const ID_WEEKDAY_LONG = new Intl.DateTimeFormat("id-ID", {
  timeZone: "Asia/Jakarta",
  weekday: "long",
});
const ID_TIME = new Intl.DateTimeFormat("id-ID", {
  timeZone: "Asia/Jakarta",
  hour: "2-digit",
  minute: "2-digit",
});

function pad(n: number) {
  return String(Math.max(0, n)).padStart(2, "0");
}

// Mirror CountdownCard's visual rhythm so the closed-state hero feels
// like part of the same family — except this counts forward to opensAt
// instead of backward to closesAt, and the grid is days/hours/minutes
// (multi-day waits are common for "next round").
//
// The CTA scrolls to the notify-me form anchor below so customers can
// commit to a reminder in one tap.
const NOTIFY_ANCHOR = "notify-anchor";

export function UpcomingCountdownCard({
  title,
  opensAtIso,
  edition,
}: {
  title: string;
  opensAtIso: string;
  edition: number | null;
}) {
  const opensAt = new Date(opensAtIso);
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(id);
  }, []);

  const ms = Math.max(0, opensAt.getTime() - now);
  const totalMinutes = Math.floor(ms / 60_000);
  const days = Math.floor(totalMinutes / 1440);
  const hours = Math.floor((totalMinutes % 1440) / 60);
  const minutes = totalMinutes % 60;

  const opensWeekday = ID_WEEKDAY_LONG.format(opensAt);
  const opensTime = ID_TIME.format(opensAt).replace(":", ".");

  function scrollToNotify() {
    const el = document.getElementById(NOTIFY_ANCHOR);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <section className="rounded-[var(--radius-xl)] border-[0.5px] border-[var(--border)] bg-[var(--surface)] p-5">
      <div className="flex items-start justify-between gap-3">
        <p className="font-mono text-[10.5px] uppercase tracking-[0.16em] text-[var(--ink-mute)]">
          Hitung mundur buka
        </p>
        {edition !== null && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--badge-info-bg)] px-3 py-1 text-xs font-medium text-[var(--badge-info-fg)]">
            + Edisi {edition}
          </span>
        )}
      </div>
      <h2 className="mt-1 font-serif text-3xl italic leading-tight text-[var(--foreground)]">
        {title}
      </h2>

      <dl className="mt-5 grid grid-cols-3 gap-4 border-t-[0.5px] border-[var(--border)] pt-5">
        <div>
          <dd className="font-serif text-5xl leading-none italic text-[var(--foreground)]">
            {pad(days)}
          </dd>
          <dt className="mt-2 font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--ink-mute)]">
            Hari
          </dt>
        </div>
        <div>
          <dd className="font-serif text-5xl leading-none italic text-[var(--foreground)]">
            {pad(hours)}
          </dd>
          <dt className="mt-2 font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--ink-mute)]">
            Jam
          </dt>
        </div>
        <div>
          <dd className="font-serif text-5xl leading-none italic text-[var(--foreground)]">
            {pad(minutes)}
          </dd>
          <dt className="mt-2 font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--ink-mute)]">
            Menit
          </dt>
        </div>
      </dl>

      <p className="mt-5 inline-flex items-center gap-2 text-sm text-[var(--muted)]">
        <Clock className="h-4 w-4" />
        Buka {opensWeekday} pukul {opensTime} WIB
      </p>

      <button
        type="button"
        onClick={scrollToNotify}
        className="mt-5 flex h-[52px] w-full items-center justify-center gap-2 rounded-[var(--radius-md)] bg-[var(--accent)] text-[15px] font-medium tracking-[-0.01em] text-[var(--accent-ink)] transition-all hover:brightness-110 active:scale-[0.97] active:opacity-90"
      >
        Kabari aku saat buka
      </button>
    </section>
  );
}

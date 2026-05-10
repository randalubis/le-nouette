"use client";

import { useEffect, useState } from "react";
import { Clock } from "lucide-react";

const ID_DAY = new Intl.DateTimeFormat("id-ID", { day: "numeric" });
const ID_MONTH_SHORT = new Intl.DateTimeFormat("id-ID", { month: "short" });
const ID_WEEKDAY_LONG = new Intl.DateTimeFormat("id-ID", { weekday: "long" });

function pad(n: number) {
  return String(Math.max(0, n)).padStart(2, "0");
}

// Lihat-menu CTA scrolls down to the menu grid; the page anchors a
// <div id="menu-anchor" /> so this stays decoupled.
const MENU_ANCHOR = "menu-anchor";

export function CountdownCard({
  title,
  closesAtIso,
  edition,
}: {
  title: string;
  closesAtIso: string;
  edition: number | null;
}) {
  const closesAt = new Date(closesAtIso);
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(id);
  }, []);

  const ms = Math.max(0, closesAt.getTime() - now);
  const totalMinutes = Math.floor(ms / 60_000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  const closed = ms <= 0;

  const closeDay = ID_DAY.format(closesAt);
  const closeMonth = ID_MONTH_SHORT.format(closesAt).toUpperCase();
  const closeWeekday = ID_WEEKDAY_LONG.format(closesAt);
  const closeTime = closesAt
    .toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })
    .replace(":", ".");

  function scrollToMenu() {
    const el = document.getElementById(MENU_ANCHOR);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <section className="rounded-[var(--radius-xl)] border-[0.5px] border-[var(--border)] bg-[var(--surface)] p-5">
      <div className="flex items-start justify-between gap-3">
        <p className="font-mono text-[10.5px] uppercase tracking-[0.16em] text-[var(--ink-mute)]">
          Pre-order minggu ini
        </p>
        {edition !== null && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--accent)] px-3 py-1 text-xs font-medium text-[var(--accent-ink)]">
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
            {closed ? "0" : pad(hours)}
          </dd>
          <dt className="mt-2 font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--ink-mute)]">
            Jam
          </dt>
        </div>
        <div>
          <dd className="font-serif text-5xl leading-none italic text-[var(--foreground)]">
            {closed ? "0" : pad(minutes)}
          </dd>
          <dt className="mt-2 font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--ink-mute)]">
            Menit
          </dt>
        </div>
        <div>
          <dd className="font-serif text-5xl leading-none italic text-[var(--foreground)]">
            {closeDay}
          </dd>
          <dt className="mt-2 font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--ink-mute)]">
            {closeMonth}
          </dt>
        </div>
      </dl>

      <p className="mt-5 inline-flex items-center gap-2 text-sm text-[var(--muted)]">
        <Clock className="h-4 w-4" />
        Tutup pre-order {closeWeekday} pukul {closeTime}
      </p>

      <button
        type="button"
        onClick={scrollToMenu}
        className="mt-5 flex h-13 w-full items-center justify-center gap-2 rounded-[var(--radius-md)] bg-[var(--accent)] text-[15px] font-medium text-[var(--accent-ink)] tracking-[-0.01em] transition-all active:scale-[0.97] active:opacity-90 hover:brightness-110"
      >
        Lihat menu minggu ini →
      </button>
    </section>
  );
}

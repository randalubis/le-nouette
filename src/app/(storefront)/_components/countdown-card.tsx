"use client";

import { useEffect, useState } from "react";
import { Clock, Lock } from "lucide-react";

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
          {closed ? "Sampai jumpa lagi" : "Lagi buka untukmu"}
        </p>
        {edition !== null && (
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${
              closed
                ? "border-[0.5px] border-[var(--border-strong)] text-[var(--muted)]"
                : "bg-[var(--accent)] text-[var(--accent-ink)]"
            }`}
          >
            + Edisi {edition}
          </span>
        )}
      </div>
      <h2 className="mt-1 font-serif text-3xl italic leading-tight text-[var(--foreground)]">
        {title}
      </h2>

      {closed ? (
        // Closed state — soft, warm, "thanks for stopping by, see you
        // next round". Avoids the cold "0" numerals and any tone of
        // urgency or scarcity now that orders aren't accepted anyway.
        <div className="mt-5 rounded-[var(--radius-lg)] border-[0.5px] border-[var(--border-strong)] bg-[var(--surface-warm-1)] px-4 py-4">
          <div className="flex items-start gap-3">
            <Lock className="mt-0.5 h-5 w-5 shrink-0 text-[var(--muted)]" />
            <div>
              <p className="font-medium text-[var(--foreground)]">
                Pesanan untuk ronde ini sudah ditutup
              </p>
              <p className="mt-1 text-sm text-[var(--muted)]">
                Makasih sudah mampir, ya. Kami siapkan ronde berikutnya
                segera — kalau kamu mau dikabari saat buka lagi, tinggal
                daftar di WhatsApp.
              </p>
            </div>
          </div>
        </div>
      ) : (
        <>
          <dl className="mt-5 grid grid-cols-3 gap-4 border-t-[0.5px] border-[var(--border)] pt-5">
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
            Pesan tenang sampai {closeWeekday} pukul {closeTime}, ya
          </p>
        </>
      )}

      <button
        type="button"
        onClick={scrollToMenu}
        className={`mt-5 flex h-[52px] w-full items-center justify-center gap-2 rounded-[var(--radius-md)] text-[15px] font-medium tracking-[-0.01em] transition-all active:scale-[0.97] active:opacity-90 ${
          closed
            ? "border-[0.5px] border-[var(--border-strong)] bg-[var(--surface)] text-[var(--foreground)] hover:bg-[var(--surface-warm-1)]"
            : "bg-[var(--accent)] text-[var(--accent-ink)] hover:brightness-110"
        }`}
      >
        {closed ? "Intip menu ronde ini" : "Yuk lihat menu minggu ini →"}
      </button>
    </section>
  );
}

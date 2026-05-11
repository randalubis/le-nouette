"use client";

import { useEffect, useState, useTransition } from "react";
import { CheckCircle2, Clock } from "lucide-react";
import { track } from "@vercel/analytics";
import { Input } from "@/components/ui/input";

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

type NotifyState =
  | { kind: "cta" }
  | { kind: "form"; error?: string }
  | { kind: "done"; alreadySubscribed: boolean };

// Mirror CountdownCard's visual rhythm so the closed-state hero feels
// like part of the same family — except this counts forward to opensAt
// instead of backward to closesAt, and the grid is days/hours/minutes
// (multi-day waits are common for "next round").
//
// The CTA is the page's single notify-me entry point: clicking it
// reveals the phone input inline so customers can subscribe without
// leaving the card. Replaces a separate notify-form section that was
// duplicative on this view.
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

  const [state, setState] = useState<NotifyState>({ kind: "cta" });
  const [whatsapp, setWhatsapp] = useState("");
  const [pending, startTransition] = useTransition();

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setState({ kind: "form" });
    startTransition(async () => {
      const res = await fetch("/api/notify/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ whatsapp: whatsapp.trim() }),
      });
      const data = await res.json().catch(() => ({
        ok: false,
        error: "Koneksi internet kamu putus. Cek sinyal lalu coba lagi.",
      }));
      if (!res.ok || !data.ok) {
        setState({ kind: "form", error: data.error ?? "Gagal mendaftar." });
        return;
      }
      track("notify_subscribe");
      setState({ kind: "done", alreadySubscribed: Boolean(data.alreadySubscribed) });
    });
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

      {state.kind === "cta" && (
        <button
          type="button"
          onClick={() => setState({ kind: "form" })}
          className="mt-5 flex h-[52px] w-full items-center justify-center gap-2 rounded-[var(--radius-md)] bg-[var(--accent)] text-[15px] font-medium tracking-[-0.01em] text-[var(--accent-ink)] transition-all hover:brightness-110 active:scale-[0.97] active:opacity-90"
        >
          Kabari aku saat buka
        </button>
      )}

      {state.kind === "form" && (
        <form onSubmit={submit} className="mt-5 space-y-3">
          <p className="text-sm text-[var(--muted)]">
            Kasih nomor WhatsApp kamu, ya. Kami kabari sekali pas ronde ini buka.
          </p>
          <Input
            type="tel"
            inputMode="tel"
            value={whatsapp}
            onChange={(e) => setWhatsapp(e.target.value.replace(/[^\d+\s-]/g, ""))}
            placeholder="08123456789"
            aria-label="Nomor WhatsApp"
            required
            autoFocus
          />
          {state.error && (
            <p className="text-xs text-[var(--destructive)]">{state.error}</p>
          )}
          <button
            type="submit"
            disabled={pending}
            className="flex h-[52px] w-full items-center justify-center gap-2 rounded-[var(--radius-md)] bg-[var(--accent)] text-[15px] font-medium tracking-[-0.01em] text-[var(--accent-ink)] transition-all hover:brightness-110 active:scale-[0.97] active:opacity-90 disabled:opacity-60"
          >
            {pending ? "Mendaftar…" : "Beritahu saya"}
          </button>
        </form>
      )}

      {state.kind === "done" && (
        <div className="mt-5 rounded-[var(--radius-lg)] border border-[var(--success)]/30 bg-[var(--success)]/5 p-4 text-center">
          <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-[var(--success)]/15">
            <CheckCircle2 className="h-5 w-5 text-[var(--success)]" />
          </div>
          <p className="font-medium text-[var(--foreground)]">
            {state.alreadySubscribed ? "Kamu sudah terdaftar." : "Sip, kami catat ya."}
          </p>
          <p className="mt-1 text-xs text-[var(--muted)]">
            Kalau berubah pikiran, balas STOP saat kami WhatsApp kamu nanti.
          </p>
        </div>
      )}
    </section>
  );
}

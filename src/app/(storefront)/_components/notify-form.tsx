"use client";

import { useState, useTransition } from "react";
import { Bell, CheckCircle2 } from "lucide-react";
import { track } from "@vercel/analytics";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

type State =
  | { kind: "idle" }
  | { kind: "error"; message: string }
  | { kind: "done"; alreadySubscribed: boolean };

export function NotifyForm() {
  const [whatsapp, setWhatsapp] = useState("");
  const [state, setState] = useState<State>({ kind: "idle" });
  const [pending, startTransition] = useTransition();

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setState({ kind: "idle" });
    startTransition(async () => {
      const res = await fetch("/api/notify/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ whatsapp: whatsapp.trim() }),
      });
      const data = await res
        .json()
        .catch(() => ({ ok: false, error: "Koneksi internet kamu putus. Cek sinyal lalu coba lagi." }));
      if (!res.ok || !data.ok) {
        setState({ kind: "error", message: data.error ?? "Gagal mendaftar." });
        return;
      }
      track("notify_subscribe");
      setState({ kind: "done", alreadySubscribed: Boolean(data.alreadySubscribed) });
    });
  }

  if (state.kind === "done") {
    return (
      <div className="rounded-2xl border border-[var(--success)]/30 bg-[var(--success)]/5 p-5 text-center">
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
    );
  }

  return (
    <form onSubmit={submit} className="space-y-3 rounded-2xl border-[0.5px] border-[var(--border)] bg-[var(--surface)] p-5">
      <div className="flex items-center gap-2 text-[var(--foreground)]">
        <Bell className="h-4 w-4 text-[var(--accent)]" />
        <p className="font-medium">Beritahu saya kalau ronde berikutnya buka</p>
      </div>
      <p className="text-xs text-[var(--muted)]">
        Kami WhatsApp kamu sekali per ronde. Tidak ada promo iseng.
      </p>
      <Input
        type="tel"
        inputMode="tel"
        value={whatsapp}
        onChange={(e) => setWhatsapp(e.target.value.replace(/[^\d+\s-]/g, ""))}
        placeholder="08123456789"
        aria-label="Nomor WhatsApp"
        required
      />
      {state.kind === "error" && (
        <p className="text-xs text-[var(--destructive)]">{state.message}</p>
      )}
      <Button type="submit" disabled={pending} className="w-full">
        {pending ? "Mendaftar…" : "Beritahu saya"}
      </Button>
    </form>
  );
}

"use client";

import { useState, useTransition } from "react";
import { CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

const OPTIONS: Array<{ rating: 1 | 2 | 3; emoji: string; label: string }> = [
  { rating: 3, emoji: "😍", label: "Mantap" },
  { rating: 2, emoji: "🙂", label: "Lumayan" },
  { rating: 1, emoji: "😕", label: "Kurang" },
];

export function ReviewForm({
  shortCode,
  initialRating,
  initialComment,
}: {
  shortCode: string;
  initialRating: number | null;
  initialComment: string | null;
}) {
  const [rating, setRating] = useState<number | null>(initialRating);
  const [comment, setComment] = useState(initialComment ?? "");
  const [submitted, setSubmitted] = useState(initialRating !== null);
  const [pending, startTransition] = useTransition();

  function submit() {
    if (rating === null) {
      toast.error("Pilih satu emoji dulu.");
      return;
    }
    startTransition(async () => {
      const res = await fetch(`/api/orders/${shortCode}/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rating, comment: comment.trim() || null }),
      });
      const data = await res.json().catch(() => ({ ok: false, error: "Gagal submit." }));
      if (!res.ok || !data.ok) {
        toast.error(data.error ?? "Gagal submit.");
        return;
      }
      toast.success("Makasih ya, ulasanmu sudah masuk.");
      setSubmitted(true);
    });
  }

  if (submitted) {
    return (
      <div className="rounded-2xl border border-[var(--success)]/30 bg-[var(--success)]/5 p-5 text-center">
        <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-[var(--success)]/15">
          <CheckCircle2 className="h-5 w-5 text-[var(--success)]" />
        </div>
        <p className="font-medium">Ulasan terkirim. Sampai ronde berikutnya!</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5">
      <fieldset>
        <legend className="sr-only">Rating</legend>
        <div className="flex justify-center gap-3">
          {OPTIONS.map((opt) => (
            <label
              key={opt.rating}
              className="flex flex-1 cursor-pointer flex-col items-center gap-1 rounded-2xl border border-[var(--border)] p-3 has-[:checked]:border-[var(--primary)] has-[:checked]:bg-[var(--surface-warm-1)]/40"
            >
              <input
                type="radio"
                name="rating"
                value={opt.rating}
                checked={rating === opt.rating}
                onChange={() => setRating(opt.rating)}
                className="peer sr-only"
              />
              <span className="text-3xl" aria-hidden="true">
                {opt.emoji}
              </span>
              <span className="text-xs text-[var(--muted)]">{opt.label}</span>
            </label>
          ))}
        </div>
      </fieldset>
      <Textarea
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        rows={3}
        maxLength={500}
        placeholder="Cerita singkat (opsional) — apa yang kamu suka, apa yang bisa lebih?"
      />
      <Button onClick={submit} disabled={pending} className="w-full">
        {pending ? "Mengirim…" : "Kirim ulasan"}
      </Button>
    </div>
  );
}

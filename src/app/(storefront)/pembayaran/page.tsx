"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Pencil, Truck } from "lucide-react";
import { toast } from "sonner";
import { useCart } from "@/components/cart-provider";
import {
  clearCheckoutDraft,
  readCheckoutDraft,
  readCustomer,
  saveOrderToHistory,
  writeCheckoutDraft,
  writeCustomer,
} from "@/lib/cart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckoutStepper } from "@/app/(storefront)/_components/checkout-stepper";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { errorMessage } from "@/lib/errors";
import { formatIDR } from "@/lib/utils";

const ID_DAY_MONTH = new Intl.DateTimeFormat("id-ID", {
  weekday: "long",
  day: "numeric",
  month: "long",
});

type PaymentMethod = "QRIS" | "BANK_TRANSFER" | "COD";

function isPayNow(m: PaymentMethod) {
  return m === "QRIS" || m === "BANK_TRANSFER";
}

export default function CheckoutPage() {
  const router = useRouter();
  const { cart, hydrated, totalAmount, totalItems, clear } = useCart();
  const [name, setName] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [notes, setNotes] = useState("");
  const [method, setMethod] = useState<PaymentMethod>("QRIS");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [deliveryDate, setDeliveryDate] = useState<string | null>(null);
  // Skip draft writes until the initial restore has run, so we don't clobber
  // a stored draft with the empty initial state on first render.
  const draftReadyRef = useRef(false);

  useEffect(() => {
    const draft = readCheckoutDraft();
    if (draft) {
      setName(draft.name);
      setWhatsapp(draft.whatsapp);
      setNotes(draft.notes);
      setMethod(draft.paymentMethod);
    } else {
      const saved = readCustomer();
      if (saved) {
        setName(saved.name);
        setWhatsapp(saved.whatsapp);
      }
    }
    draftReadyRef.current = true;
  }, []);

  useEffect(() => {
    if (!draftReadyRef.current) return;
    writeCheckoutDraft({ name, whatsapp, notes, paymentMethod: method });
  }, [name, whatsapp, notes, method]);

  useEffect(() => {
    if (!cart?.roundId) return;
    let cancelled = false;
    fetch(`/api/rounds/${cart.roundId}/summary`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (cancelled || !data?.ok) return;
        setDeliveryDate(data.deliveryDate);
      })
      .catch(() => {
        // Banner is non-critical; silently skip if fetch fails.
      });
    return () => {
      cancelled = true;
    };
  }, [cart?.roundId]);

  useEffect(() => {
    if (submitted) return;
    if (hydrated && (!cart || cart.items.length === 0)) {
      router.replace("/keranjang");
    }
  }, [hydrated, cart, router, submitted]);

  if (submitted) {
    return (
      <p className="py-10 text-center text-sm text-[var(--muted)]">
        Memproses pesanan…
      </p>
    );
  }

  if (!hydrated || !cart || cart.items.length === 0) {
    return <p className="py-10 text-center text-sm text-[var(--muted)]">Memuat...</p>;
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!cart) return;
    setSubmitting(true);

    writeCustomer({ name: name.trim(), whatsapp: whatsapp.trim() });

    const res = await fetch("/api/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        roundId: cart.roundId,
        customerName: name.trim(),
        customerWhatsApp: whatsapp.trim(),
        paymentMethod: method,
        notes: notes.trim() || null,
        items: cart.items.map((it) => ({
          roundProductId: it.roundProductId,
          quantity: it.quantity,
        })),
      }),
    });

    const result = await res.json().catch(() => ({ ok: false, error: "Network error" }));

    if (!res.ok || !result.ok) {
      setSubmitting(false);
      toast.error(result.error ?? errorMessage("UNKNOWN"));
      return;
    }

    const shortCode: string = result.shortCode;
    setSubmitted(true);
    clearCheckoutDraft();
    saveOrderToHistory({
      shortCode,
      totalAmount: totalAmount,
      paymentMethod: method,
      itemCount: totalItems,
      roundTitle: result.roundTitle ?? "",
      createdAt: new Date().toISOString(),
    });
    toast.success(
      isPayNow(method)
        ? `Pesanan ${shortCode} dibuat. Lanjut ke pembayaran.`
        : `Pesanan ${shortCode} berhasil dibuat!`,
    );
    clear();
    if (isPayNow(method)) {
      router.replace(`/pesanan/${shortCode}/bayar`);
    } else {
      router.replace(`/pesanan/${shortCode}`);
    }
  }

  return (
    <div className="space-y-4 pb-32">
      <CheckoutStepper current={1} />
      <h1 className="text-xl font-semibold">Pembayaran</h1>

      {deliveryDate && (
        <div
          className="flex items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--foreground)]"
          role="note"
        >
          <Truck className="h-4 w-4 shrink-0 text-[var(--accent)]" aria-hidden="true" />
          <span>
            Pesanan ini akan diantar{" "}
            <span className="font-medium">
              {ID_DAY_MONTH.format(new Date(deliveryDate))}
            </span>
          </span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Data pemesan</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nama</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                maxLength={100}
                placeholder="Nama lengkap"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="whatsapp">Nomor WhatsApp</Label>
              <Input
                id="whatsapp"
                value={whatsapp}
                onChange={(e) => setWhatsapp(e.target.value.replace(/[^\d+]/g, ""))}
                required
                inputMode="tel"
                placeholder="+628123456789"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="notes">Catatan (opsional)</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                maxLength={500}
                placeholder="Permintaan khusus, dll."
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Metode pembayaran</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div
              className={`rounded-lg border p-3 transition-colors ${
                isPayNow(method)
                  ? "border-[var(--primary)] bg-[#f3ede1]/40"
                  : "border-[var(--border)]"
              }`}
            >
              <button
                type="button"
                onClick={() => setMethod("QRIS")}
                className="flex w-full items-start gap-3 text-left"
              >
                <span
                  className={`mt-1 h-4 w-4 shrink-0 rounded-full border-2 ${
                    isPayNow(method)
                      ? "border-[var(--primary)] bg-[var(--primary)]"
                      : "border-[var(--border)]"
                  }`}
                />
                <div>
                  <p className="font-medium">Bayar sekarang</p>
                  <p className="text-sm text-[var(--muted)]">
                    Bayar lalu upload bukti transfer.
                  </p>
                </div>
              </button>

              {isPayNow(method) && (
                <div className="mt-3 space-y-2 border-t border-[var(--border)] pt-3 pl-7">
                  <SubMethodOption
                    value="QRIS"
                    current={method}
                    onSelect={setMethod}
                    label="QRIS"
                    description="Scan kode QR dari aplikasi pembayaran kamu."
                  />
                  <SubMethodOption
                    value="BANK_TRANSFER"
                    current={method}
                    onSelect={setMethod}
                    label="Transfer Bank"
                    description="Transfer ke rekening yang akan ditampilkan."
                  />
                </div>
              )}
            </div>

            <PaymentOption
              value="COD"
              current={method}
              onSelect={setMethod}
              label="Bayar di Tempat"
              description="Bayar saat pesanan diantar."
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2">
            <CardTitle>Ringkasan</CardTitle>
            <Link
              href="/keranjang"
              className="inline-flex items-center gap-1 text-xs font-medium text-[var(--accent)] underline-offset-4 hover:underline"
            >
              <Pencil className="h-3.5 w-3.5" />
              Edit keranjang
            </Link>
          </CardHeader>
          <CardContent className="space-y-2">
            {cart.items.map((it) => (
              <div key={it.roundProductId} className="flex items-center gap-3">
                <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-md bg-zinc-100">
                  {/* alt="" — name is announced from the adjacent text (N-13). */}
                  <Image src={it.imageUrl} alt="" fill className="object-cover" sizes="40px" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{it.name}</p>
                  <p className="text-xs text-zinc-500">
                    {it.quantity} × {formatIDR(it.price)}
                  </p>
                </div>
                <p className="text-sm font-medium">{formatIDR(it.price * it.quantity)}</p>
              </div>
            ))}
            <div className="mt-2 flex items-center justify-between border-t pt-2 text-sm">
              <span className="text-zinc-500">{totalItems} item</span>
              <span className="text-lg font-semibold">{formatIDR(totalAmount)}</span>
            </div>
          </CardContent>
        </Card>

        <div className="fixed inset-x-0 bottom-0 z-20 border-t border-zinc-200 bg-white p-3 shadow-lg">
          <div className="mx-auto flex max-w-3xl items-center justify-between gap-4">
            <div>
              <p className="text-xs text-zinc-500">Total</p>
              <p className="text-lg font-semibold">{formatIDR(totalAmount)}</p>
            </div>
            <Button type="submit" disabled={submitting} size="lg">
              {submitting ? "Memproses..." : "Buat pesanan"}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}

function PaymentOption({
  value,
  current,
  onSelect,
  label,
  description,
}: {
  value: PaymentMethod;
  current: PaymentMethod;
  onSelect: (v: PaymentMethod) => void;
  label: string;
  description: string;
}) {
  const selected = current === value;
  return (
    <button
      type="button"
      onClick={() => onSelect(value)}
      className={`flex w-full items-start gap-3 rounded-lg border p-3 text-left transition-colors ${
        selected
          ? "border-[var(--primary)] bg-[#f3ede1]/40"
          : "border-[var(--border)] hover:border-[var(--primary)]/40"
      }`}
    >
      <span
        className={`mt-1 h-4 w-4 shrink-0 rounded-full border-2 ${
          selected ? "border-[var(--primary)] bg-[var(--primary)]" : "border-[var(--border)]"
        }`}
      />
      <div>
        <p className="font-medium">{label}</p>
        <p className="text-sm text-[var(--muted)]">{description}</p>
      </div>
    </button>
  );
}

function SubMethodOption({
  value,
  current,
  onSelect,
  label,
  description,
}: {
  value: PaymentMethod;
  current: PaymentMethod;
  onSelect: (v: PaymentMethod) => void;
  label: string;
  description: string;
}) {
  const selected = current === value;
  return (
    <button
      type="button"
      onClick={() => onSelect(value)}
      className="flex w-full items-start gap-3 rounded-md py-1.5 text-left"
    >
      <span
        className={`mt-1 h-3.5 w-3.5 shrink-0 rounded-full border-2 ${
          selected ? "border-[var(--primary)] bg-[var(--primary)]" : "border-[var(--border)]"
        }`}
      />
      <div>
        <p className="text-sm font-medium">{label}</p>
        <p className="text-xs text-[var(--muted)]">{description}</p>
      </div>
    </button>
  );
}

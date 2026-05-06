"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useCart } from "@/components/cart-provider";
import { readCustomer, writeCustomer } from "@/lib/cart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { formatIDR } from "@/lib/utils";

type PaymentMethod = "QRIS" | "COD";

export default function CheckoutPage() {
  const router = useRouter();
  const { cart, hydrated, totalAmount, totalItems, clear } = useCart();
  const [name, setName] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [notes, setNotes] = useState("");
  const [method, setMethod] = useState<PaymentMethod>("QRIS");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    const saved = readCustomer();
    if (saved) {
      setName(saved.name);
      setWhatsapp(saved.whatsapp);
    }
  }, []);

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
      toast.error(result.error ?? "Gagal membuat pesanan.");
      return;
    }

    const shortCode: string = result.shortCode;
    setSubmitted(true);
    toast.success(
      method === "QRIS"
        ? `Pesanan ${shortCode} dibuat. Lanjut ke pembayaran QRIS.`
        : `Pesanan ${shortCode} berhasil dibuat!`,
    );
    clear();
    if (method === "QRIS") {
      router.replace(`/order/${shortCode}/bayar`);
    } else {
      router.replace(`/order/${shortCode}`);
    }
  }

  return (
    <div className="space-y-4 pb-32">
      <h1 className="text-xl font-semibold">Pembayaran</h1>

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
          <CardContent className="space-y-2">
            <PaymentOption
              value="QRIS"
              current={method}
              onSelect={setMethod}
              label="QRIS"
              description="Bayar sekarang dan upload bukti transfer."
            />
            <PaymentOption
              value="COD"
              current={method}
              onSelect={setMethod}
              label="Cash on Delivery"
              description="Bayar saat pesanan diantar."
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Ringkasan</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {cart.items.map((it) => (
              <div key={it.roundProductId} className="flex items-center gap-3">
                <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-md bg-zinc-100">
                  <Image src={it.imageUrl} alt={it.name} fill className="object-cover" sizes="40px" />
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
      className={`flex w-full items-start gap-3 rounded-md border p-3 text-left transition-colors ${
        selected ? "border-zinc-900 bg-zinc-50" : "border-zinc-200 hover:border-zinc-300"
      }`}
    >
      <span
        className={`mt-1 h-4 w-4 shrink-0 rounded-full border-2 ${
          selected ? "border-zinc-900 bg-zinc-900" : "border-zinc-300"
        }`}
      />
      <div>
        <p className="font-medium">{label}</p>
        <p className="text-sm text-zinc-500">{description}</p>
      </div>
    </button>
  );
}

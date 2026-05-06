"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Receipt, Trash2 } from "lucide-react";
import { readOrderHistory, removeOrderFromHistory, type SavedOrder } from "@/lib/cart";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatIDR } from "@/lib/utils";

const paymentLabel: Record<SavedOrder["paymentMethod"], string> = {
  QRIS: "QRIS",
  BANK_TRANSFER: "Bank Transfer",
  COD: "Cash on Delivery",
};

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("id-ID", {
      day: "numeric",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

export default function MyOrdersPage() {
  const [orders, setOrders] = useState<SavedOrder[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setOrders(readOrderHistory());
    setHydrated(true);
  }, []);

  function handleRemove(shortCode: string) {
    removeOrderFromHistory(shortCode);
    setOrders((prev) => prev.filter((o) => o.shortCode !== shortCode));
  }

  if (!hydrated) {
    return (
      <p className="py-10 text-center text-sm text-[var(--muted)]">Memuat...</p>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[#f3ede1]">
          <Receipt className="h-8 w-8 text-[var(--accent)]" />
        </div>
        <h1 className="font-serif text-2xl italic text-[var(--primary)]">
          Belum ada pesanan
        </h1>
        <p className="mt-2 max-w-sm text-sm text-[var(--muted)]">
          Pesananmu akan otomatis muncul di sini setelah kamu checkout.
        </p>
        <Button asChild className="mt-6">
          <Link href="/">Lihat menu</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-5 pb-12">
      <div className="pt-2">
        <h1 className="font-serif text-2xl font-semibold text-[var(--primary)]">
          Pesanan saya
        </h1>
        <p className="text-sm text-[var(--muted)]">
          {orders.length} pesanan tersimpan di perangkat ini
        </p>
      </div>

      <div className="space-y-3">
        {orders.map((o) => (
          <Card key={o.shortCode}>
            <CardContent className="flex items-center gap-3 p-4">
              <Link
                href={`/order/${o.shortCode}`}
                className="flex min-w-0 flex-1 items-center gap-3 hover:opacity-80"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#f3ede1]">
                  <Receipt className="h-4 w-4 text-[var(--accent)]" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-mono text-sm font-semibold">{o.shortCode}</p>
                    <Badge variant="outline" className="text-[10px]">
                      {paymentLabel[o.paymentMethod]}
                    </Badge>
                  </div>
                  {o.roundTitle && (
                    <p className="mt-0.5 truncate text-xs text-[var(--muted)]">
                      {o.roundTitle}
                    </p>
                  )}
                  <p className="mt-0.5 text-xs text-[var(--muted)]">{formatDate(o.createdAt)}</p>
                </div>
                <div className="text-right">
                  <p className="font-serif font-semibold text-[var(--primary)]">
                    {formatIDR(o.totalAmount)}
                  </p>
                  <p className="text-xs text-[var(--muted)]">{o.itemCount} item</p>
                </div>
              </Link>
              <button
                type="button"
                onClick={() => handleRemove(o.shortCode)}
                className="text-[var(--muted)] hover:text-[var(--destructive)]"
                aria-label="Hapus dari riwayat"
                title="Hapus dari riwayat"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </CardContent>
          </Card>
        ))}
      </div>

      <p className="px-2 text-center text-xs text-[var(--muted)]">
        Pesanan disimpan di perangkat kamu. Pakai browser yang sama untuk melihatnya lagi.
      </p>
    </div>
  );
}

import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { CheckCircle2, MessageCircle } from "lucide-react";
import { prisma } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatIDR, formatWhatsAppLink } from "@/lib/utils";
import { buildWhatsAppMessage, paymentMethodLabel } from "@/lib/orders";
import { env } from "@/lib/env";
import { getBusinessSettings } from "@/lib/settings";
import { OrderHistoryRecorder } from "./history-recorder";

export const dynamic = "force-dynamic";

const statusLabel: Record<string, string> = {
  PENDING_PAYMENT: "Menunggu pembayaran",
  PAID: "Pembayaran diterima",
  CONFIRMED: "Pesanan dikonfirmasi",
  DELIVERED: "Sudah diantar",
  CANCELLED: "Dibatalkan",
};

const statusVariant: Record<
  string,
  "default" | "secondary" | "success" | "warning" | "destructive"
> = {
  PENDING_PAYMENT: "warning",
  PAID: "success",
  CONFIRMED: "default",
  DELIVERED: "success",
  CANCELLED: "destructive",
};

export default async function OrderConfirmationPage({
  params,
}: {
  params: Promise<{ shortCode: string }>;
}) {
  const { shortCode } = await params;
  const order = await prisma.order.findUnique({
    where: { shortCode },
    include: {
      round: { select: { title: true, deliveryDate: true } },
      items: { include: { roundProduct: { include: { product: true } } } },
      payment: true,
    },
  });
  if (!order) notFound();

  const itemsForMsg = order.items.map((it) => ({
    name: it.roundProduct.product.name,
    quantity: it.quantity,
  }));

  const orderUrl = `${env.siteUrl().replace(/\/$/, "")}/order/${order.shortCode}`;

  const waMessage = buildWhatsAppMessage({
    shortCode: order.shortCode,
    customerName: order.customerName,
    totalAmount: order.totalAmount,
    paymentMethod: order.paymentMethod,
    items: itemsForMsg,
    round: order.round,
    orderUrl,
  });

  const settings = await getBusinessSettings();
  const businessNumber = settings.whatsappNumber;
  const waLink = businessNumber ? formatWhatsAppLink(businessNumber, waMessage) : null;

  const totalItemCount = order.items.reduce((sum, it) => sum + it.quantity, 0);

  return (
    <div className="space-y-5 py-2">
      <OrderHistoryRecorder
        order={{
          shortCode: order.shortCode,
          totalAmount: order.totalAmount,
          paymentMethod: order.paymentMethod,
          itemCount: totalItemCount,
          roundTitle: order.round.title,
          createdAt: order.createdAt.toISOString(),
        }}
      />
      <div className="overflow-hidden rounded-2xl border border-[var(--border)] bg-gradient-to-br from-[#f0fae0] via-[var(--surface)] to-[#fef1de] p-6 text-center shadow-[0_1px_2px_rgba(58,38,16,0.04),0_8px_24px_-12px_rgba(58,38,16,0.06)]">
        <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-[var(--success)]/15">
          <CheckCircle2 className="h-8 w-8 text-[var(--success)]" />
        </div>
        <h1 className="font-serif text-2xl italic text-[var(--primary)]">Terima kasih!</h1>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Pesananmu sudah masuk ke dapur.
        </p>
        <p className="mt-4 inline-block rounded-full border border-[var(--border)] bg-[var(--surface)] px-3 py-1 font-mono text-sm font-medium text-[var(--primary)]">
          {order.shortCode}
        </p>
        <div className="mt-3">
          <Badge variant={statusVariant[order.status]}>{statusLabel[order.status]}</Badge>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Ringkasan pesanan</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            {order.items.map((it) => (
              <div key={it.id} className="flex items-center gap-3">
                <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-[#f3ede1]">
                  <Image
                    src={it.roundProduct.product.imageUrl}
                    alt={it.roundProduct.product.name}
                    fill
                    className="object-cover"
                    sizes="48px"
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{it.roundProduct.product.name}</p>
                  <p className="text-xs text-[var(--muted)]">
                    {it.quantity} × {formatIDR(it.unitPrice)}
                  </p>
                </div>
                <p className="text-sm font-medium tabular-nums">
                  {formatIDR(it.unitPrice * it.quantity)}
                </p>
              </div>
            ))}
          </div>

          <div className="space-y-2 border-t border-[var(--border)] pt-4 text-sm">
            <div className="flex justify-between">
              <span className="text-[var(--muted)]">Tanggal pemesanan</span>
              <span className="font-medium">
                {order.createdAt.toLocaleString("id-ID", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-[var(--muted)]">Pembayaran</span>
              <span className="font-medium">{paymentMethodLabel(order.paymentMethod)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[var(--muted)]">Pengantaran</span>
              <span className="font-medium">
                {order.round.deliveryDate.toLocaleDateString("id-ID", {
                  weekday: "long",
                  day: "numeric",
                  month: "long",
                })}
              </span>
            </div>
            <div className="flex justify-between border-t border-[var(--border)] pt-2 text-base">
              <span className="font-medium">Total</span>
              <span className="font-serif text-lg font-semibold text-[var(--primary)]">
                {formatIDR(order.totalAmount)}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {waLink && (
        <a
          href={waLink}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 rounded-full bg-[#25d366] px-6 py-3.5 text-sm font-semibold text-white shadow-sm transition-all hover:brightness-105 active:scale-[0.99]"
        >
          <MessageCircle className="h-5 w-5" />
          Kirim ke admin via WhatsApp
        </a>
      )}

      <Link
        href="/"
        className="block text-center text-sm text-[var(--muted)] underline-offset-4 hover:underline"
      >
        Kembali ke menu
      </Link>
    </div>
  );
}

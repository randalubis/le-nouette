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
import { CancelOrderButton } from "./cancel-button";
import { OrderStatusPoller } from "./status-poller";
import { Confetti } from "./confetti";
import { CheckoutStepper } from "@/app/(storefront)/_components/checkout-stepper";
import { faqFor } from "@/lib/faq";

const CANCEL_WINDOW_MS = 15 * 60 * 1000;

export const dynamic = "force-dynamic";

const statusLabel: Record<string, string> = {
  PENDING_PAYMENT: "Menunggu pembayaran",
  PENDING_CONFIRMATION: "Menunggu konfirmasi admin",
  PAID: "Pembayaran diterima",
  CONFIRMED: "Pesanan dikonfirmasi",
  DELIVERED: "Sudah diantar",
  CANCELLED: "Dibatalkan",
  HOLD_EXPIRED: "Otomatis dibatalkan",
};

const statusVariant: Record<
  string,
  "default" | "secondary" | "success" | "info" | "warning" | "destructive"
> = {
  PENDING_PAYMENT: "warning",
  PENDING_CONFIRMATION: "warning",
  PAID: "success",
  CONFIRMED: "info",
  DELIVERED: "success",
  CANCELLED: "destructive",
  HOLD_EXPIRED: "destructive",
};

const STATUS_HELPER: Partial<Record<string, string>> = {
  PENDING_CONFIRMATION:
    "Pesanan kamu lagi dicek admin. Konfirmasi via WhatsApp dalam beberapa jam.",
  HOLD_EXPIRED:
    "Pembayaran tidak diterima dalam 30 menit. Silakan pesan lagi atau hubungi admin via WhatsApp.",
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
      round: { select: { title: true, deliveryDate: true, status: true } },
      items: { include: { roundProduct: { include: { product: true } } } },
      payment: true,
    },
  });
  if (!order) notFound();

  const itemsForMsg = order.items.map((it) => ({
    name: it.roundProduct.product.name,
    quantity: it.quantity,
  }));

  const orderUrl = `${env.siteUrl().replace(/\/$/, "")}/pesanan/${order.shortCode}`;

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

  const canSelfCancel =
    order.status === "PENDING_PAYMENT" &&
    !order.payment?.proofImageUrl &&
    // eslint-disable-next-line react-hooks/purity -- Server Component renders once per request; Date.now() is the request clock.
    Date.now() - order.createdAt.getTime() < CANCEL_WINDOW_MS;

  // L-09: when the round closes for new orders but this customer's order
  // is still mid-flight, surface a reassuring banner so they don't think
  // their order was voided.
  const showInFlightRoundClosed =
    order.round.status === "CLOSED" &&
    (order.status === "PENDING_PAYMENT" ||
      order.status === "PENDING_CONFIRMATION" ||
      order.status === "PAID");

  // L-11: FAQ only on in-flight orders. Cancelled/delivered/hold-expired
  // orders don't need expectation-setting.
  const showFaq =
    order.status === "PENDING_PAYMENT" ||
    order.status === "PENDING_CONFIRMATION" ||
    order.status === "PAID" ||
    order.status === "CONFIRMED";
  const faqOverrides = (settings.faqAnswers as Parameters<typeof faqFor>[1]) ?? null;
  const faq = showFaq ? faqFor(order.paymentMethod, faqOverrides) : [];

  return (
    <div className="space-y-5 py-2">
      <CheckoutStepper current={2} />

      {showInFlightRoundClosed && (
        <div
          className="rounded-xl border-[0.5px] border-[var(--border)] bg-[var(--surface-cool-1)] px-3 py-2 text-sm text-[var(--foreground)]"
          role="note"
        >
          Ronde ini sudah ditutup untuk pesanan baru, tapi pesananmu masih
          diproses normal.
        </div>
      )}

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
      <div className="relative overflow-hidden rounded-2xl border-[0.5px] border-[var(--border)] bg-gradient-to-br from-[var(--surface-success-light)] via-[var(--surface)] to-[var(--surface-warm-3)] p-6 text-center shadow-[0_1px_2px_rgba(58,38,16,0.04),0_8px_24px_-12px_rgba(58,38,16,0.06)]">
        <Confetti shortCode={order.shortCode} />
        <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-[var(--success)]/15">
          <CheckCircle2 className="h-8 w-8 text-[var(--success)]" />
        </div>
        <h1 className="font-serif text-2xl italic text-[var(--primary)]">Terima kasih!</h1>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Pesananmu sudah masuk ke dapur.
        </p>
        <p className="mt-4 inline-block rounded-full border-[0.5px] border-[var(--border)] bg-[var(--surface)] px-3 py-1 font-mono text-sm font-medium text-[var(--primary)]">
          {order.shortCode}
        </p>
        <div className="mt-3">
          <Badge variant={statusVariant[order.status]}>{statusLabel[order.status]}</Badge>
        </div>
        {STATUS_HELPER[order.status] && (
          <p className="mt-3 text-xs text-[var(--muted)]">{STATUS_HELPER[order.status]}</p>
        )}
        <div className="mt-3">
          <OrderStatusPoller shortCode={order.shortCode} initialStatus={order.status} />
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
                <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-[var(--surface-warm-1)]">
                  {/* alt="" — name is announced from the adjacent text (N-13). */}
                  <Image
                    src={it.roundProduct.product.imageUrl}
                    alt=""
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
          // White on #25d366 is only ~2:1 (fails AA Large). Dark green
          // text on the same green clears ~9.7:1.
          className="flex items-center justify-center gap-2 rounded-full bg-[var(--whatsapp-green)] px-6 py-3.5 text-sm font-semibold text-[var(--whatsapp-fg)] shadow-sm transition-all hover:brightness-105 active:scale-[0.99]"
        >
          <MessageCircle className="h-5 w-5" />
          Kirim ke admin via WhatsApp
        </a>
      )}

      {canSelfCancel && <CancelOrderButton shortCode={order.shortCode} />}

      {faq.length > 0 && (
        <section className="space-y-2 rounded-2xl border-[0.5px] border-[var(--border)] bg-[var(--surface)] p-4">
          <h2 className="text-sm font-medium text-[var(--foreground)]">
            Pertanyaan umum
          </h2>
          <div className="space-y-1">
            {faq.map((qa) => (
              <details
                key={qa.question}
                className="group border-t border-[var(--border)] py-2 first:border-t-0"
              >
                <summary className="cursor-pointer list-none text-sm font-medium text-[var(--foreground)]">
                  {qa.question}
                  <span className="float-right text-[var(--muted)] transition-transform group-open:rotate-90">
                    ›
                  </span>
                </summary>
                <p className="mt-2 text-sm text-[var(--muted)]">{qa.answer}</p>
              </details>
            ))}
          </div>
        </section>
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

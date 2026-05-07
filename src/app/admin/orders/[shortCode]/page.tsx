import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { ArrowLeft, MessageCircle, Star } from "lucide-react";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { env } from "@/lib/env";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatIDR, formatWhatsAppLink } from "@/lib/utils";
import { OrderStatusActions } from "./status-actions";
import { AdminNotesForm } from "./admin-notes-form";

export const dynamic = "force-dynamic";

const statusVariant: Record<
  string,
  "default" | "secondary" | "success" | "info" | "warning" | "destructive" | "outline"
> = {
  PENDING_PAYMENT: "warning",
  PAID: "success",
  CONFIRMED: "info",
  DELIVERED: "outline",
  CANCELLED: "destructive",
};

export default async function AdminOrderDetail({
  params,
}: {
  params: Promise<{ shortCode: string }>;
}) {
  await requireAdmin();
  const { shortCode } = await params;

  const order = await prisma.order.findUnique({
    where: { shortCode },
    include: {
      round: { select: { id: true, title: true, deliveryDate: true, status: true } },
      items: { include: { roundProduct: { include: { product: true } } } },
      payment: true,
      statusEvents: { orderBy: { createdAt: "asc" } },
      review: { select: { rating: true } },
    },
  });
  if (!order) notFound();

  return (
    <div className="space-y-6">
      <div>
        <Button asChild variant="ghost" size="sm">
          <Link href={`/admin/rounds/${order.round.id}/orders`}>
            <ArrowLeft className="h-4 w-4" /> Back to round
          </Link>
        </Button>
      </div>

      {order.round.status === "CLOSED" &&
        (order.status === "PENDING_PAYMENT" ||
          order.status === "PENDING_CONFIRMATION" ||
          order.status === "PAID") && (
          <div
            className="rounded-md border border-[var(--badge-warning-fg)]/20 bg-[var(--badge-warning-bg)] px-3 py-2 text-sm text-[var(--badge-warning-fg)]"
            role="note"
          >
            Round is CLOSED but this order is still in flight — process as
            usual. (L-09)
          </div>
        )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          {/* shortCode is a code, not a title — keep mono+upright. */}
          <h1 className="font-mono text-2xl font-semibold text-[var(--primary)]">{order.shortCode}</h1>
          <p className="text-sm text-[var(--muted)]">
            {order.round.title} ·{" "}
            {order.createdAt.toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" })}
          </p>
        </div>
        <Badge variant={statusVariant[order.status]}>{order.status.replace("_", " ")}</Badge>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Customer</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-[var(--muted)]">Name</span>
              <Link
                href={`/admin/customers/${encodeURIComponent(order.customerWhatsApp)}`}
                className="font-medium hover:underline"
              >
                {order.customerName}
              </Link>
            </div>
            <div className="flex justify-between">
              <span className="text-[var(--muted)]">WhatsApp</span>
              <a
                href={formatWhatsAppLink(
                  order.customerWhatsApp,
                  `Halo ${order.customerName}, soal pesanan ${order.shortCode}…`,
                )}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-[var(--success)] hover:underline"
              >
                <MessageCircle className="h-3.5 w-3.5" /> {order.customerWhatsApp}
              </a>
            </div>
            <div className="flex justify-between">
              <span className="text-[var(--muted)]">Payment</span>
              <span>{order.paymentMethod}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[var(--muted)]">Delivery</span>
              <span>
                {order.round.deliveryDate.toLocaleDateString("en-GB", {
                  weekday: "short",
                  day: "numeric",
                  month: "short",
                })}
              </span>
            </div>
            {order.notes && (
              <div className="border-t pt-2">
                <p className="text-xs text-[var(--muted)]">Notes</p>
                <p className="mt-1 whitespace-pre-line">{order.notes}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Payment</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-[var(--muted)]">Total</span>
              <span className="text-base font-semibold">{formatIDR(order.totalAmount)}</span>
            </div>
            {order.payment?.paidAt && (
              <div className="flex justify-between">
                <span className="text-[var(--muted)]">Submitted at</span>
                <span>
                  {order.payment.paidAt.toLocaleString("en-GB", {
                    dateStyle: "medium",
                    timeStyle: "short",
                  })}
                </span>
              </div>
            )}
            {order.payment?.verifiedAt && (
              <div className="flex justify-between">
                <span className="text-[var(--muted)]">Verified at</span>
                <span>
                  {order.payment.verifiedAt.toLocaleString("en-GB", {
                    dateStyle: "medium",
                    timeStyle: "short",
                  })}
                </span>
              </div>
            )}
            {order.payment?.proofImageUrl && (
              <div>
                <p className="mb-2 text-xs text-[var(--muted)]">Proof</p>
                <a
                  href={order.payment.proofImageUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block"
                >
                  <div className="relative aspect-[3/4] w-full max-w-xs overflow-hidden rounded-md border bg-[var(--surface-warm-1)]">
                    <Image
                      src={order.payment.proofImageUrl}
                      alt="Payment proof"
                      fill
                      className="object-contain"
                      sizes="320px"
                    />
                  </div>
                </a>
              </div>
            )}
            {!order.payment?.proofImageUrl && order.paymentMethod === "QRIS" && (
              <p className="text-[var(--muted)]">Belum ada bukti transfer.</p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Items</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {order.items.map((it) => (
            <div key={it.id} className="flex items-center gap-3">
              <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-md bg-[var(--surface-warm-1)]">
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
                <p className="truncate font-medium">{it.roundProduct.product.name}</p>
                <p className="text-sm text-[var(--muted)]">
                  {it.quantity} × {formatIDR(it.unitPrice)}
                </p>
              </div>
              <p className="font-semibold">{formatIDR(it.unitPrice * it.quantity)}</p>
            </div>
          ))}
          <div className="flex justify-between border-t pt-3">
            <span className="font-medium">Total</span>
            <span className="text-lg font-semibold">{formatIDR(order.totalAmount)}</span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Status history</CardTitle>
        </CardHeader>
        <CardContent>
          <ol className="relative space-y-3 border-l border-[var(--border)] pl-4">
            <li className="relative">
              <span className="absolute -left-[21px] top-1.5 inline-block h-2.5 w-2.5 rounded-full bg-[var(--border-subtle-hover)]" />
              <p className="text-sm">
                <span className="font-medium">Order created</span>
                <span className="ml-2 text-xs text-[var(--muted)]">
                  {order.createdAt.toLocaleString("en-GB", {
                    dateStyle: "medium",
                    timeStyle: "short",
                  })}
                </span>
              </p>
            </li>
            {order.statusEvents.map((ev) => (
              <li key={ev.id} className="relative">
                <span className="absolute -left-[21px] top-1.5 inline-block h-2.5 w-2.5 rounded-full bg-[var(--primary)]" />
                <p className="text-sm">
                  <span className="font-medium">
                    {ev.fromStatus
                      ? `${ev.fromStatus.replace("_", " ")} → ${ev.toStatus.replace("_", " ")}`
                      : ev.toStatus.replace("_", " ")}
                  </span>
                  <span className="ml-2 text-xs text-[var(--muted)]">
                    {ev.createdAt.toLocaleString("en-GB", {
                      dateStyle: "medium",
                      timeStyle: "short",
                    })}{" "}
                    · {ev.actor}
                    {ev.note ? ` · ${ev.note}` : ""}
                  </span>
                </p>
              </li>
            ))}
          </ol>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Internal notes</CardTitle>
        </CardHeader>
        <CardContent>
          <AdminNotesForm
            shortCode={order.shortCode}
            initial={order.adminNotes ?? ""}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Actions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <OrderStatusActions
            shortCode={order.shortCode}
            status={order.status}
            paymentMethod={order.paymentMethod}
            hasProof={!!order.payment?.proofImageUrl}
          />

          {order.status === "DELIVERED" && (
            <ReviewRequestButton
              shortCode={order.shortCode}
              customerName={order.customerName}
              customerWhatsApp={order.customerWhatsApp}
              hasReview={!!order.review}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// L-06: opens a WhatsApp chat with a prefilled review-request message
// + a deep link to the customer's per-order ulasan page. Operator
// chooses when to send; the customer rates with one tap.
function ReviewRequestButton({
  shortCode,
  customerName,
  customerWhatsApp,
  hasReview,
}: {
  shortCode: string;
  customerName: string;
  customerWhatsApp: string;
  hasReview: boolean;
}) {
  const link = `${env.siteUrl().replace(/\/$/, "")}/pesanan/${shortCode}/ulasan`;
  const message = `Hai ${customerName}, makasih sudah pesan ${shortCode}! Boleh kasih rating singkat? ${link}`;
  const waLink = formatWhatsAppLink(customerWhatsApp, message);
  return (
    <div className="flex flex-wrap items-center gap-2 border-t border-[var(--border)] pt-4">
      <Button asChild variant={hasReview ? "outline" : "default"}>
        <a href={waLink} target="_blank" rel="noopener noreferrer">
          <Star className="h-4 w-4" />
          {hasReview ? "Resend review request" : "Send review request"}
        </a>
      </Button>
      {hasReview && (
        <span className="text-xs text-[var(--muted)]">
          Customer already left a rating.
        </span>
      )}
    </div>
  );
}

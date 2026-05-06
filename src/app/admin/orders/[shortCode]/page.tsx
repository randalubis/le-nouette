import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { ArrowLeft, MessageCircle } from "lucide-react";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatIDR, formatWhatsAppLink } from "@/lib/utils";
import { OrderStatusActions } from "./status-actions";

export const dynamic = "force-dynamic";

const statusVariant: Record<
  string,
  "default" | "secondary" | "success" | "warning" | "destructive" | "outline"
> = {
  PENDING_PAYMENT: "warning",
  PAID: "success",
  CONFIRMED: "default",
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
      round: { select: { id: true, title: true, deliveryDate: true } },
      items: { include: { roundProduct: { include: { product: true } } } },
      payment: true,
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

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">{order.shortCode}</h1>
          <p className="text-sm text-zinc-500">
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
              <span className="text-zinc-500">Name</span>
              <span className="font-medium">{order.customerName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-500">WhatsApp</span>
              <a
                href={formatWhatsAppLink(
                  order.customerWhatsApp,
                  `Halo ${order.customerName}, soal pesanan ${order.shortCode}…`,
                )}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-green-700 hover:underline"
              >
                <MessageCircle className="h-3.5 w-3.5" /> {order.customerWhatsApp}
              </a>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-500">Payment</span>
              <span>{order.paymentMethod}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-500">Delivery</span>
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
                <p className="text-xs text-zinc-500">Notes</p>
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
              <span className="text-zinc-500">Total</span>
              <span className="text-base font-semibold">{formatIDR(order.totalAmount)}</span>
            </div>
            {order.payment?.paidAt && (
              <div className="flex justify-between">
                <span className="text-zinc-500">Submitted at</span>
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
                <span className="text-zinc-500">Verified at</span>
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
                <p className="mb-2 text-xs text-zinc-500">Proof</p>
                <a
                  href={order.payment.proofImageUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block"
                >
                  <div className="relative aspect-[3/4] w-full max-w-xs overflow-hidden rounded-md border bg-zinc-100">
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
              <p className="text-zinc-500">Belum ada bukti transfer.</p>
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
              <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-md bg-zinc-100">
                <Image
                  src={it.roundProduct.product.imageUrl}
                  alt={it.roundProduct.product.name}
                  fill
                  className="object-cover"
                  sizes="48px"
                />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{it.roundProduct.product.name}</p>
                <p className="text-sm text-zinc-500">
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
          <CardTitle className="text-base">Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <OrderStatusActions
            shortCode={order.shortCode}
            status={order.status}
            paymentMethod={order.paymentMethod}
            hasProof={!!order.payment?.proofImageUrl}
          />
        </CardContent>
      </Card>
    </div>
  );
}

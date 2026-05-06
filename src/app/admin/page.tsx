import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  CalendarDays,
  Clock,
  ExternalLink,
  Package,
  Plus,
  Receipt,
  ShieldCheck,
  Truck,
  Users,
  Wallet,
} from "lucide-react";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatIDR, formatWhatsAppLink } from "@/lib/utils";

export const dynamic = "force-dynamic";

const orderStatusVariant: Record<
  string,
  "default" | "secondary" | "success" | "info" | "warning" | "destructive" | "outline"
> = {
  PENDING_PAYMENT: "warning",
  PAID: "success",
  CONFIRMED: "info",
  DELIVERED: "outline",
  CANCELLED: "destructive",
};

function formatRemaining(ms: number): string {
  if (ms <= 0) return "ditutup";
  const totalMinutes = Math.floor(ms / 60_000);
  const days = Math.floor(totalMinutes / 1440);
  const hours = Math.floor((totalMinutes % 1440) / 60);
  const minutes = totalMinutes % 60;
  if (days > 0) return `${days}h ${hours}j`;
  if (hours > 0) return `${hours}j ${minutes}m`;
  return `${minutes}m`;
}

export default async function AdminDashboard() {
  await requireAdmin();

  const openRound = await prisma.preorderRound.findFirst({
    where: { status: "OPEN" },
    include: {
      items: {
        include: { product: true },
        orderBy: { product: { name: "asc" } },
      },
      orders: {
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          shortCode: true,
          customerName: true,
          customerWhatsApp: true,
          paymentMethod: true,
          status: true,
          totalAmount: true,
          createdAt: true,
          items: { select: { quantity: true } },
          payment: { select: { proofImageUrl: true } },
        },
      },
    },
  });

  // Counts and aggregates derived from in-memory orders to avoid extra round-trips
  const activeOrders = openRound?.orders.filter((o) => o.status !== "CANCELLED") ?? [];

  const needsVerifyCount = activeOrders.filter(
    (o) => o.status === "PENDING_PAYMENT" && !!o.payment?.proofImageUrl,
  ).length;

  const awaitingPaymentCount = activeOrders.filter(
    (o) => o.status === "PENDING_PAYMENT" && !o.payment?.proofImageUrl,
  ).length;

  const readyToDeliverCount = activeOrders.filter(
    (o) => o.status === "PAID" || o.status === "CONFIRMED",
  ).length;

  const uniqueCustomers = new Set(activeOrders.map((o) => o.customerWhatsApp)).size;
  const revenue = activeOrders.reduce((s, o) => s + o.totalAmount, 0);
  const itemsSold = activeOrders.reduce(
    (s, o) => s + o.items.reduce((ss, it) => ss + it.quantity, 0),
    0,
  );

  const stockAlerts =
    openRound?.items
      .map((it) => ({
        name: it.product.name,
        sold: it.stockSold,
        limit: it.stockLimit,
        left: it.stockLimit - it.stockSold,
      }))
      .filter((s) => s.left <= 2) ?? [];

  // Most recent 5 orders for the bottom card (across all rounds, not just open)
  const recentOrders = await prisma.order.findMany({
    orderBy: { createdAt: "desc" },
    take: 5,
    select: {
      id: true,
      shortCode: true,
      customerName: true,
      paymentMethod: true,
      status: true,
      totalAmount: true,
      payment: { select: { proofImageUrl: true } },
      round: { select: { title: true } },
    },
  });

  const productCount = await prisma.product.count({ where: { isActive: true } });

  const ordersBaseUrl = openRound ? `/admin/rounds/${openRound.id}/orders` : null;

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-3">
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <p className="text-xs text-zinc-500">
          {productCount} active products
        </p>
      </div>

      {/* Tier 3 — Quick actions */}
      <div className="flex flex-wrap gap-2">
        <Button asChild>
          <Link href="/admin/products/new">
            <Plus className="h-4 w-4" /> New product
          </Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/admin/rounds/new">
            <Plus className="h-4 w-4" /> New round
          </Link>
        </Button>
        {ordersBaseUrl && (
          <Button asChild variant="outline">
            <Link href={ordersBaseUrl}>
              <Receipt className="h-4 w-4" /> Open round orders
            </Link>
          </Button>
        )}
      </div>

      {/* Stock alerts banner */}
      {openRound && stockAlerts.length > 0 && (
        <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <div>
            <p className="font-medium">Stock alert</p>
            <ul className="mt-1 space-y-0.5 text-amber-800">
              {stockAlerts.map((s) => (
                <li key={s.name}>
                  <span className="font-medium">{s.name}</span> —{" "}
                  {s.left === 0 ? "habis" : `${s.left} sisa`}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Tier 1 — Work-queue cards */}
      <div className="grid gap-3 sm:grid-cols-3">
        <ActionCard
          icon={<ShieldCheck className="h-4 w-4" />}
          label="Need to verify"
          count={needsVerifyCount}
          accent={needsVerifyCount > 0 ? "warning" : "neutral"}
          href={ordersBaseUrl ? `${ordersBaseUrl}?filter=needs-verify` : null}
          subtitle="Bukti transfer terupload"
        />
        <ActionCard
          icon={<Wallet className="h-4 w-4" />}
          label="Awaiting payment"
          count={awaitingPaymentCount}
          accent="neutral"
          href={ordersBaseUrl ? `${ordersBaseUrl}?filter=awaiting-payment` : null}
          subtitle="Belum upload bukti"
        />
        <ActionCard
          icon={<Truck className="h-4 w-4" />}
          label="Ready to deliver"
          count={readyToDeliverCount}
          accent={readyToDeliverCount > 0 ? "success" : "neutral"}
          href={ordersBaseUrl ? `${ordersBaseUrl}?filter=ready-to-deliver` : null}
          subtitle="Sudah dibayar / dikonfirmasi"
        />
      </div>

      {/* Tier 2 — Current round at-a-glance */}
      {openRound ? (
        <Card>
          <CardHeader className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <CardTitle>{openRound.title}</CardTitle>
              <Badge variant="success">OPEN</Badge>
            </div>
            <p className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-zinc-500">
              <span className="inline-flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" />
                Tutup dalam{" "}
                <span className="font-medium text-zinc-900">
                  {formatRemaining(openRound.closesAt.getTime() - Date.now())}
                </span>
              </span>
              <span className="inline-flex items-center gap-1">
                <CalendarDays className="h-3.5 w-3.5" />
                Antar{" "}
                {openRound.deliveryDate.toLocaleDateString("id-ID", {
                  weekday: "short",
                  day: "numeric",
                  month: "short",
                })}
              </span>
            </p>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid grid-cols-3 gap-3 rounded-md bg-zinc-50 p-3 text-center">
              <Stat label="Orders" value={activeOrders.length} />
              <Stat label="Items" value={itemsSold} />
              <Stat
                label="Customers"
                value={uniqueCustomers}
                icon={<Users className="h-3 w-3" />}
              />
            </div>

            <div>
              <p className="mb-2 text-sm font-medium">Stock per product</p>
              <ul className="space-y-2">
                {openRound.items.map((it) => {
                  const left = it.stockLimit - it.stockSold;
                  const pct = it.stockLimit > 0 ? (it.stockSold / it.stockLimit) * 100 : 0;
                  const out = left <= 0;
                  return (
                    <li key={it.id} className="text-sm">
                      <div className="flex justify-between">
                        <span className="truncate pr-2">{it.product.name}</span>
                        <span className={out ? "font-medium text-red-700" : "text-zinc-500"}>
                          {it.stockSold}/{it.stockLimit}
                        </span>
                      </div>
                      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-zinc-100">
                        <div
                          className={`h-full ${
                            out
                              ? "bg-red-500"
                              : pct >= 80
                                ? "bg-amber-500"
                                : "bg-green-600"
                          }`}
                          style={{ width: `${Math.min(100, pct)}%` }}
                        />
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>

            <div className="flex flex-wrap gap-2 border-t pt-4 text-sm">
              <Button asChild size="sm" variant="outline">
                <Link href={`/admin/rounds/${openRound.id}/orders`}>
                  View orders <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </Button>
              <Button asChild size="sm" variant="outline">
                <Link href={`/admin/rounds/${openRound.id}/edit`}>Edit round</Link>
              </Button>
              <Button asChild size="sm" variant="ghost">
                <Link href="/" target="_blank">
                  View storefront <ExternalLink className="h-3.5 w-3.5" />
                </Link>
              </Button>
            </div>

            <p className="text-base font-medium">
              Revenue: <span className="font-serif text-lg">{formatIDR(revenue)}</span>
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="space-y-3 py-8 text-center">
            <Package className="mx-auto h-8 w-8 text-zinc-400" />
            <p className="font-medium">No round is open</p>
            <p className="text-sm text-zinc-500">
              Create a new round to start accepting orders.
            </p>
            <Button asChild className="mt-2">
              <Link href="/admin/rounds/new">
                <Plus className="h-4 w-4" /> New round
              </Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Tier 4 — Recent orders */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent orders</CardTitle>
        </CardHeader>
        <CardContent>
          {recentOrders.length === 0 ? (
            <p className="text-sm text-zinc-500">No orders yet.</p>
          ) : (
            <ul className="divide-y divide-zinc-100">
              {recentOrders.map((o) => {
                const needsAttention =
                  o.status === "PENDING_PAYMENT" && !!o.payment?.proofImageUrl;
                return (
                  <li key={o.id} className="flex items-center justify-between gap-3 py-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <Link
                          href={`/admin/orders/${o.shortCode}`}
                          className="font-mono text-sm font-medium hover:underline"
                        >
                          {o.shortCode}
                        </Link>
                        {needsAttention && (
                          <span
                            className="inline-block h-2 w-2 rounded-full bg-amber-500"
                            title="Payment proof uploaded — needs verification"
                          />
                        )}
                        <Badge variant="outline" className="text-[10px]">
                          {o.paymentMethod}
                        </Badge>
                      </div>
                      <p className="mt-0.5 truncate text-xs text-zinc-500">
                        {o.customerName} · {o.round.title}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Badge variant={orderStatusVariant[o.status]}>
                        {o.status.replace("_", " ")}
                      </Badge>
                      <span className="text-sm font-medium tabular-nums">
                        {formatIDR(o.totalAmount)}
                      </span>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function ActionCard({
  icon,
  label,
  count,
  accent,
  href,
  subtitle,
}: {
  icon: React.ReactNode;
  label: string;
  count: number;
  accent: "warning" | "success" | "neutral";
  href: string | null;
  subtitle: string;
}) {
  const accentClasses =
    accent === "warning"
      ? "border-amber-200 bg-amber-50"
      : accent === "success"
        ? "border-green-200 bg-green-50"
        : "border-zinc-200 bg-white";

  const inner = (
    <div className={`rounded-lg border p-4 transition-shadow ${accentClasses} hover:shadow-sm`}>
      <div className="flex items-center justify-between">
        <span className="inline-flex items-center gap-1.5 text-sm font-medium text-zinc-700">
          {icon}
          {label}
        </span>
        {href && count > 0 && <ArrowRight className="h-4 w-4 text-zinc-400" />}
      </div>
      <p className="mt-2 text-3xl font-semibold">{count}</p>
      <p className="mt-0.5 text-xs text-zinc-500">{subtitle}</p>
    </div>
  );

  return href && count > 0 ? <Link href={href}>{inner}</Link> : inner;
}

function Stat({
  label,
  value,
  icon,
}: {
  label: string;
  value: number | string;
  icon?: React.ReactNode;
}) {
  return (
    <div>
      <p className="text-2xl font-semibold tabular-nums">{value}</p>
      <p className="mt-0.5 inline-flex items-center justify-center gap-1 text-xs text-zinc-500">
        {icon}
        {label}
      </p>
    </div>
  );
}

import Link from "next/link";
import { notFound } from "next/navigation";
import { Download } from "lucide-react";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatIDR } from "@/lib/utils";
import { BulkDeliveredButton } from "./bulk-delivered-button";
import { OrdersTable, type OrderRow } from "./orders-table";

export const dynamic = "force-dynamic";

type FilterKey =
  | "all"
  | "needs-verify"
  | "need-confirm"
  | "awaiting-payment"
  | "ready-to-deliver";

const filterLabels: Record<FilterKey, string> = {
  all: "All active",
  "needs-verify": "Needs payment verify",
  "need-confirm": "Need COD confirmation",
  "awaiting-payment": "Awaiting payment",
  "ready-to-deliver": "Ready to deliver",
};

export default async function RoundOrdersPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ show?: string; filter?: string }>;
}) {
  await requireAdmin();
  const { id } = await params;
  const { show, filter } = await searchParams;
  const includeCancelled = show === "all";
  const activeFilter: FilterKey =
    filter === "needs-verify" ||
    filter === "need-confirm" ||
    filter === "awaiting-payment" ||
    filter === "ready-to-deliver"
      ? filter
      : "all";

  const round = await prisma.preorderRound.findUnique({
    where: { id },
    include: {
      orders: {
        orderBy: { createdAt: "desc" },
        include: { items: true, payment: true },
      },
    },
  });
  if (!round) notFound();

  const allOrders = round.orders;
  const activeOrders = allOrders.filter(
    (o) => o.status !== "CANCELLED" && o.status !== "HOLD_EXPIRED",
  );
  const cancelledOrders = allOrders.filter(
    (o) => o.status === "CANCELLED" || o.status === "HOLD_EXPIRED",
  );

  type DbOrder = (typeof allOrders)[number];
  function matchesFilter(o: DbOrder): boolean {
    switch (activeFilter) {
      case "needs-verify":
        return o.status === "PENDING_PAYMENT" && !!o.payment?.proofImageUrl;
      case "need-confirm":
        return o.status === "PENDING_CONFIRMATION";
      case "awaiting-payment":
        return o.status === "PENDING_PAYMENT" && !o.payment?.proofImageUrl;
      case "ready-to-deliver":
        return o.status === "PAID" || o.status === "CONFIRMED";
      default:
        return true;
    }
  }

  const baseList = includeCancelled ? allOrders : activeOrders;
  const visibleOrders = baseList.filter(matchesFilter);

  const totals = activeOrders.reduce(
    (acc, o) => {
      acc.revenue += o.totalAmount;
      acc.itemsTotal += o.items.reduce((s, it) => s + it.quantity, 0);
      return acc;
    },
    { revenue: 0, itemsTotal: 0 },
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-serif text-3xl font-semibold italic text-[var(--primary)]">{round.title}</h1>
          <p className="text-sm text-[var(--muted)]">
            {activeOrders.length} active orders · {totals.itemsTotal} items ·{" "}
            {formatIDR(totals.revenue)}
            {cancelledOrders.length > 0 && (
              <span className="text-[var(--muted)]">
                {" "}
                · {cancelledOrders.length} cancelled
              </span>
            )}
          </p>
        </div>
        <div className="flex gap-2">
          <BulkDeliveredButton
            roundId={round.id}
            eligibleCount={
              activeOrders.filter((o) => o.status === "PAID" || o.status === "CONFIRMED").length
            }
          />
          <Button asChild variant="outline">
            <a href={`/api/admin/rounds/${round.id}/orders.csv`} download>
              <Download className="h-4 w-4" /> Export CSV
            </a>
          </Button>
        </div>
      </div>

      {activeFilter !== "all" && (
        <div className="flex items-center justify-between rounded-md border border-[var(--border)] bg-[var(--surface)] p-3 text-sm">
          <span>
            Filter: <span className="font-medium">{filterLabels[activeFilter]}</span> ·{" "}
            <span className="text-[var(--muted)]">{visibleOrders.length} match</span>
          </span>
          <Button asChild variant="ghost" size="sm">
            <Link href={`/admin/rounds/${id}/orders${includeCancelled ? "?show=all" : ""}`}>
              Clear filter
            </Link>
          </Button>
        </div>
      )}

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle className="text-base">Orders</CardTitle>
          {cancelledOrders.length > 0 && (
            <Button asChild variant="ghost" size="sm">
              <Link
                href={`/admin/rounds/${id}/orders?${new URLSearchParams({
                  ...(includeCancelled ? {} : { show: "all" }),
                  ...(activeFilter !== "all" ? { filter: activeFilter } : {}),
                }).toString()}`}
              >
                {includeCancelled
                  ? "Hide cancelled"
                  : `Show ${cancelledOrders.length} cancelled`}
              </Link>
            </Button>
          )}
        </CardHeader>
        <CardContent className="p-0">
          <OrdersTable
            orders={visibleOrders.map<OrderRow>((o) => ({
              id: o.id,
              shortCode: o.shortCode,
              customerName: o.customerName,
              customerWhatsApp: o.customerWhatsApp,
              paymentMethod: o.paymentMethod,
              status: o.status,
              totalAmount: o.totalAmount,
              itemCount: o.items.reduce((s, it) => s + it.quantity, 0),
            }))}
            emptyMessage={
              round.orders.length === 0
                ? "No orders yet."
                : "No active orders. All orders here are cancelled."
            }
          />
        </CardContent>
      </Card>
    </div>
  );
}

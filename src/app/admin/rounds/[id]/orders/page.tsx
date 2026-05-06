import Link from "next/link";
import { notFound } from "next/navigation";
import { Download, MessageCircle } from "lucide-react";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatIDR, formatWhatsAppLink } from "@/lib/utils";
import { BulkDeliveredButton } from "./bulk-delivered-button";

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

type FilterKey = "all" | "needs-verify" | "awaiting-payment" | "ready-to-deliver";

const filterLabels: Record<FilterKey, string> = {
  all: "All active",
  "needs-verify": "Needs payment verify",
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
  const activeOrders = allOrders.filter((o) => o.status !== "CANCELLED");
  const cancelledOrders = allOrders.filter((o) => o.status === "CANCELLED");

  type OrderRow = (typeof allOrders)[number];
  function matchesFilter(o: OrderRow): boolean {
    switch (activeFilter) {
      case "needs-verify":
        return o.status === "PENDING_PAYMENT" && !!o.payment?.proofImageUrl;
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
          <h1 className="text-2xl font-semibold">{round.title}</h1>
          <p className="text-sm text-zinc-500">
            {activeOrders.length} active orders · {totals.itemsTotal} items ·{" "}
            {formatIDR(totals.revenue)}
            {cancelledOrders.length > 0 && (
              <span className="text-zinc-400">
                {" "}
                · {cancelledOrders.length} cancelled
              </span>
            )}
          </p>
        </div>
        <div className="flex gap-2">
          <BulkDeliveredButton roundId={round.id} />
          <Button asChild variant="outline">
            <a href={`/api/admin/rounds/${round.id}/orders.csv`} download>
              <Download className="h-4 w-4" /> Export CSV
            </a>
          </Button>
        </div>
      </div>

      {activeFilter !== "all" && (
        <div className="flex items-center justify-between rounded-md border border-zinc-200 bg-white p-3 text-sm">
          <span>
            Filter: <span className="font-medium">{filterLabels[activeFilter]}</span> ·{" "}
            <span className="text-zinc-500">{visibleOrders.length} match</span>
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
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>WhatsApp</TableHead>
                <TableHead>Items</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Method</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visibleOrders.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="py-8 text-center text-sm text-zinc-500">
                    {round.orders.length === 0
                      ? "No orders yet."
                      : "No active orders. All orders here are cancelled."}
                  </TableCell>
                </TableRow>
              ) : (
                visibleOrders.map((o) => {
                  const itemsCount = o.items.reduce((s, it) => s + it.quantity, 0);
                  const isCancelled = o.status === "CANCELLED";
                  return (
                    <TableRow key={o.id} className={isCancelled ? "opacity-50" : ""}>
                      <TableCell className="font-mono text-sm">{o.shortCode}</TableCell>
                      <TableCell className="font-medium">{o.customerName}</TableCell>
                      <TableCell>
                        <a
                          href={formatWhatsAppLink(
                            o.customerWhatsApp,
                            `Halo ${o.customerName}, soal pesanan ${o.shortCode}…`,
                          )}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-sm text-green-700 hover:underline"
                        >
                          <MessageCircle className="h-3.5 w-3.5" />
                          {o.customerWhatsApp}
                        </a>
                      </TableCell>
                      <TableCell>{itemsCount}</TableCell>
                      <TableCell>{formatIDR(o.totalAmount)}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{o.paymentMethod}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={statusVariant[o.status]}>
                          {o.status.replace("_", " ")}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button asChild size="sm" variant="outline">
                          <Link href={`/admin/orders/${o.shortCode}`}>Open</Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

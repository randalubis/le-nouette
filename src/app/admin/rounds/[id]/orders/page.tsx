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

export default async function RoundOrdersPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdmin();
  const { id } = await params;

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

  const totals = round.orders
    .filter((o) => o.status !== "CANCELLED")
    .reduce(
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
            {round.orders.length} orders · {totals.itemsTotal} items · {formatIDR(totals.revenue)}
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

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Orders</CardTitle>
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
              {round.orders.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="py-8 text-center text-sm text-zinc-500">
                    No orders yet.
                  </TableCell>
                </TableRow>
              ) : (
                round.orders.map((o) => {
                  const itemsCount = o.items.reduce((s, it) => s + it.quantity, 0);
                  return (
                    <TableRow key={o.id}>
                      <TableCell className="font-mono text-sm">{o.shortCode}</TableCell>
                      <TableCell className="font-medium">{o.customerName}</TableCell>
                      <TableCell>
                        <a
                          href={formatWhatsAppLink(o.customerWhatsApp, `Halo ${o.customerName}, soal pesanan ${o.shortCode}…`)}
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

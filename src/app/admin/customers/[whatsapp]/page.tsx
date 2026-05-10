import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, MessageCircle } from "lucide-react";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatIDR, formatWhatsAppLink, normalizeWhatsApp } from "@/lib/utils";

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

export default async function CustomerPage({
  params,
}: {
  params: Promise<{ whatsapp: string }>;
}) {
  await requireAdmin();
  const { whatsapp } = await params;
  const normalized = normalizeWhatsApp(decodeURIComponent(whatsapp));

  // X-05: prefer normalizedWhatsApp; fall back to customerWhatsApp for any
  // pre-migration rows whose backfill missed (it shouldn't, but cheap belt
  // and suspenders).
  const orders = await prisma.order.findMany({
    where: {
      OR: [{ normalizedWhatsApp: normalized }, { customerWhatsApp: normalized }],
    },
    orderBy: { createdAt: "desc" },
    include: {
      round: { select: { id: true, title: true } },
      items: { select: { quantity: true } },
    },
  });

  if (orders.length === 0) notFound();

  const customerName = orders[0].customerName;
  const totalOrders = orders.length;
  const activeOrders = orders.filter((o) => o.status !== "CANCELLED");
  const totalRevenue = activeOrders.reduce((s, o) => s + o.totalAmount, 0);
  const totalItems = activeOrders.reduce(
    (s, o) => s + o.items.reduce((ss, it) => ss + it.quantity, 0),
    0,
  );
  const firstOrderAt = orders[orders.length - 1].createdAt;
  const lastOrderAt = orders[0].createdAt;

  return (
    <div className="space-y-6">
      <div>
        <Button asChild variant="ghost" size="sm">
          <Link href="/admin/orders">
            <ArrowLeft className="h-4 w-4" /> All orders
          </Link>
        </Button>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-serif text-3xl font-semibold italic text-[var(--primary)]">{customerName}</h1>
          <a
            href={formatWhatsAppLink(normalized, `Halo ${customerName}`)}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-sm text-[var(--success)] hover:underline"
          >
            <MessageCircle className="h-3.5 w-3.5" />
            {normalized}
          </a>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-4">
        <Stat label="Orders" value={totalOrders} />
        <Stat label="Items (active)" value={totalItems} />
        <Stat label="Revenue (active)" value={formatIDR(totalRevenue)} />
        <Stat
          label="Customer since"
          value={firstOrderAt.toLocaleDateString("en-GB", {
            day: "2-digit",
            month: "short",
            year: "numeric",
          })}
          sub={
            firstOrderAt.getTime() === lastOrderAt.getTime()
              ? undefined
              : `Last: ${lastOrderAt.toLocaleDateString("en-GB", { day: "2-digit", month: "short" })}`
          }
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">All orders</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="sticky top-0 z-10 bg-[var(--background)]">
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Round</TableHead>
                <TableHead>Items</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Method</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orders.map((o) => (
                <TableRow key={o.id} className={o.status === "CANCELLED" ? "opacity-50" : ""}>
                  <TableCell className="font-mono text-sm">{o.shortCode}</TableCell>
                  <TableCell className="text-xs text-[var(--muted)]">
                    {o.createdAt.toLocaleDateString("en-GB", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    })}
                  </TableCell>
                  <TableCell>
                    <Link
                      href={`/admin/rounds/${o.round.id}/orders`}
                      className="text-xs text-[var(--foreground)] hover:underline"
                    >
                      {o.round.title}
                    </Link>
                  </TableCell>
                  <TableCell>
                    {o.items.reduce((s, it) => s + it.quantity, 0)}
                  </TableCell>
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
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

function Stat({
  label,
  value,
  sub,
}: {
  label: string;
  value: string | number;
  sub?: string;
}) {
  return (
    <div className="rounded-lg border-[0.5px] border-[var(--border)] bg-[var(--surface)] p-3">
      <p className="text-xs text-[var(--muted)]">{label}</p>
      <p className="mt-1 text-xl font-semibold">{value}</p>
      {sub && <p className="text-xs text-[var(--muted)]">{sub}</p>}
    </div>
  );
}

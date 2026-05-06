import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { GlobalOrdersTable, type GlobalOrderRow } from "./_components/global-orders-table";

export const dynamic = "force-dynamic";

const PRESETS: Record<string, number> = {
  "7": 7,
  "30": 30,
  "90": 90,
};

export default async function AllOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ days?: string; status?: string }>;
}) {
  await requireAdmin();
  const { days, status } = await searchParams;
  const dayWindow = days && PRESETS[days] ? PRESETS[days] : 30;
  const since = new Date(Date.now() - dayWindow * 24 * 60 * 60 * 1000);

  const orders = await prisma.order.findMany({
    where: {
      createdAt: { gte: since },
      ...(status === "active"
        ? { status: { notIn: ["DELIVERED", "CANCELLED"] } }
        : status === "delivered"
          ? { status: "DELIVERED" }
          : status === "cancelled"
            ? { status: "CANCELLED" }
            : {}),
    },
    orderBy: { createdAt: "desc" },
    include: {
      round: { select: { title: true, id: true } },
      items: { select: { quantity: true } },
      payment: { select: { proofImageUrl: true } },
    },
    take: 200,
  });

  const rows: GlobalOrderRow[] = orders.map((o) => ({
    id: o.id,
    shortCode: o.shortCode,
    customerName: o.customerName,
    customerWhatsApp: o.customerWhatsApp,
    paymentMethod: o.paymentMethod,
    status: o.status,
    totalAmount: o.totalAmount,
    itemCount: o.items.reduce((s, it) => s + it.quantity, 0),
    createdAt: o.createdAt.toISOString(),
    roundTitle: o.round.title,
    roundId: o.round.id,
    needsAttention:
      o.status === "PENDING_PAYMENT" && !!o.payment?.proofImageUrl,
  }));

  const filterPath = (next: { days?: string; status?: string }) => {
    const sp = new URLSearchParams();
    const d = next.days ?? days ?? "30";
    if (d !== "30") sp.set("days", d);
    const s = next.status ?? status;
    if (s) sp.set("status", s);
    const q = sp.toString();
    return `/admin/orders${q ? `?${q}` : ""}`;
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">All orders</h1>
          <p className="text-sm text-zinc-500">
            {rows.length} orders in the last {dayWindow} days
            {orders.length === 200 && " (showing latest 200)"}
          </p>
        </div>
      </div>

      <Card>
        <CardHeader className="flex flex-col gap-3 space-y-0 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap gap-1.5 text-sm">
            <FilterPill href={filterPath({ days: "7" })} active={dayWindow === 7}>
              7d
            </FilterPill>
            <FilterPill href={filterPath({ days: "30" })} active={dayWindow === 30}>
              30d
            </FilterPill>
            <FilterPill href={filterPath({ days: "90" })} active={dayWindow === 90}>
              90d
            </FilterPill>
          </div>
          <div className="flex flex-wrap gap-1.5 text-sm">
            <FilterPill href={filterPath({ status: "" })} active={!status}>
              All
            </FilterPill>
            <FilterPill href={filterPath({ status: "active" })} active={status === "active"}>
              Active
            </FilterPill>
            <FilterPill href={filterPath({ status: "delivered" })} active={status === "delivered"}>
              Delivered
            </FilterPill>
            <FilterPill href={filterPath({ status: "cancelled" })} active={status === "cancelled"}>
              Cancelled
            </FilterPill>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <GlobalOrdersTable rows={rows} />
        </CardContent>
      </Card>
    </div>
  );
}

function FilterPill({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Button asChild size="sm" variant={active ? "default" : "outline"}>
      <Link href={href}>{children}</Link>
    </Button>
  );
}

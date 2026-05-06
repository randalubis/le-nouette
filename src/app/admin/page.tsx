import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatIDR } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function AdminDashboard() {
  await requireAdmin();

  const [productCount, openRound, recentOrders] = await Promise.all([
    prisma.product.count({ where: { isActive: true } }),
    prisma.preorderRound.findFirst({
      where: { status: "OPEN" },
      include: { _count: { select: { orders: true } } },
    }),
    prisma.order.findMany({
      orderBy: { createdAt: "desc" },
      take: 5,
      include: { round: { select: { title: true } } },
    }),
  ]);

  const revenue = openRound
    ? await prisma.order.aggregate({
        where: { roundId: openRound.id, status: { not: "CANCELLED" } },
        _sum: { totalAmount: true },
      })
    : null;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Dashboard</h1>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-zinc-500">Active products</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold">{productCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-zinc-500">Open round</CardTitle>
          </CardHeader>
          <CardContent>
            {openRound ? (
              <>
                <p className="text-base font-semibold">{openRound.title}</p>
                <p className="text-sm text-zinc-500">{openRound._count.orders} orders</p>
              </>
            ) : (
              <p className="text-sm text-zinc-500">No round open</p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-zinc-500">Open round revenue</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold">
              {formatIDR(revenue?._sum.totalAmount ?? 0)}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent orders</CardTitle>
        </CardHeader>
        <CardContent>
          {recentOrders.length === 0 ? (
            <p className="text-sm text-zinc-500">No orders yet.</p>
          ) : (
            <ul className="divide-y divide-zinc-100">
              {recentOrders.map((o) => (
                <li key={o.id} className="flex items-center justify-between py-2">
                  <div>
                    <Link
                      href={`/admin/orders/${o.shortCode}`}
                      className="font-medium hover:underline"
                    >
                      {o.shortCode}
                    </Link>
                    <span className="ml-2 text-sm">
                      <Badge variant="outline">{o.paymentMethod}</Badge>
                    </span>
                    <span className="ml-2 text-sm text-zinc-500">
                      {o.customerName} · {o.round.title}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{o.status.replace("_", " ")}</Badge>
                    <span className="text-sm font-medium">{formatIDR(o.totalAmount)}</span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

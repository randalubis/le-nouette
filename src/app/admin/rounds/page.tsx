import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export const dynamic = "force-dynamic";

const statusVariant = {
  DRAFT: "secondary",
  OPEN: "success",
  CLOSED: "warning",
  DELIVERED: "outline",
  CANCELLED: "destructive",
} as const;

// A round flagged OPEN but with opensAt still in the future is
// "scheduled" — show it as info-styled SCHEDULED so admin can tell a
// queued round apart from a live one at a glance.
function roundBadge(status: keyof typeof statusVariant, opensAt: Date) {
  if (status === "OPEN" && opensAt.getTime() > Date.now()) {
    return { variant: "info" as const, label: "SCHEDULED" };
  }
  return { variant: statusVariant[status], label: status };
}

export default async function RoundsPage() {
  await requireAdmin();
  const rounds = await prisma.preorderRound.findMany({
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { items: true, orders: true } } },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-serif text-3xl font-semibold italic text-[var(--primary)]">Preorder rounds</h1>
        <Button asChild>
          <Link href="/admin/rounds/new">New round</Link>
        </Button>
      </div>

      {/* Mobile card list */}
      <div className="space-y-3 md:hidden">
        {rounds.length === 0 ? (
          <Card className="py-8 text-center text-sm text-[var(--muted)]">No rounds yet.</Card>
        ) : (
          rounds.map((r) => {
            const badge = roundBadge(r.status, r.opensAt);
            return (
            <Card key={r.id} className="p-3">
              <div className="flex items-start justify-between gap-2">
                <p className="min-w-0 truncate font-medium">{r.title}</p>
                <Badge variant={badge.variant}>{badge.label}</Badge>
              </div>
              <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-xs">
                <dt className="text-[var(--muted)]">Opens</dt>
                <dd className="text-[var(--foreground)]">{r.opensAt.toLocaleString("en-GB")}</dd>
                <dt className="text-[var(--muted)]">Closes</dt>
                <dd className="text-[var(--foreground)]">{r.closesAt.toLocaleString("en-GB")}</dd>
                <dt className="text-[var(--muted)]">Delivery</dt>
                <dd className="text-[var(--foreground)]">
                  {r.deliveryDate.toLocaleDateString("en-GB")}
                </dd>
              </dl>
              <p className="mt-2 text-xs text-[var(--muted)]">
                {r._count.items} items · {r._count.orders} orders
              </p>
              <div className="mt-3 flex justify-end gap-2 border-t border-[var(--border)] pt-3">
                <Button asChild variant="outline" size="sm">
                  <Link href={`/admin/rounds/${r.id}/orders`}>Orders</Link>
                </Button>
                <Button asChild variant="outline" size="sm">
                  <Link href={`/admin/rounds/${r.id}/edit`}>Edit</Link>
                </Button>
              </div>
            </Card>
            );
          })
        )}
      </div>

      {/* Desktop table */}
      <Card className="hidden md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Opens</TableHead>
              <TableHead>Closes</TableHead>
              <TableHead>Delivery</TableHead>
              <TableHead>Items</TableHead>
              <TableHead>Orders</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rounds.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="py-8 text-center text-sm text-[var(--muted)]">
                  No rounds yet.
                </TableCell>
              </TableRow>
            ) : (
              rounds.map((r) => {
                const badge = roundBadge(r.status, r.opensAt);
                return (
                <TableRow key={r.id}>
                  <TableCell className="font-medium">{r.title}</TableCell>
                  <TableCell>
                    <Badge variant={badge.variant}>{badge.label}</Badge>
                  </TableCell>
                  <TableCell className="text-sm">{r.opensAt.toLocaleString("en-GB")}</TableCell>
                  <TableCell className="text-sm">{r.closesAt.toLocaleString("en-GB")}</TableCell>
                  <TableCell className="text-sm">
                    {r.deliveryDate.toLocaleDateString("en-GB")}
                  </TableCell>
                  <TableCell>{r._count.items}</TableCell>
                  <TableCell>{r._count.orders}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button asChild variant="outline" size="sm">
                        <Link href={`/admin/rounds/${r.id}/orders`}>Orders</Link>
                      </Button>
                      <Button asChild variant="outline" size="sm">
                        <Link href={`/admin/rounds/${r.id}/edit`}>Edit</Link>
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}

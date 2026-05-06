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

export default async function RoundsPage() {
  await requireAdmin();
  const rounds = await prisma.preorderRound.findMany({
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { items: true, orders: true } } },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Preorder rounds</h1>
        <Button asChild>
          <Link href="/admin/rounds/new">New round</Link>
        </Button>
      </div>

      <Card>
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
                <TableCell colSpan={8} className="py-8 text-center text-sm text-zinc-500">
                  No rounds yet.
                </TableCell>
              </TableRow>
            ) : (
              rounds.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium">{r.title}</TableCell>
                  <TableCell>
                    <Badge variant={statusVariant[r.status]}>{r.status}</Badge>
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
              ))
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}

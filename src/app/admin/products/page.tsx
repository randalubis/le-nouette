import Link from "next/link";
import Image from "next/image";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatIDR } from "@/lib/utils";
import { ActiveToggle } from "./_components/active-toggle";
import { DuplicateButton } from "./_components/duplicate-button";

export const dynamic = "force-dynamic";

export default async function ProductsPage() {
  await requireAdmin();
  const products = await prisma.product.findMany({ orderBy: { updatedAt: "desc" } });

  // Aggregate non-cancelled order item quantities per product
  const itemRows = await prisma.orderItem.findMany({
    where: { order: { status: { not: "CANCELLED" } } },
    select: { quantity: true, roundProduct: { select: { productId: true } } },
  });
  const soldByProduct = new Map<string, number>();
  for (const it of itemRows) {
    const id = it.roundProduct.productId;
    soldByProduct.set(id, (soldByProduct.get(id) ?? 0) + it.quantity);
  }

  // Find products attached to the currently OPEN round
  const openRound = await prisma.preorderRound.findFirst({
    where: { status: "OPEN" },
    select: {
      id: true,
      items: {
        select: { productId: true, price: true, stockLimit: true, stockSold: true },
      },
    },
  });
  const inRoundByProduct = new Map<string, { price: number; left: number; limit: number }>();
  if (openRound) {
    for (const it of openRound.items) {
      inRoundByProduct.set(it.productId, {
        price: it.price,
        left: it.stockLimit - it.stockSold,
        limit: it.stockLimit,
      });
    }
  }

  // Last sold price (most recent RoundProduct.price per product, by round createdAt desc)
  const lastSoldRows = await prisma.roundProduct.findMany({
    orderBy: { round: { createdAt: "desc" } },
    select: {
      productId: true,
      price: true,
      round: { select: { createdAt: true } },
    },
  });
  const lastSoldByProduct = new Map<string, number>();
  for (const row of lastSoldRows) {
    if (!lastSoldByProduct.has(row.productId)) {
      lastSoldByProduct.set(row.productId, row.price);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Products</h1>
        <Button asChild>
          <Link href="/admin/products/new">New product</Link>
        </Button>
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Image</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Base price</TableHead>
              <TableHead>Last sold at</TableHead>
              <TableHead>In open round</TableHead>
              <TableHead className="text-right">Sold</TableHead>
              <TableHead>Active</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {products.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="py-8 text-center text-sm text-zinc-500">
                  No products yet.
                </TableCell>
              </TableRow>
            ) : (
              products.map((p) => {
                const sold = soldByProduct.get(p.id) ?? 0;
                const inRound = inRoundByProduct.get(p.id);
                const lastSold = lastSoldByProduct.get(p.id);
                return (
                  <TableRow key={p.id}>
                    <TableCell>
                      <div className="relative h-16 w-16 overflow-hidden rounded-md bg-zinc-100">
                        <Image
                          src={p.imageUrl}
                          alt={p.name}
                          fill
                          className="object-cover"
                          sizes="64px"
                        />
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">{p.name}</TableCell>
                    <TableCell>{formatIDR(p.basePrice)}</TableCell>
                    <TableCell>
                      {lastSold !== undefined ? (
                        <span
                          className={
                            lastSold === p.basePrice
                              ? "text-zinc-500"
                              : "text-zinc-700"
                          }
                          title={
                            lastSold === p.basePrice
                              ? "Same as base price"
                              : `Differs from base price (${formatIDR(p.basePrice)})`
                          }
                        >
                          {formatIDR(lastSold)}
                        </span>
                      ) : (
                        <span className="text-xs text-zinc-400">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {inRound ? (
                        <Badge
                          variant={inRound.left > 0 ? "success" : "destructive"}
                          title={`${formatIDR(inRound.price)} · ${inRound.left}/${inRound.limit} left`}
                        >
                          {inRound.left > 0 ? `${inRound.left} left` : "Sold out"}
                        </Badge>
                      ) : openRound ? (
                        <span className="text-xs text-zinc-400">Not in round</span>
                      ) : (
                        <span className="text-xs text-zinc-400">No open round</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      <span className={sold > 0 ? "font-medium" : "text-zinc-400"}>
                        {sold}
                      </span>
                    </TableCell>
                    <TableCell>
                      <ActiveToggle id={p.id} initialActive={p.isActive} />
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1.5">
                        <DuplicateButton id={p.id} />
                        <Button asChild variant="outline" size="sm">
                          <Link href={`/admin/products/${p.id}/edit`}>Edit</Link>
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

      {products.length > 0 && (
        <p className="text-xs text-zinc-500">
          &ldquo;Sold&rdquo; counts non-cancelled order items across all rounds.
        </p>
      )}
    </div>
  );
}

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

  // Find products attached to the live round. Gate on opensAt <= now to
  // match the storefront, dashboard, and order APIs — a round can be
  // status=OPEN but scheduled for the future, and its products aren't
  // sellable yet, so they shouldn't show as "in the open round" here.
  const openRound = await prisma.preorderRound.findFirst({
    where: { status: "OPEN", opensAt: { lte: new Date() } },
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
        <h1 className="font-serif text-3xl font-semibold italic text-[var(--primary)]">Products</h1>
        <Button asChild>
          <Link href="/admin/products/new">New product</Link>
        </Button>
      </div>

      {/* Mobile card list */}
      <div className="space-y-3 md:hidden">
        {products.length === 0 ? (
          <Card className="py-8 text-center text-sm text-[var(--muted)]">
            No products yet.
          </Card>
        ) : (
          products.map((p) => {
            const sold = soldByProduct.get(p.id) ?? 0;
            const inRound = inRoundByProduct.get(p.id);
            const lastSold = lastSoldByProduct.get(p.id);
            return (
              <Card key={p.id} className="p-3">
                <div className="flex gap-3">
                  <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-md bg-[var(--surface-warm-1)]">
                    {/* alt="" — name is announced from the adjacent text (N-13). */}
                    <Image
                      src={p.imageUrl}
                      alt=""
                      fill
                      className="object-cover"
                      sizes="80px"
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <p className="truncate font-medium">{p.name}</p>
                      <ActiveToggle id={p.id} initialActive={p.isActive} />
                    </div>
                    <p className="text-sm text-[var(--foreground)]">{formatIDR(p.basePrice)}</p>
                    <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[var(--muted)]">
                      <span>
                        Sold:{" "}
                        <span
                          className={
                            sold > 0 ? "font-medium text-[var(--foreground)]" : "text-[var(--muted)]"
                          }
                        >
                          {sold}
                        </span>
                      </span>
                      {lastSold !== undefined && (
                        <span
                          title={
                            lastSold === p.basePrice
                              ? "Same as base price"
                              : `Differs from base price (${formatIDR(p.basePrice)})`
                          }
                        >
                          Last sold:{" "}
                          <span
                            className={
                              lastSold === p.basePrice
                                ? "text-[var(--muted)]"
                                : "text-[var(--foreground)]"
                            }
                          >
                            {formatIDR(lastSold)}
                          </span>
                        </span>
                      )}
                    </div>
                    {inRound ? (
                      <div className="mt-2">
                        <Badge
                          variant={inRound.left > 0 ? "success" : "destructive"}
                          title={`${formatIDR(inRound.price)} · ${inRound.left}/${inRound.limit} left`}
                        >
                          {inRound.left > 0
                            ? `In round · ${inRound.left} left`
                            : "Sold out"}
                        </Badge>
                      </div>
                    ) : openRound ? (
                      <p className="mt-2 text-xs text-[var(--muted)]">Not in open round</p>
                    ) : null}
                  </div>
                </div>
                <div className="mt-3 flex justify-end gap-1.5 border-t border-[var(--border)] pt-3">
                  <DuplicateButton id={p.id} />
                  <Button asChild variant="outline" size="sm">
                    <Link href={`/admin/products/${p.id}/edit`}>Edit</Link>
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
                <TableCell colSpan={8} className="py-8 text-center text-sm text-[var(--muted)]">
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
                      <div className="relative h-16 w-16 overflow-hidden rounded-md bg-[var(--surface-warm-1)]">
                        {/* alt="" — name is announced from the adjacent table cell (N-13). */}
                        <Image
                          src={p.imageUrl}
                          alt=""
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
                              ? "text-[var(--muted)]"
                              : "text-[var(--foreground)]"
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
                        <span className="text-xs text-[var(--muted)]">—</span>
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
                        <span className="text-xs text-[var(--muted)]">Not in round</span>
                      ) : (
                        <span className="text-xs text-[var(--muted)]">No open round</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      <span className={sold > 0 ? "font-medium" : "text-[var(--muted)]"}>
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
        <p className="text-xs text-[var(--muted)]">
          &ldquo;Sold&rdquo; counts non-cancelled order items across all rounds.
        </p>
      )}
    </div>
  );
}

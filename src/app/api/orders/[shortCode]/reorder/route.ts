import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/db";

// Returns a "what's still available?" map keyed by Product.id for the
// items in a past order, scoped to whichever round is currently OPEN.
// The client uses this to populate the cart with current-round prices
// and surface a list of items that didn't transfer over. (Plan ticket L-03.)
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ shortCode: string }> },
) {
  const { shortCode } = await params;

  const past = await prisma.order.findUnique({
    where: { shortCode },
    select: {
      items: {
        select: {
          quantity: true,
          roundProduct: { select: { productId: true, product: { select: { name: true } } } },
        },
      },
    },
  });
  if (!past) {
    return NextResponse.json({ ok: false, error: "Pesanan tidak ditemukan." }, { status: 404 });
  }

  const openRound = await prisma.preorderRound.findFirst({
    where: { status: "OPEN", opensAt: { lte: new Date() } },
    select: {
      id: true,
      items: {
        select: {
          id: true,
          productId: true,
          price: true,
          stockLimit: true,
          stockSold: true,
          product: { select: { name: true, imageUrl: true } },
        },
      },
    },
  });
  if (!openRound) {
    return NextResponse.json(
      { ok: false, error: "Belum ada ronde yang buka. Cek lagi nanti." },
      { status: 409 },
    );
  }

  const byProductId = new Map(openRound.items.map((it) => [it.productId, it]));

  const available: Array<{
    roundProductId: string;
    productId: string;
    name: string;
    price: number;
    imageUrl: string;
    quantity: number;
  }> = [];
  const unavailable: Array<{ productId: string; name: string; reason: "missing" | "soldout" }> = [];

  for (const it of past.items) {
    const current = byProductId.get(it.roundProduct.productId);
    if (!current) {
      unavailable.push({
        productId: it.roundProduct.productId,
        name: it.roundProduct.product.name,
        reason: "missing",
      });
      continue;
    }
    const left = current.stockLimit - current.stockSold;
    if (left <= 0) {
      unavailable.push({
        productId: current.productId,
        name: current.product.name,
        reason: "soldout",
      });
      continue;
    }
    available.push({
      roundProductId: current.id,
      productId: current.productId,
      name: current.product.name,
      price: current.price,
      imageUrl: current.product.imageUrl,
      quantity: Math.min(it.quantity, left),
    });
  }

  return NextResponse.json({
    ok: true,
    roundId: openRound.id,
    available,
    unavailable,
  });
}

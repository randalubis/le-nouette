import { NextResponse, type NextRequest } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { checkoutSchema } from "@/lib/validators";

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request body." }, { status: 400 });
  }

  const parsed = checkoutSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 },
    );
  }

  const data = parsed.data;
  const roundId = data.roundId;

  try {
    const result = await prisma.$transaction(
      async (tx) => {
        const round = await tx.preorderRound.findUnique({ where: { id: roundId } });
        if (!round) throw new BadRequest("Ronde tidak ditemukan.");
        if (round.status !== "OPEN") throw new BadRequest("Ronde sudah ditutup.");
        if (round.closesAt.getTime() < Date.now())
          throw new BadRequest("Waktu pemesanan sudah berakhir.");

        const lineProducts = await tx.roundProduct.findMany({
          where: {
            id: { in: data.items.map((it) => it.roundProductId) },
            roundId,
          },
          include: { product: { select: { name: true } } },
        });

        if (lineProducts.length !== data.items.length) {
          throw new BadRequest("Beberapa produk tidak tersedia di ronde ini.");
        }

        const productMap = new Map(lineProducts.map((lp) => [lp.id, lp]));
        let total = 0;
        for (const item of data.items) {
          const lp = productMap.get(item.roundProductId)!;
          const left = lp.stockLimit - lp.stockSold;
          if (item.quantity > left) {
            throw new BadRequest(`Stok ${lp.product.name} tidak cukup (sisa ${left}).`);
          }
          total += lp.price * item.quantity;
        }

        for (const item of data.items) {
          await tx.roundProduct.update({
            where: { id: item.roundProductId },
            data: { stockSold: { increment: item.quantity } },
          });
        }

        const shortCode = await nextShortCodeTx(tx);
        const initialStatus = data.paymentMethod === "QRIS" ? "PENDING_PAYMENT" : "CONFIRMED";

        const order = await tx.order.create({
          data: {
            shortCode,
            roundId,
            customerName: data.customerName,
            customerWhatsApp: data.customerWhatsApp,
            paymentMethod: data.paymentMethod,
            status: initialStatus,
            totalAmount: total,
            notes: data.notes ?? null,
            items: {
              create: data.items.map((it) => ({
                roundProductId: it.roundProductId,
                quantity: it.quantity,
                unitPrice: productMap.get(it.roundProductId)!.price,
              })),
            },
            payment: { create: {} },
          },
          select: { shortCode: true, totalAmount: true, paymentMethod: true },
        });

        return order;
      },
      { timeout: 20_000, maxWait: 5_000 },
    );

    return NextResponse.json({
      ok: true,
      shortCode: result.shortCode,
      totalAmount: result.totalAmount,
      paymentMethod: result.paymentMethod,
    });
  } catch (e) {
    if (e instanceof BadRequest) {
      return NextResponse.json({ ok: false, error: e.message }, { status: 400 });
    }
    console.error("Order creation failed", e);
    return NextResponse.json({ ok: false, error: "Gagal membuat pesanan." }, { status: 500 });
  }
}

class BadRequest extends Error {}

async function nextShortCodeTx(tx: Prisma.TransactionClient): Promise<string> {
  const counter = await tx.orderCounter.upsert({
    where: { id: 1 },
    create: { id: 1, value: 1 },
    update: { value: { increment: 1 } },
  });
  return `LN-${String(counter.value).padStart(4, "0")}`;
}

import { NextResponse, type NextRequest } from "next/server";
import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { errorMessage } from "@/lib/errors";
import { checkoutSchema } from "@/lib/validators";

const HOLD_WINDOW_MS = 30 * 60 * 1000; // X-04

// Lazy reconciler — scans for expired soft holds and cancels them. Runs at
// the start of every order-creation request so the system self-heals
// without needing a cron route. Worst-case lag = time-to-next-order.
async function releaseExpiredHolds(): Promise<void> {
  const expired = await prisma.order.findMany({
    where: {
      status: "PENDING_PAYMENT",
      stockHoldExpiresAt: { lt: new Date() },
      payment: { is: { proofImageUrl: null } },
    },
    select: { id: true, status: true, items: true },
  });
  if (expired.length === 0) return;
  for (const order of expired) {
    try {
      await prisma.$transaction(async (tx) => {
        for (const it of order.items) {
          await tx.roundProduct.update({
            where: { id: it.roundProductId },
            data: { stockSold: { decrement: it.quantity } },
          });
        }
        await tx.order.update({
          where: { id: order.id },
          data: { status: "HOLD_EXPIRED", stockHoldExpiresAt: null },
        });
        await tx.orderStatusEvent.create({
          data: {
            orderId: order.id,
            fromStatus: order.status,
            toStatus: "HOLD_EXPIRED",
            actor: "system",
            note: "Soft hold expired (no payment proof within 30 min)",
          },
        });
      });
    } catch (e) {
      // Don't let one bad order kill the sweep.
      console.error("releaseExpiredHolds failed for order", order.id, e);
    }
  }
}

export async function POST(request: NextRequest) {
  // Best-effort sweep before processing the new order. Errors are
  // swallowed so a slow sweep doesn't break checkout. (X-04.)
  releaseExpiredHolds().catch((e) => console.error("Sweep failed", e));

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
        if (!round) throw new BadRequest(errorMessage("ROUND_NOT_FOUND"));
        const nowMs = Date.now();
        if (
          round.status !== "OPEN" ||
          round.opensAt.getTime() > nowMs ||
          round.closesAt.getTime() < nowMs
        )
          throw new BadRequest(errorMessage("ROUND_CLOSED"));

        const lineProducts = await tx.roundProduct.findMany({
          where: {
            id: { in: data.items.map((it) => it.roundProductId) },
            roundId,
          },
          include: { product: { select: { name: true } } },
        });

        if (lineProducts.length !== data.items.length) {
          throw new BadRequest(errorMessage("PRODUCT_UNAVAILABLE"));
        }

        const productMap = new Map(lineProducts.map((lp) => [lp.id, lp]));
        let total = 0;
        for (const item of data.items) {
          const lp = productMap.get(item.roundProductId)!;
          const left = lp.stockLimit - lp.stockSold;
          if (item.quantity > left) {
            throw new BadRequest(
              errorMessage("STOCK_INSUFFICIENT", { productName: lp.product.name, left }),
            );
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
        // X-06: COD orders need admin confirmation before they're trusted.
        // X-04: pay-later orders carry a soft-hold timestamp that the
        //       reconciler clears once proof is uploaded.
        const initialStatus =
          data.paymentMethod === "COD" ? "PENDING_CONFIRMATION" : "PENDING_PAYMENT";
        const stockHoldExpiresAt =
          data.paymentMethod === "COD" ? null : new Date(Date.now() + HOLD_WINDOW_MS);

        const order = await tx.order.create({
          data: {
            shortCode,
            roundId,
            customerName: data.customerName,
            customerWhatsApp: data.customerWhatsApp,
            // X-05: data.customerWhatsApp is already normalized by the Zod
            // transform — keep both fields in sync.
            normalizedWhatsApp: data.customerWhatsApp,
            paymentMethod: data.paymentMethod,
            status: initialStatus,
            totalAmount: total,
            notes: data.notes ?? null,
            stockHoldExpiresAt,
            items: {
              create: data.items.map((it) => ({
                roundProductId: it.roundProductId,
                quantity: it.quantity,
                unitPrice: productMap.get(it.roundProductId)!.price,
              })),
            },
            payment: { create: {} },
          },
          select: { id: true, shortCode: true, totalAmount: true, paymentMethod: true },
        });

        await tx.orderStatusEvent.create({
          data: {
            orderId: order.id,
            fromStatus: null,
            toStatus: initialStatus,
            actor: "customer",
            note: "Order created",
          },
        });

        return { ...order, roundTitle: round.title };
      },
      { timeout: 20_000, maxWait: 15_000 },
    );

    revalidatePath("/"); // X-12: stock decremented, refresh storefront cache
    return NextResponse.json({
      ok: true,
      shortCode: result.shortCode,
      totalAmount: result.totalAmount,
      paymentMethod: result.paymentMethod,
      roundTitle: result.roundTitle,
    });
  } catch (e) {
    if (e instanceof BadRequest) {
      return NextResponse.json({ ok: false, error: e.message }, { status: 400 });
    }
    console.error("Order creation failed", e);
    return NextResponse.json({ ok: false, error: errorMessage("UNKNOWN") }, { status: 500 });
  }
}

class BadRequest extends Error {}

// 26 chars, no 0/O/1/I to keep codes easy to read aloud over WhatsApp.
const SHORT_CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
function randomSuffix(len: number): string {
  const bytes = new Uint8Array(len);
  crypto.getRandomValues(bytes);
  let out = "";
  for (let i = 0; i < len; i++) out += SHORT_CODE_ALPHABET[bytes[i] % SHORT_CODE_ALPHABET.length];
  return out;
}

async function nextShortCodeTx(tx: Prisma.TransactionClient): Promise<string> {
  const counter = await tx.orderCounter.upsert({
    where: { id: 1 },
    create: { id: 1, value: 1 },
    update: { value: { increment: 1 } },
  });
  return `LN-${String(counter.value).padStart(4, "0")}-${randomSuffix(5)}`;
}

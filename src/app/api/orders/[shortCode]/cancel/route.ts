import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { errorMessage } from "@/lib/errors";

const CANCEL_WINDOW_MS = 15 * 60 * 1000;

class ConflictError extends Error {}

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ shortCode: string }> },
) {
  const { shortCode } = await params;

  try {
    await prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({
        where: { shortCode },
        include: {
          items: true,
          payment: { select: { proofImageUrl: true } },
        },
      });
      if (!order) throw new ConflictError(errorMessage("ORDER_NOT_FOUND"));
      if (order.status !== "PENDING_PAYMENT") {
        throw new ConflictError(errorMessage("ORDER_NOT_CANCELLABLE"));
      }
      if (order.payment?.proofImageUrl) {
        throw new ConflictError(errorMessage("ORDER_PROOF_ALREADY_UPLOADED"));
      }
      if (Date.now() - order.createdAt.getTime() > CANCEL_WINDOW_MS) {
        throw new ConflictError(errorMessage("CANCEL_WINDOW_EXPIRED"));
      }

      for (const it of order.items) {
        await tx.roundProduct.update({
          where: { id: it.roundProductId },
          data: { stockSold: { decrement: it.quantity } },
        });
      }
      await tx.order.update({
        where: { id: order.id },
        data: { status: "CANCELLED" },
      });
      await tx.orderStatusEvent.create({
        data: {
          orderId: order.id,
          fromStatus: order.status,
          toStatus: "CANCELLED",
          actor: "customer",
          note: "Self-cancel within 15-minute window",
        },
      });
    });
  } catch (e) {
    if (e instanceof ConflictError) {
      return NextResponse.json({ ok: false, error: e.message }, { status: 409 });
    }
    return NextResponse.json({ ok: false, error: errorMessage("UNKNOWN") }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

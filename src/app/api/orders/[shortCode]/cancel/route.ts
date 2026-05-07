import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/db";

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
      if (!order) throw new ConflictError("Pesanan tidak ditemukan.");
      if (order.status !== "PENDING_PAYMENT") {
        throw new ConflictError("Pesanan ini tidak bisa dibatalkan lagi.");
      }
      if (order.payment?.proofImageUrl) {
        throw new ConflictError(
          "Bukti pembayaran sudah diupload. Hubungi admin via WhatsApp untuk membatalkan.",
        );
      }
      if (Date.now() - order.createdAt.getTime() > CANCEL_WINDOW_MS) {
        throw new ConflictError(
          "Sudah lewat 15 menit. Hubungi admin via WhatsApp untuk membatalkan.",
        );
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
    return NextResponse.json(
      { ok: false, error: "Gagal membatalkan pesanan." },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true });
}

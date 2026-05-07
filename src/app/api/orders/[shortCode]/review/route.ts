import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";

const bodySchema = z.object({
  rating: z.coerce.number().int().min(1).max(3),
  comment: z.string().max(500).optional().nullable(),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ shortCode: string }> },
) {
  const { shortCode } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid body" }, { status: 400 });
  }
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "Rating tidak valid" }, { status: 400 });
  }

  const order = await prisma.order.findUnique({
    where: { shortCode },
    select: { id: true, status: true },
  });
  if (!order) {
    return NextResponse.json({ ok: false, error: "Pesanan tidak ditemukan." }, { status: 404 });
  }
  if (order.status !== "DELIVERED") {
    return NextResponse.json(
      { ok: false, error: "Ulasan hanya untuk pesanan yang sudah diantar." },
      { status: 409 },
    );
  }

  // Idempotent — re-submitting overwrites the previous review for the
  // same order. One per order. (Unique index on Review.orderId.)
  await prisma.review.upsert({
    where: { orderId: order.id },
    create: {
      orderId: order.id,
      rating: parsed.data.rating,
      comment: parsed.data.comment?.trim() || null,
    },
    update: {
      rating: parsed.data.rating,
      comment: parsed.data.comment?.trim() || null,
    },
  });

  return NextResponse.json({ ok: true });
}

import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";

const bodySchema = z.object({
  delta: z.number().int().positive().max(100),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const adminEmail = await requireAdmin();
  const { id } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid body" }, { status: 400 });
  }
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "Invalid delta" }, { status: 400 });
  }
  const { delta } = parsed.data;

  try {
    const updated = await prisma.$transaction(async (tx) => {
      const rp = await tx.roundProduct.findUnique({
        where: { id },
        select: { id: true, roundId: true, productId: true, round: { select: { status: true } } },
      });
      if (!rp) throw new Error("Round product not found");
      if (rp.round.status !== "OPEN") {
        throw new Error("Round is not open");
      }
      const next = await tx.roundProduct.update({
        where: { id },
        data: { stockLimit: { increment: delta } },
        select: { stockLimit: true, stockSold: true, product: { select: { name: true } } },
      });
      await tx.stockAdjustment.create({
        data: {
          productId: rp.productId,
          roundId: rp.roundId,
          delta,
          actor: adminEmail,
        },
      });
      return { roundId: rp.roundId, ...next };
    });

    revalidatePath("/admin");
    revalidatePath(`/admin/rounds/${updated.roundId}/edit`);
    return NextResponse.json({
      ok: true,
      productName: updated.product.name,
      stockLimit: updated.stockLimit,
      left: updated.stockLimit - updated.stockSold,
    });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "Failed" },
      { status: 400 },
    );
  }
}

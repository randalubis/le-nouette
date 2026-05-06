"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";

export type ActionResult = { ok: true } | { ok: false; error: string };

const statusSchema = z.enum(["PENDING_PAYMENT", "PAID", "CONFIRMED", "DELIVERED", "CANCELLED"]);

export async function setOrderStatusAction(
  shortCode: string,
  status: z.infer<typeof statusSchema>,
): Promise<ActionResult> {
  const adminEmail = await requireAdmin();
  const parsed = statusSchema.safeParse(status);
  if (!parsed.success) return { ok: false, error: "Invalid status" };

  const order = await prisma.order.findUnique({
    where: { shortCode },
    include: { items: true },
  });
  if (!order) return { ok: false, error: "Pesanan tidak ditemukan." };

  await prisma.$transaction(async (tx) => {
    if (parsed.data === "CANCELLED" && order.status !== "CANCELLED") {
      // Restore stock
      for (const it of order.items) {
        await tx.roundProduct.update({
          where: { id: it.roundProductId },
          data: { stockSold: { decrement: it.quantity } },
        });
      }
    } else if (order.status === "CANCELLED" && parsed.data !== "CANCELLED") {
      // Re-decrement stock if reactivated
      for (const it of order.items) {
        await tx.roundProduct.update({
          where: { id: it.roundProductId },
          data: { stockSold: { increment: it.quantity } },
        });
      }
    }

    await tx.order.update({ where: { id: order.id }, data: { status: parsed.data } });

    if (parsed.data === "PAID") {
      await tx.payment.update({
        where: { orderId: order.id },
        data: { verifiedAt: new Date(), verifiedBy: adminEmail },
      });
    }
  });

  revalidatePath("/admin");
  revalidatePath("/admin/orders");
  revalidatePath(`/admin/orders/${shortCode}`);
  revalidatePath(`/admin/rounds/${order.roundId}/orders`);
  return { ok: true };
}

export async function deleteOrderAction(shortCode: string): Promise<never> {
  await requireAdmin();
  const order = await prisma.order.findUnique({
    where: { shortCode },
    select: { id: true, status: true, roundId: true },
  });
  if (!order) {
    throw new Error("Pesanan tidak ditemukan.");
  }
  if (order.status !== "CANCELLED") {
    throw new Error("Hanya pesanan yang sudah dibatalkan yang bisa dihapus permanen.");
  }
  await prisma.order.delete({ where: { id: order.id } });
  revalidatePath("/admin");
  revalidatePath(`/admin/rounds/${order.roundId}/orders`);
  redirect(`/admin/rounds/${order.roundId}/orders`);
}

export async function bulkMarkDeliveredAction(roundId: string): Promise<ActionResult> {
  await requireAdmin();
  const result = await prisma.order.updateMany({
    where: {
      roundId,
      status: { in: ["PAID", "CONFIRMED"] },
    },
    data: { status: "DELIVERED" },
  });
  revalidatePath("/admin");
  revalidatePath("/admin/orders");
  revalidatePath(`/admin/rounds/${roundId}/orders`);
  return result.count > 0 ? { ok: true } : { ok: false, error: "Tidak ada pesanan untuk ditandai." };
}

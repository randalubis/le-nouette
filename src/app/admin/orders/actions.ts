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

const bulkStatusSchema = z.enum(["CONFIRMED", "CANCELLED"]);

export async function bulkSetOrderStatusAction(
  shortCodes: string[],
  status: z.infer<typeof bulkStatusSchema>,
): Promise<ActionResult> {
  await requireAdmin();
  const parsedStatus = bulkStatusSchema.safeParse(status);
  if (!parsedStatus.success) return { ok: false, error: "Invalid status" };
  if (!Array.isArray(shortCodes) || shortCodes.length === 0) {
    return { ok: false, error: "Tidak ada pesanan yang dipilih." };
  }

  const orders = await prisma.order.findMany({
    where: { shortCode: { in: shortCodes } },
    include: { items: true },
  });
  if (orders.length === 0) return { ok: false, error: "Pesanan tidak ditemukan." };

  let changed = 0;
  let skipped = 0;
  await prisma.$transaction(
    async (tx) => {
      for (const order of orders) {
        if (order.status === parsedStatus.data) {
          skipped++;
          continue;
        }
        if (order.status === "DELIVERED") {
          // Don't move out of a terminal state via bulk action
          skipped++;
          continue;
        }

        const isCancelling = parsedStatus.data === "CANCELLED" && order.status !== "CANCELLED";
        const isReactivating = parsedStatus.data !== "CANCELLED" && order.status === "CANCELLED";

        if (isCancelling) {
          for (const item of order.items) {
            await tx.roundProduct.update({
              where: { id: item.roundProductId },
              data: { stockSold: { decrement: item.quantity } },
            });
          }
        } else if (isReactivating) {
          for (const item of order.items) {
            await tx.roundProduct.update({
              where: { id: item.roundProductId },
              data: { stockSold: { increment: item.quantity } },
            });
          }
        }

        await tx.order.update({
          where: { id: order.id },
          data: { status: parsedStatus.data },
        });
        changed++;
      }
    },
    { timeout: 30_000, maxWait: 15_000 },
  );

  const affectedRoundIds = new Set(orders.map((o) => o.roundId));
  for (const roundId of affectedRoundIds) {
    revalidatePath(`/admin/rounds/${roundId}/orders`);
  }
  revalidatePath("/admin");
  for (const o of orders) {
    revalidatePath(`/admin/orders/${o.shortCode}`);
  }

  if (changed === 0) {
    return {
      ok: false,
      error: skipped > 0 ? "Pesanan terpilih sudah berada di status itu." : "Tidak ada perubahan.",
    };
  }
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

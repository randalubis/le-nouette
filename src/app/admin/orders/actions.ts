"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { Prisma, type OrderStatus } from "@prisma/client";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";

export type ActionResult = { ok: true } | { ok: false; error: string };

const statusSchema = z.enum(["PENDING_PAYMENT", "PAID", "CONFIRMED", "DELIVERED", "CANCELLED"]);

async function logStatusEvent(
  tx: Prisma.TransactionClient,
  args: {
    orderId: string;
    fromStatus: OrderStatus | null;
    toStatus: OrderStatus;
    actor: string;
    note?: string;
  },
) {
  await tx.orderStatusEvent.create({
    data: {
      orderId: args.orderId,
      fromStatus: args.fromStatus ?? undefined,
      toStatus: args.toStatus,
      actor: args.actor,
      note: args.note,
    },
  });
}

export async function setOrderStatusAction(
  shortCode: string,
  status: z.infer<typeof statusSchema>,
): Promise<ActionResult> {
  const adminEmail = await requireAdmin();
  const parsed = statusSchema.safeParse(status);
  if (!parsed.success) return { ok: false, error: "Invalid status" };

  let roundId: string;
  try {
    roundId = await prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({
        where: { shortCode },
        include: { items: true, payment: { select: { proofImageUrl: true } } },
      });
      if (!order) throw new ActionError("Pesanan tidak ditemukan.");

      if (
        parsed.data === "PAID" &&
        order.paymentMethod !== "COD" &&
        !order.payment?.proofImageUrl
      ) {
        throw new ActionError(
          "Tidak bisa tandai PAID tanpa bukti pembayaran. Minta pelanggan upload dulu.",
        );
      }

      if (parsed.data === "CANCELLED" && order.status !== "CANCELLED") {
        for (const it of order.items) {
          await tx.roundProduct.update({
            where: { id: it.roundProductId },
            data: { stockSold: { decrement: it.quantity } },
          });
        }
      } else if (order.status === "CANCELLED" && parsed.data !== "CANCELLED") {
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

      if (order.status !== parsed.data) {
        await logStatusEvent(tx, {
          orderId: order.id,
          fromStatus: order.status,
          toStatus: parsed.data,
          actor: adminEmail,
        });
      }

      return order.roundId;
    });
  } catch (e) {
    if (e instanceof ActionError) return { ok: false, error: e.message };
    throw e;
  }

  revalidatePath("/admin");
  revalidatePath("/admin/orders");
  revalidatePath(`/admin/orders/${shortCode}`);
  revalidatePath(`/admin/rounds/${roundId}/orders`);
  return { ok: true };
}

class ActionError extends Error {}

const bulkStatusSchema = z.enum(["CONFIRMED", "CANCELLED"]);

export async function bulkSetOrderStatusAction(
  shortCodes: string[],
  status: z.infer<typeof bulkStatusSchema>,
): Promise<ActionResult> {
  const adminEmail = await requireAdmin();
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
        await logStatusEvent(tx, {
          orderId: order.id,
          fromStatus: order.status,
          toStatus: parsedStatus.data,
          actor: adminEmail,
          note: "Bulk action",
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
  revalidatePath("/admin/orders");
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

export async function updateAdminNotesAction(
  shortCode: string,
  notes: string,
): Promise<ActionResult> {
  await requireAdmin();
  const trimmed = notes.trim();
  if (trimmed.length > 2000) {
    return { ok: false, error: "Notes too long (max 2000 chars)." };
  }
  const order = await prisma.order.findUnique({
    where: { shortCode },
    select: { id: true, roundId: true },
  });
  if (!order) return { ok: false, error: "Pesanan tidak ditemukan." };

  await prisma.order.update({
    where: { id: order.id },
    data: { adminNotes: trimmed.length > 0 ? trimmed : null },
  });
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
  revalidatePath("/admin/orders");
  revalidatePath(`/admin/rounds/${order.roundId}/orders`);
  redirect(`/admin/rounds/${order.roundId}/orders`);
}

export async function bulkMarkDeliveredAction(roundId: string): Promise<ActionResult> {
  const adminEmail = await requireAdmin();
  const eligible = await prisma.order.findMany({
    where: { roundId, status: { in: ["PAID", "CONFIRMED"] } },
    select: { id: true, status: true },
  });
  if (eligible.length === 0) {
    return { ok: false, error: "Tidak ada pesanan untuk ditandai." };
  }
  await prisma.$transaction(async (tx) => {
    for (const o of eligible) {
      await tx.order.update({ where: { id: o.id }, data: { status: "DELIVERED" } });
      await logStatusEvent(tx, {
        orderId: o.id,
        fromStatus: o.status,
        toStatus: "DELIVERED",
        actor: adminEmail,
        note: "Bulk mark delivered",
      });
    }
  });
  revalidatePath("/admin");
  revalidatePath("/admin/orders");
  revalidatePath(`/admin/rounds/${roundId}/orders`);
  return { ok: true };
}

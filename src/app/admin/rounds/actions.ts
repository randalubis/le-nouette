"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { roundSchema } from "@/lib/validators";
import { uploadImage, deleteImage, pathFromPublicUrl } from "@/lib/storage";

async function maybeUploadQris(formData: FormData): Promise<string | null> {
  const file = formData.get("qris");
  if (!(file instanceof File) || file.size === 0) return null;
  const uploaded = await uploadImage("qris", file);
  return uploaded.url;
}

export type ActionResult = { ok: true } | { ok: false; error: string };

function parseFormData(formData: FormData) {
  const items = JSON.parse(String(formData.get("items") ?? "[]"));
  const trim = (v: FormDataEntryValue | null) => {
    const s = String(v ?? "").trim();
    return s.length > 0 ? s : null;
  };
  return roundSchema.safeParse({
    title: formData.get("title"),
    opensAt: formData.get("opensAt"),
    closesAt: formData.get("closesAt"),
    deliveryDate: formData.get("deliveryDate"),
    bankName: trim(formData.get("bankName")),
    bankAccountNumber: trim(formData.get("bankAccountNumber")),
    bankAccountHolder: trim(formData.get("bankAccountHolder")),
    story: trim(formData.get("story")),
    items,
  });
}

export async function createRoundAction(formData: FormData): Promise<ActionResult> {
  await requireAdmin();
  const parsed = parseFormData(formData);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const { items, ...data } = parsed.data;

  if (data.closesAt <= data.opensAt) {
    return { ok: false, error: "Close time must be after open time." };
  }

  let qrisImageUrl: string | null = null;
  try {
    qrisImageUrl = await maybeUploadQris(formData);
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "QRIS upload failed" };
  }

  await prisma.preorderRound.create({
    data: {
      ...data,
      qrisImageUrl,
      items: {
        create: items.map((it) => ({
          productId: it.productId,
          price: it.price,
          stockLimit: it.stockLimit,
        })),
      },
    },
  });
  revalidatePath("/admin/rounds");
  redirect("/admin/rounds");
}

export async function updateRoundAction(
  id: string,
  formData: FormData,
): Promise<ActionResult> {
  await requireAdmin();
  const parsed = parseFormData(formData);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const { items, ...data } = parsed.data;

  if (data.closesAt <= data.opensAt) {
    return { ok: false, error: "Close time must be after open time." };
  }

  const existingRound = await prisma.preorderRound.findUnique({
    where: { id },
    select: { qrisImageUrl: true },
  });

  let qrisImageUrl: string | null | undefined;
  try {
    const newQris = await maybeUploadQris(formData);
    if (newQris) {
      qrisImageUrl = newQris;
      if (existingRound?.qrisImageUrl) {
        const oldPath = pathFromPublicUrl(existingRound.qrisImageUrl);
        if (oldPath) await deleteImage(oldPath).catch(() => {});
      }
    }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "QRIS upload failed" };
  }

  await prisma.$transaction(async (tx) => {
    await tx.preorderRound.update({
      where: { id },
      data: qrisImageUrl !== undefined ? { ...data, qrisImageUrl } : data,
    });

    const existing = await tx.roundProduct.findMany({ where: { roundId: id } });
    const incomingProductIds = new Set(items.map((it) => it.productId));

    for (const ex of existing) {
      if (!incomingProductIds.has(ex.productId)) {
        if (ex.stockSold > 0) {
          throw new Error("Cannot remove a product that already has orders.");
        }
        await tx.roundProduct.delete({ where: { id: ex.id } });
      }
    }
    for (const it of items) {
      const ex = existing.find((e) => e.productId === it.productId);
      if (ex) {
        if (it.stockLimit < ex.stockSold) {
          throw new Error(
            `Stock limit cannot be lower than already sold (${ex.stockSold}).`,
          );
        }
        await tx.roundProduct.update({
          where: { id: ex.id },
          data: { price: it.price, stockLimit: it.stockLimit },
        });
      } else {
        await tx.roundProduct.create({
          data: { roundId: id, productId: it.productId, price: it.price, stockLimit: it.stockLimit },
        });
      }
    }
  });

  revalidatePath("/admin/rounds");
  redirect("/admin/rounds");
}

const statusSchema = z.enum(["DRAFT", "OPEN", "CLOSED", "DELIVERED", "CANCELLED"]);

export async function setRoundStatusAction(
  id: string,
  status: z.infer<typeof statusSchema>,
): Promise<ActionResult> {
  await requireAdmin();
  const parsed = statusSchema.safeParse(status);
  if (!parsed.success) return { ok: false, error: "Invalid status" };

  if (parsed.data === "OPEN") {
    const otherOpen = await prisma.preorderRound.findFirst({
      where: { status: "OPEN", NOT: { id } },
    });
    if (otherOpen) {
      return { ok: false, error: `Round "${otherOpen.title}" is already open. Close it first.` };
    }
  }

  await prisma.preorderRound.update({ where: { id }, data: { status: parsed.data } });
  revalidatePath("/admin/rounds");
  revalidatePath("/");
  return { ok: true };
}

export async function cancelRoundAction(id: string): Promise<ActionResult> {
  const adminEmail = await requireAdmin();

  const round = await prisma.preorderRound.findUnique({
    where: { id },
    include: {
      orders: {
        where: { status: { not: "CANCELLED" } },
        include: { items: true },
      },
    },
  });
  if (!round) return { ok: false, error: "Round not found." };
  if (round.status === "DELIVERED") {
    return { ok: false, error: "Cannot cancel a delivered round." };
  }

  await prisma.$transaction(async (tx) => {
    for (const order of round.orders) {
      for (const item of order.items) {
        await tx.roundProduct.update({
          where: { id: item.roundProductId },
          data: { stockSold: { decrement: item.quantity } },
        });
      }
      const previous = order.status;
      await tx.order.update({
        where: { id: order.id },
        data: { status: "CANCELLED" },
      });
      await tx.orderStatusEvent.create({
        data: {
          orderId: order.id,
          fromStatus: previous,
          toStatus: "CANCELLED",
          actor: adminEmail,
          note: "Round cancelled",
        },
      });
    }
    await tx.preorderRound.update({ where: { id }, data: { status: "CANCELLED" } });
  });

  revalidatePath("/admin");
  revalidatePath("/admin/rounds");
  revalidatePath(`/admin/rounds/${id}/orders`);
  revalidatePath("/");
  return { ok: true };
}

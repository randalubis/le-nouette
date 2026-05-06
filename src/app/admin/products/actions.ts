"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { uploadImage, deleteImage, pathFromPublicUrl } from "@/lib/storage";
import { productSchema } from "@/lib/validators";

export type ActionResult = { ok: true } | { ok: false; error: string };

export async function createProductAction(formData: FormData): Promise<ActionResult> {
  await requireAdmin();

  const file = formData.get("image");
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, error: "Product image is required." };
  }

  const parsed = productSchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description") || null,
    basePrice: formData.get("basePrice"),
    isActive: formData.get("isActive") === "on",
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  let imageUrl: string;
  try {
    const uploaded = await uploadImage("products", file);
    imageUrl = uploaded.url;
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Upload failed" };
  }

  await prisma.product.create({ data: { ...parsed.data, imageUrl } });
  revalidatePath("/admin/products");
  redirect("/admin/products");
}

export async function updateProductAction(
  id: string,
  formData: FormData,
): Promise<ActionResult> {
  await requireAdmin();

  const parsed = productSchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description") || null,
    basePrice: formData.get("basePrice"),
    isActive: formData.get("isActive") === "on",
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const existing = await prisma.product.findUnique({ where: { id } });
  if (!existing) return { ok: false, error: "Not found" };

  let imageUrl = existing.imageUrl;
  const file = formData.get("image");
  if (file instanceof File && file.size > 0) {
    try {
      const uploaded = await uploadImage("products", file);
      imageUrl = uploaded.url;
      const oldPath = pathFromPublicUrl(existing.imageUrl);
      if (oldPath) await deleteImage(oldPath).catch(() => {});
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : "Upload failed" };
    }
  }

  await prisma.product.update({ where: { id }, data: { ...parsed.data, imageUrl } });
  revalidatePath("/admin/products");
  redirect("/admin/products");
}

export async function archiveProductAction(id: string): Promise<ActionResult> {
  await requireAdmin();
  const schema = z.string().min(1);
  if (!schema.safeParse(id).success) return { ok: false, error: "Invalid id" };

  await prisma.product.update({ where: { id }, data: { isActive: false } });
  revalidatePath("/admin/products");
  return { ok: true };
}

export async function activateProductAction(id: string): Promise<ActionResult> {
  await requireAdmin();
  await prisma.product.update({ where: { id }, data: { isActive: true } });
  revalidatePath("/admin/products");
  return { ok: true };
}

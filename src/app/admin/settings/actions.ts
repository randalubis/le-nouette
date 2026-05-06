"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { upsertBusinessSettings } from "@/lib/settings";

export type ActionResult = { ok: true } | { ok: false; error: string };

const settingsSchema = z.object({
  businessName: z.string().min(1).max(100),
  whatsappNumber: z
    .string()
    .max(20)
    .regex(/^[\d+\s-]*$/u, "Hanya angka, +, spasi, atau tanda hubung")
    .optional()
    .or(z.literal("")),
  deliveryLocation: z.string().max(200).optional().or(z.literal("")),
  aboutBlurb: z.string().max(500).optional().or(z.literal("")),
});

export async function updateBusinessSettingsAction(
  formData: FormData,
): Promise<ActionResult> {
  await requireAdmin();
  const parsed = settingsSchema.safeParse({
    businessName: String(formData.get("businessName") ?? ""),
    whatsappNumber: String(formData.get("whatsappNumber") ?? ""),
    deliveryLocation: String(formData.get("deliveryLocation") ?? ""),
    aboutBlurb: String(formData.get("aboutBlurb") ?? ""),
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  await upsertBusinessSettings(parsed.data);
  revalidatePath("/admin/settings");
  revalidatePath("/admin");
  revalidatePath("/");
  return { ok: true };
}

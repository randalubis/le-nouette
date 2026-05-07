import { prisma } from "@/lib/db";
import { env } from "@/lib/env";
import { normalizeWhatsApp } from "@/lib/utils";

// L-11: shape of the per-method FAQ overrides stored on
// BusinessSettings.faqAnswers (JSONB). Any missing key falls back to the
// hardcoded default in src/lib/faq.ts. Adminless for now — the field is
// schema-ready so the operator can edit via a future Settings UI without
// another migration.
export type FaqOverrides = {
  qris?: { check?: string; rejected?: string; wrongAmount?: string; online?: string };
  cod?: { method?: string; fee?: string; absent?: string };
};

export type BusinessSettings = {
  businessName: string;
  whatsappNumber: string;
  deliveryLocation: string;
  aboutBlurb: string;
  typicalCadence: string;
  faqAnswers: FaqOverrides | null;
};

const DEFAULTS: BusinessSettings = {
  businessName: "Le Nouette",
  whatsappNumber: "",
  deliveryLocation: "",
  aboutBlurb: "",
  typicalCadence: "",
  faqAnswers: null,
};

/**
 * Read the BusinessSettings row, with fallbacks:
 *   1. DB row fields (if present)
 *   2. Env var fallback for whatsappNumber (legacy)
 *   3. Sensible defaults
 *
 * Always returns a populated object — callers don't need to handle null.
 */
export async function getBusinessSettings(): Promise<BusinessSettings> {
  const row = await prisma.businessSettings.findUnique({ where: { id: 1 } });
  const envWa = env.businessWhatsApp();
  return {
    businessName: row?.businessName?.trim() || DEFAULTS.businessName,
    whatsappNumber: normalizeWhatsApp(row?.whatsappNumber?.trim() || envWa),
    deliveryLocation: row?.deliveryLocation?.trim() ?? DEFAULTS.deliveryLocation,
    aboutBlurb: row?.aboutBlurb?.trim() ?? DEFAULTS.aboutBlurb,
    typicalCadence: row?.typicalCadence?.trim() ?? DEFAULTS.typicalCadence,
    faqAnswers: (row?.faqAnswers as FaqOverrides | null) ?? null,
  };
}

export async function upsertBusinessSettings(
  patch: Partial<Omit<BusinessSettings, never>>,
): Promise<BusinessSettings> {
  const data = {
    businessName: patch.businessName?.trim() || DEFAULTS.businessName,
    whatsappNumber: patch.whatsappNumber?.trim() || null,
    deliveryLocation: patch.deliveryLocation?.trim() || null,
    aboutBlurb: patch.aboutBlurb?.trim() || null,
    typicalCadence: patch.typicalCadence?.trim() || null,
  };
  await prisma.businessSettings.upsert({
    where: { id: 1 },
    create: { id: 1, ...data },
    update: data,
  });
  return getBusinessSettings();
}

import "server-only";

import { eq } from "drizzle-orm";
import { db } from "./client";
import { companySettings } from "./schema";
import type { InvoiceCompany } from "@/lib/domain/invoice";

export const emptyCompany: InvoiceCompany = { name: "Le Nouette", phone: "", email: "", address: "", instagram: "", paymentInfo: "", footerNote: "", signatureName: "", logoBase64: null, logoMime: null };

export async function getSettings(): Promise<InvoiceCompany> {
  const [row] = await db.select().from(companySettings).where(eq(companySettings.id, 1));
  if (!row) return emptyCompany;
  const { id, ...company } = row;
  void id;
  return company;
}

// Upsert the single row. Pass logo fields only when the logo changes (undefined = keep, null = remove).
export async function saveSettings(patch: Partial<InvoiceCompany>): Promise<void> {
  await db.insert(companySettings).values({ id: 1, ...patch }).onConflictDoUpdate({ target: companySettings.id, set: patch });
}

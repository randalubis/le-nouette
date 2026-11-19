import "server-only";

import { desc, sql } from "drizzle-orm";
import { db } from "./client";
import { buyers } from "./schema";
import { buyerDisplayPhone, buyerKey, searchPattern } from "@/lib/domain/buyers";

export type BuyerHit = { id: number; name: string; phone: string; address: string };

// Phone is the identity. No valid phone or no name: nothing is stored (the invoice itself still saves).
// A known phone keeps its stored name (one mistyped digit must not rename another customer) and takes the newest address;
// an empty address never erases a stored one. Callers wrap this in try/catch; a directory failure must not fail an invoice.
export async function upsertBuyer(input: { name: string; phone: string; address: string }): Promise<void> {
  const phone = buyerKey(input.phone);
  const name = input.name.trim();
  if (!phone || !name) return;
  await db.insert(buyers).values({ name, phone, address: input.address }).onConflictDoUpdate({
    target: buyers.phone,
    set: { updatedAt: sql`now()`, address: sql`case when excluded.address = '' then ${buyers.address} else excluded.address end` },
  });
}

// Prefix match on lower(name) (served by buyers_name_prefix_idx), newest first, max 8. Phone comes back in the 08... form.
export async function searchBuyers(query: string): Promise<BuyerHit[]> {
  const pattern = searchPattern(query);
  if (!pattern) return [];
  const rows = await db.select().from(buyers).where(sql`lower(${buyers.name}) like ${pattern} escape '\\'`).orderBy(desc(buyers.updatedAt)).limit(8);
  return rows.map((r) => ({ id: r.id, name: r.name, phone: buyerDisplayPhone(r.phone), address: r.address }));
}

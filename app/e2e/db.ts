import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "../src/lib/db/schema";
import { diffAndWrite } from "../src/lib/db/diff-and-write";
import { loadState } from "../src/lib/db/load-state";
import * as op from "../src/lib/domain/operations";

export const E2E_URL = "postgres://localhost:5432/le_nouette_e2e";
export const MARKER_DATE = "2099-01-01"; // calendar row proving the app server reads the e2e DB

/** Hard guard: only a localhost database named le_nouette_e2e is ever touched. */
export function assertLocalE2eDb(url = process.env.DATABASE_URL) {
  let u: URL;
  try { u = new URL(url ?? ""); } catch { throw new Error("e2e: DATABASE_URL missing/invalid"); }
  if (!["localhost", "127.0.0.1"].includes(u.hostname) || u.pathname !== "/le_nouette_e2e")
    throw new Error(`e2e: refusing to run, DATABASE_URL must be localhost/le_nouette_e2e (got host=${u.hostname} db=${u.pathname})`);
}

/** Truncate every app table, then seed baseline: stock received, store OPEN, one marker calendar row. */
export async function resetDb() {
  assertLocalE2eDb(E2E_URL);
  const sql = postgres(E2E_URL, { max: 1 });
  try {
    await sql.unsafe(`truncate table orders, order_items, payments, movements, reservations, calendar_dates, store_status, audit_events, ready_product_movements restart identity cascade`);
    const db = drizzle(sql, { schema });
    const stock = [["raw_cheese", 211500], ["jar", 34], ["pouch", 118], ["sticker_square_milieu", 23], ["sticker_square_grande", 23], ["sticker_round", 18], ["jar_seal", 42]] as const;
    const now = new Date();
    let s = stock.reduce((acc, [item, qty]) => op.receiveStock(acc, item, qty, new Date(now.getTime() - 7 * 86_400_000)), op.emptyState());
    s = op.setDateStatus(s, MARKER_DATE, "HOLIDAY", now);
    await db.transaction(async (tx) => { await diffAndWrite(tx, await loadState(tx), s); });
  } finally { await sql.end(); }
}

// Realistic fake data for the LOCAL dev DB (le_nouette_dev). Run via `npm run dev:db` / `dev:db:reset`.
// Refuses any non-localhost DATABASE_URL; --reset additionally requires the db to be named le_nouette_dev.
import { sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { diffAndWrite } from "@/lib/db/diff-and-write";
import { loadState } from "@/lib/db/load-state";
import { createInvoice, setInvoicePaid } from "@/lib/db/invoices";
import { assertLocalDb } from "@/lib/db/local-guard";
import { getSettings, saveSettings } from "@/lib/db/settings";
import { buildInvoiceFromOrder } from "@/lib/domain/invoice";
import * as op from "@/lib/domain/operations";
import { addDays, jakartaNow } from "@/lib/domain/schedule";

const H = 3_600_000, D = 24 * H;

function buildState(now: Date): op.State {
  const ago = (ms: number) => new Date(now.getTime() - ms);
  // Stock covers every reservation (raw cheese ~48 packs worth ~ 8 kg); only pouch ends up low, so Beranda shows one low-stock row.
  const stock = [["raw_cheese", 800000], ["jar", 40], ["pouch", 14], ["sticker_square_milieu", 40], ["sticker_square_grande", 30], ["sticker_round", 40], ["jar_seal", 40]] as const;
  let s = stock.reduce((acc, [item, qty]) => op.receiveStock(acc, item, qty, ago(14 * D)), op.emptyState());

  let n = 0;
  const mk = (name: string, fulfillment: op.Fulfillment, quantities: op.CreateOrderInput["quantities"], age: number, extra: { address?: string; note?: string } = {}) => {
    n += 1;
    const id = `LN-${String(s.seq + 1).padStart(4, "0")}`;
    s = op.createOrder(s, { idempotencyKey: `dev-${n}`, publicToken: `dev-token-${n}`, name, whatsapp: `08123456${String(n).padStart(4, "0")}`, fulfillment, quantities, ...extra }, ago(age));
    return id;
  };
  const addr = (street: string) => `${street}, Jakarta Selatan`;

  // Oldest first.
  const a = mk("Rizky Mahendra", "PICKUP_BI", { milieu: 1 }, 6 * D);
  s = op.markOrderReady(s, a, ago(5 * D)); s = op.completeOrder(op.recordPayment(s, a, "TRANSFER", ago(5 * D)), a, ago(5 * D));
  const b = mk("Harry Sofri", "PICKUP_MANDIRI", { milieu: 2, grande: 1 }, 6 * D);
  s = op.markOrderReady(s, b, ago(5 * D)); s = op.completeOrder(s, b, ago(5 * D)); // completed unpaid = piutang
  const c = mk("Dina Prameswari", "DELIVERY", { grande: 2 }, 5 * D, { address: addr("Jl. Kemang Raya 10") });
  s = op.markOrderReady(s, c, ago(4 * D)); s = op.recordPayment(s, c, "QRIS", ago(4 * D));
  s = op.dispatchOrder(s, c, ago(2 * H)); s = op.completeOrder(s, c, ago(2 * H)); // dispatch guard needs today >= ready date, which varies with weekday/holidays
  s = op.setReferral(s, c, "dev-token-3", "INSTAGRAM", "@dina.p");
  const d = mk("Maya Anggraini", "PICKUP_BI", { milieu: 2 }, 4 * D);
  s = op.cancelOrder(op.recordPayment(s, d, "TRANSFER", ago(4 * D)), d, ago(3 * D)); // refund due
  const e = mk("Bagus Santoso", "PICKUP_MANDIRI", { grande: 1 }, 4 * D);
  s = op.cancelOrder(s, e, ago(3 * D));
  const f = mk("Citra Lestari", "DELIVERY", { milieu: 3 }, 4 * D, { address: addr("Jl. Wijaya II No. 7"), note: "Titip di satpam" });
  s = op.markOrderReady(s, f, ago(2 * D)); s = op.recordPayment(s, f, "TRANSFER", ago(2 * D)); s = op.dispatchOrder(s, f, ago(2 * H));
  s = op.setReferral(s, f, "dev-token-6", "TEMAN_KELUARGA", "Maya");
  const g = mk("Andi Wirawan", "DELIVERY", { milieu: 1, grande: 1 }, 4 * D, { address: addr("Jl. Senopati 21") });
  s = op.markOrderReady(s, g, ago(2 * D)); s = op.dispatchOrder(s, g, ago(2 * H), { allowUnpaid: true });
  const h = mk("Fitri Handayani", "DELIVERY", { milieu: 2 }, 4 * D, { address: addr("Jl. Tebet Barat IV No. 3") });
  s = op.markOrderReady(s, h, ago(2 * D));
  const i = mk("Galih Pratama", "PICKUP_BI", { grande: 2 }, 3 * D);
  s = op.markOrderReady(s, i, ago(1 * D));
  const j = mk("Nadia Putri", "PICKUP_MANDIRI", { milieu: 1 }, 3 * D);
  s = op.markOrderReady(s, j, ago(1 * D));
  const k = mk("Yoga Permana", "PICKUP_BI", { milieu: 1, grande: 1 }, 3 * D);
  s = op.markOrderReady(s, k, ago(1 * D)); s = op.recordPayment(s, k, "QRIS", ago(20 * H));
  s = op.setReferral(s, k, "dev-token-11", "WHATSAPP", "");
  const l = mk("Sinta Maharani", "PICKUP_BI", { milieu: 2 }, 3 * H);
  s = op.recordPayment(s, l, "TRANSFER", ago(2 * H));
  mk("Dewi Kusuma", "PICKUP_MANDIRI", { grande: 1 }, 2 * H);
  mk("Erlangga Putra", "DELIVERY", { milieu: 1, grande: 2 }, 1 * H, { address: addr("Jl. Cipete Raya 15"), note: "Tanpa sambal ya" });
  const h2 = mk("Hendra Gunawan", "DELIVERY", { grande: 1 }, 4 * D, { address: addr("Jl. Pondok Indah 8") });
  s = op.markOrderReady(s, h2, ago(2 * D)); // second unshipped delivery card, ready date reached: two-card bulk select

  // Ready-to-sell extra packed units (after the orders so they are not auto-allocated to them).
  s = op.recordExtraPacked(s, "milieu", 3, ago(6 * H), "Sisa produksi");
  s = op.recordExtraPacked(s, "grande", 2, ago(5 * H));

  const today = jakartaNow(now).date;
  s = op.setDateStatus(s, addDays(today, 9), "HOLIDAY", now);
  s = op.setDateStatus(s, addDays(today, 16), "UNAVAILABLE", now);
  return s;
}

async function seedInvoices(now: Date) {
  await saveSettings({
    name: "Le Nouette", phone: "081234560000", email: "halo@lenouette.local", address: "Jl. Contoh No. 1, Jakarta Selatan",
    instagram: "@lenouette.dev", paymentInfo: "Transfer BCA 000-000-0000 a.n. Le Nouette (contoh)", footerNote: "Terima kasih telah memesan di Le Nouette.", signatureName: "Founder Le Nouette",
  });
  const company = await getSettings();
  const today = jakartaNow(now).date;
  const state = await loadState(db);
  const linked = state.orders.find((o) => o.customer.name === "Galih Pratama")!;
  await createInvoice({ ...buildInvoiceFromOrder(linked, company), orderId: linked.id, issuedAt: addDays(today, -1), dueDate: addDays(today, 6), company });
  const manual = (buyerName: string, buyerPhone: string, qty: number, issuedAt: string) => ({
    buyerName, buyerPhone, buyerAddress: "Jl. Contoh Bisnis No. 5, Jakarta", deliveryFee: 0, paid: 0, notes: company.footerNote, orderId: null, issuedAt, dueDate: addDays(issuedAt, 7), company,
    lines: [{ name: "Milieu", description: "Cheese Stick 125gr dalam toples", quantity: qty, unitPrice: 50000, discount: 0, taxPercent: 0 }],
  });
  const paid = await createInvoice(manual("Kopi Senja Cafe", "081234560090", 12, addDays(today, -10)));
  await setInvoicePaid(paid.id, { method: "TRANSFER", orderPaymentId: null });
  await createInvoice(manual("Ibu Ratna Dewi", "081234560091", 6, addDays(today, -3)));
}

async function main() {
  assertLocalDb(process.env.DATABASE_URL);
  const reset = process.argv.includes("--reset");
  if (reset && new URL(process.env.DATABASE_URL!).pathname !== "/le_nouette_dev") throw new Error("--reset only runs against the le_nouette_dev database.");
  if (reset) {
    await db.execute(sql`truncate table orders, order_items, payments, movements, reservations, calendar_dates, store_status, audit_events, ready_product_movements, invoices, invoice_counters, company_settings restart identity cascade`);
  } else if ((await loadState(db)).orders.length > 0) {
    console.log("Dev database already has orders - skipping seed (use npm run dev:db:reset for a fresh seed).");
    return;
  }
  const now = new Date();
  await db.transaction(async (tx) => { await diffAndWrite(tx, await loadState(tx), buildState(now)); });
  await seedInvoices(now);
  console.log("Seeded dev data.");
}

main().then(() => process.exit(0), (e) => { console.error(e instanceof Error ? e.message : e); process.exit(1); });

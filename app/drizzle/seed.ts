import { db } from "@/lib/db/client";
import { diffAndWrite } from "@/lib/db/diff-and-write";
import { loadState } from "@/lib/db/load-state";
import * as op from "@/lib/domain/operations";

function seed(now: Date): op.State {
  const hours = (h: number) => new Date(now.getTime() - h * 3_600_000);
  const stock = [["raw_cheese", 211500], ["jar", 34], ["pouch", 118], ["sticker_square", 46], ["sticker_round", 18], ["jar_seal", 42]] as const;
  let s = stock.reduce((acc, [item, qty]) => op.receiveStock(acc, item, qty, hours(24 * 7)), op.emptyState());
  s = op.createOrder(s, { idempotencyKey: "seed-1", name: "Rizky Mahendra", whatsapp: "081234560001", fulfillment: "PICKUP_BI", quantities: { milieu: 1 } }, hours(24 * 6));
  s = op.completeBatch(s, s.orders[0].currentReadyDate, hours(24 * 4));
  s = op.completeOrder(op.recordPayment(s, "LN-0001", "TRANSFER", hours(24 * 4)), "LN-0001", hours(24 * 4));
  s = op.createOrder(s, { idempotencyKey: "seed-2", name: "Harry Sofri", whatsapp: "081234560002", fulfillment: "PICKUP_MANDIRI", quantities: { milieu: 2, grande: 1 } }, hours(3));
  s = op.createOrder(s, { idempotencyKey: "seed-3", name: "Dina Prameswari", whatsapp: "081234560003", fulfillment: "PICKUP_BI", quantities: { milieu: 1 } }, hours(2));
  s = op.recordPayment(s, "LN-0003", "QRIS", hours(2));
  s = op.createOrder(s, { idempotencyKey: "seed-4", name: "Andi Wirawan", whatsapp: "081234560004", fulfillment: "DELIVERY", address: "Jl. Kemang Raya 10, Jakarta Selatan", quantities: { milieu: 1, grande: 1 } }, hours(1));
  return s;
}

async function main() {
  const empty = await loadState(db);
  if (empty.orders.length > 0) {
    console.log("Database already has orders — skipping seed. Truncate first if you want a fresh seed.");
    process.exit(0);
  }
  await db.transaction(async (tx) => {
    await diffAndWrite(tx, empty, seed(new Date()));
  });
  console.log("Seeded.");
}

main().then(() => process.exit(0));

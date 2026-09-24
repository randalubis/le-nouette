// Acceptance checks from tech spec §19. Run: npm test
import assert from "node:assert/strict";
import { test } from "node:test";
import * as op from "./operations.ts";
import { promisedReadyDate, recommendReschedule } from "./schedule.ts";

// Monday 14 Sep 2026. `wib(day, time)` builds an instant in Asia/Jakarta.
const wib = (date: string, time = "10:00") => new Date(`${date}T${time}:00+07:00`);

test("§19.1 weekday mapping and 18:00 WIB cutoff", () => {
  assert.equal(promisedReadyDate(wib("2026-09-14"), {}), "2026-09-16"); // Mon → Wed
  assert.equal(promisedReadyDate(wib("2026-09-15"), {}), "2026-09-17"); // Tue → Thu
  assert.equal(promisedReadyDate(wib("2026-09-16"), {}), "2026-09-18"); // Wed → Fri
  for (const day of ["2026-09-17", "2026-09-18", "2026-09-19", "2026-09-20"]) assert.equal(promisedReadyDate(wib(day), {}), "2026-09-21"); // Thu–Sun → Mon
  assert.equal(promisedReadyDate(wib("2026-09-14", "17:59"), {}), "2026-09-16");
  assert.equal(promisedReadyDate(wib("2026-09-14", "18:00"), {}), "2026-09-17");
  assert.equal(promisedReadyDate(wib("2026-09-20", "17:59"), {}), "2026-09-21");
  assert.equal(promisedReadyDate(wib("2026-09-20", "18:00"), {}), "2026-09-23");
});

test("§19.1 holidays: in-between ignored, blocked target moves forward", () => {
  assert.equal(promisedReadyDate(wib("2026-09-15"), { "2026-09-16": "HOLIDAY" }), "2026-09-17");
  assert.equal(promisedReadyDate(wib("2026-09-16"), { "2026-09-18": "UNAVAILABLE" }), "2026-09-21");
});

test("§8.5 reschedule recommendation: forward ≤3 days, else nearest earlier, else none", () => {
  assert.equal(recommendReschedule("2026-09-18", { "2026-09-18": "HOLIDAY" }, "2026-09-14"), "2026-09-21");
  const longBreak = { "2026-09-16": "HOLIDAY", "2026-09-17": "HOLIDAY", "2026-09-18": "HOLIDAY", "2026-09-21": "HOLIDAY" } as const;
  assert.equal(recommendReschedule("2026-09-16", longBreak, "2026-09-14"), "2026-09-15");
  assert.equal(recommendReschedule("2026-09-16", longBreak, "2026-09-16"), null);
});

const order = (overrides: Partial<op.CreateOrderInput> = {}): op.CreateOrderInput => ({
  idempotencyKey: "k1", name: "Dina", whatsapp: "0812 3456 7890", fulfillment: "PICKUP_MANDIRI", quantities: { milieu: 2, grande: 1 }, ...overrides,
});

test("§19.2 order reserves exact recipe quantities without touching on-hand", () => {
  const state = op.createOrder(op.emptyState(), order(), wib("2026-09-14"));
  const reserved = Object.fromEntries(op.balances(state).map((b) => [b.id, b.reserved]));
  assert.deepEqual(reserved, { raw_cheese: 47500, jar: 2, pouch: 1, sticker_square: 3, sticker_round: 2, jar_seal: 2 });
  assert.ok(op.balances(state).every((b) => b.onHand === 0));
  assert.equal(state.orders[0].total, 170000);
});

test("§19.2 duplicate submit, cancel releases, validation, pause", () => {
  let state = op.createOrder(op.emptyState(), order(), wib("2026-09-14"));
  assert.equal(op.createOrder(state, order(), wib("2026-09-14")), state);
  state = op.cancelOrder(state, "LN-0001", wib("2026-09-14"));
  assert.ok(op.balances(state).every((b) => b.reserved === 0));
  assert.doesNotThrow(() => op.createOrder(op.emptyState(), order({ note: "é".repeat(180) }), wib("2026-09-14")));
  assert.throws(() => op.createOrder(op.emptyState(), order({ note: "é".repeat(181) }), wib("2026-09-14")), op.DomainError);
  assert.throws(() => op.createOrder(op.emptyState(), order({ fulfillment: "DELIVERY" }), wib("2026-09-14")), /Alamat/);
  const paused = op.setStoreStatus(op.emptyState(), "PAUSED", wib("2026-09-14"));
  assert.throws(() => op.createOrder(paused, order(), wib("2026-09-14")), /ditutup/);
});

test("§19.3 whole-batch packing consumes reservations once", () => {
  let state = op.receiveStock(op.emptyState(), "raw_cheese", 100000, wib("2026-09-14"));
  state = op.createOrder(state, order(), wib("2026-09-14"));
  state = op.completeBatch(state, "2026-09-16", wib("2026-09-16"));
  const cheese = op.balances(state)[0];
  assert.deepEqual([cheese.onHand, cheese.reserved], [100000 - 47500, 0]);
  assert.equal(state.orders[0].status, "READY_FOR_HANDOVER");
  assert.throws(() => op.completeBatch(state, "2026-09-16", wib("2026-09-16")), op.DomainError);
});

test("§19.5 delivery needs payment and ready date before dispatch; pickup may complete unpaid", () => {
  let state = op.createOrder(op.emptyState(), order({ fulfillment: "DELIVERY", address: "Jl. Sudirman 1" }), wib("2026-09-14"));
  state = op.completeBatch(state, "2026-09-16", wib("2026-09-15"));
  assert.throws(() => op.dispatchOrder(state, "LN-0001", wib("2026-09-16")), /lunas/);
  state = op.recordPayment(state, "LN-0001", "QRIS", wib("2026-09-15"));
  assert.throws(() => op.dispatchOrder(state, "LN-0001", wib("2026-09-15")), /dijadwalkan/);
  state = op.completeOrder(op.dispatchOrder(state, "LN-0001", wib("2026-09-16")), "LN-0001", wib("2026-09-16"));
  assert.equal(state.orders[0].status, "COMPLETED");

  let pickup = op.completeBatch(op.createOrder(op.emptyState(), order(), wib("2026-09-14")), "2026-09-16", wib("2026-09-16"));
  pickup = op.completeOrder(pickup, "LN-0001", wib("2026-09-16"));
  assert.equal(op.receivable(pickup.orders[0]), 170000);
});

test("bulk dispatch: succeeds atomically for valid selection, rejects and changes nothing on a mixed one", () => {
  let state = op.createOrder(op.emptyState(), order({ idempotencyKey: "k1", fulfillment: "DELIVERY", address: "Jl. Sudirman 1" }), wib("2026-09-14"));
  state = op.createOrder(state, order({ idempotencyKey: "k2", fulfillment: "DELIVERY", address: "Jl. Sudirman 2" }), wib("2026-09-14"));
  state = op.createOrder(state, order({ idempotencyKey: "k3" }), wib("2026-09-14")); // pickup, not a valid bulk-dispatch target
  state = op.completeBatch(state, "2026-09-16", wib("2026-09-16"));
  state = op.recordPayment(state, "LN-0001", "QRIS", wib("2026-09-16"));
  state = op.recordPayment(state, "LN-0002", "QRIS", wib("2026-09-16"));

  const before = state;
  assert.throws(() => op.dispatchOrders(before, new Set(["LN-0001", "LN-0002", "LN-0003"]), wib("2026-09-16")), /LN-0003/);
  assert.ok(before.orders.every((o) => !o.dispatchedAt)); // rejected selection left the original state untouched

  state = op.dispatchOrders(before, new Set(["LN-0001", "LN-0002"]), wib("2026-09-16"));
  assert.ok(state.orders.filter((o) => o.id === "LN-0001" || o.id === "LN-0002").every((o) => o.dispatchedAt));
  assert.equal(state.orders.find((o) => o.id === "LN-0003")!.dispatchedAt, undefined);
});

test("§10.6 stock opname posts an adjustment; blocking a date with orders is rejected", () => {
  let state = op.receiveStock(op.emptyState(), "jar", 34, wib("2026-09-14"));
  state = op.stockOpname(state, "jar", 31, wib("2026-09-14"));
  assert.deepEqual(state.movements.map((m) => m.delta), [34, -3]);
  state = op.createOrder(state, order(), wib("2026-09-14"));
  assert.throws(() => op.setDateStatus(state, "2026-09-16", "HOLIDAY", wib("2026-09-14")), /Pindahkan/);
  state = op.rescheduleOrder(state, "LN-0001", "2026-09-17", wib("2026-09-14"));
  state = op.setDateStatus(state, "2026-09-16", "HOLIDAY", wib("2026-09-14"));
  assert.deepEqual([state.orders[0].promisedReadyDate, state.orders[0].currentReadyDate], ["2026-09-16", "2026-09-17"]);
});

// ---------- §19.8 Product Ready to Sell ----------

const stocked = () => {
  let state = op.emptyState();
  for (const [id, qty] of [["raw_cheese", 1_000_000], ["jar", 100], ["pouch", 100], ["sticker_square", 100], ["sticker_round", 100], ["jar_seal", 100]] as const) state = op.receiveStock(state, id, qty, wib("2026-09-14"));
  return state;
};
const onHand = (state: op.State) => Object.fromEntries(op.balances(state).map((b) => [b.id, b.onHand]));
const reservedOf = (state: op.State) => Object.fromEntries(op.balances(state).map((b) => [b.id, b.reserved]));

test("§19.8 (47) extra recorded under one SKU consumes recipe atomically; negative on-hand rejected untouched", () => {
  const base = stocked();
  const state = op.recordExtraPacked(base, "milieu", 2, wib("2026-09-14"), "salah isi");
  assert.equal(onHand(state).jar, 98);
  assert.equal(onHand(state).raw_cheese, 1_000_000 - 2 * 12500);
  assert.equal(onHand(state).pouch, 100);
  assert.equal(state.readyMovements.length, 1);
  assert.deepEqual([state.readyMovements[0].productId, state.readyMovements[0].delta, state.readyMovements[0].type], ["milieu", 2, "EXTRA_PACKED"]);
  const poor = op.receiveStock(op.emptyState(), "jar", 5, wib("2026-09-14"));
  assert.throws(() => op.recordExtraPacked(poor, "milieu", 1, wib("2026-09-14")), op.DomainError);
  assert.deepEqual(poor.readyMovements, []);
  assert.equal(poor.movements.length, 1);
});

test("§19.8 (48) new order allocates oldest first; reserves only uncovered remainder; fully covered is ready", () => {
  let state = op.recordExtraPacked(stocked(), "milieu", 1, wib("2026-09-14"));
  state = op.recordExtraPacked(state, "milieu", 2, wib("2026-09-15"));
  state = op.createOrder(state, order({ quantities: { milieu: 2, grande: 1 } }), wib("2026-09-16"));
  const [a, b] = state.readyMovements.filter((m) => m.type === "EXTRA_PACKED");
  const allocs = state.readyMovements.filter((m) => m.type === "ALLOCATED_TO_ORDER");
  assert.deepEqual(allocs.map((m) => [m.sourceId, m.delta, m.orderId]), [[a.id, -1, "LN-0001"], [b.id, -1, "LN-0001"]]);
  assert.equal(state.orders[0].items.find((i) => i.productId === "milieu")!.readyQuantity, 2);
  assert.equal(state.orders[0].status, "NEEDS_PREPARATION"); // grande uncovered
  assert.deepEqual(reservedOf(state), { raw_cheese: 22500, jar: 0, pouch: 1, sticker_square: 1, sticker_round: 0, jar_seal: 0 });

  const full = op.createOrder(state, order({ idempotencyKey: "k2", quantities: { milieu: 1 } }), wib("2026-09-16"));
  assert.equal(full.orders[1].status, "READY_FOR_HANDOVER");
  assert.ok(full.orders[1].readyAt);
  assert.deepEqual(reservedOf(full), reservedOf(state));
});

test("§19.8 (48b) fully covered order is ready today and can be dispatched same day", () => {
  let state = op.recordExtraPacked(stocked(), "milieu", 1, wib("2026-09-14"));
  state = op.createOrder(state, order({ fulfillment: "DELIVERY", address: "Jl. A", quantities: { milieu: 1 } }), wib("2026-09-16"));
  assert.deepEqual([state.orders[0].promisedReadyDate, state.orders[0].currentReadyDate], ["2026-09-16", "2026-09-16"]);
  state = op.recordPayment(state, "LN-0001", "CASH", wib("2026-09-16"));
  assert.ok(op.dispatchOrder(state, "LN-0001", wib("2026-09-16")).orders[0].dispatchedAt);
  assert.throws(() => op.setDateStatus(state, "2026-09-16", "UNAVAILABLE", wib("2026-09-16")), op.DomainError);
});

test("§19.8 (48c) FIFO sorts by instant, not by offset string", () => {
  let state = op.emptyState();
  const src = (id: string, packedAt: string): op.ReadyMovement => ({ id, productId: "milieu", delta: 1, type: "EXTRA_PACKED", at: packedAt, packedAt, expiresOn: "2026-12-01" });
  // 01:00Z is earlier than 09:00+07 (=02:00Z) though it sorts later as a string.
  state = { ...state, readyMovements: [src("RM-1", "2026-09-14T09:00:00+07:00"), src("RM-2", "2026-09-14T01:00:00Z")] };
  assert.deepEqual(op.readySources(state, "milieu", wib("2026-09-14")).map((s) => s.sourceId), ["RM-2", "RM-1"]);
});

test("§19.8 (49) cancelling restores allocation through append-only reversal", () => {
  let state = op.recordExtraPacked(stocked(), "milieu", 2, wib("2026-09-14"));
  state = op.createOrder(state, order({ quantities: { milieu: 2 } }), wib("2026-09-15"));
  const before = state.readyMovements;
  state = op.cancelOrder(state, "LN-0001", wib("2026-09-15"));
  assert.deepEqual(state.readyMovements.slice(0, before.length), before);
  const reversal = state.readyMovements.slice(before.length);
  assert.deepEqual(reversal.map((m) => [m.type, m.delta, m.sourceId]), [["REVERSAL", 2, before[0].id]]);
  assert.equal(op.readyBalances(state, wib("2026-09-15")).find((r) => r.productId === "milieu")!.available, 2);
});

test("§19.8 (50) expiry is +1 calendar month from Jakarta packing date; expired source never allocated", () => {
  // 31 Jan 20:00 UTC is already 1 Feb in Jakarta; 1 Feb + 1 month = 1 Mar
  let state = op.recordExtraPacked(stocked(), "milieu", 1, new Date("2026-01-31T20:00:00Z"));
  assert.equal(state.readyMovements[0].expiresOn, "2026-03-01");
  state = op.recordExtraPacked(state, "grande", 1, wib("2026-01-31", "10:00"));
  assert.equal(state.readyMovements[1].expiresOn, "2026-02-28"); // clamped
  // Milieu source expires 1 Mar: usable that day, not after.
  const ok = op.createOrder(state, order({ quantities: { milieu: 1 } }), wib("2026-03-01"));
  assert.equal(ok.orders[0].items[0].readyQuantity, 1);
  const late = op.createOrder(state, order({ quantities: { milieu: 1 } }), wib("2026-03-02"));
  assert.equal(late.orders[0].items[0].readyQuantity ?? 0, 0);
  assert.equal(late.orders[0].status, "NEEDS_PREPARATION");
  const expired = op.readyBalances(late, wib("2026-03-02")).find((r) => r.productId === "milieu")!;
  assert.deepEqual([expired.available, expired.expired], [0, 1]);
  const written = op.adjustReady(late, state.readyMovements[0].id, 1, "kedaluwarsa", wib("2026-03-02"));
  assert.equal(op.readyBalances(written, wib("2026-03-02")).find((r) => r.productId === "milieu")!.expired, 0);
  assert.throws(() => op.adjustReady(written, state.readyMovements[0].id, 1, "", wib("2026-03-02")), op.DomainError);
});

test("raw cheese is one pooled stock: 5 supplier packs (1,125 g) cover exactly 9 Milieu jars", () => {
  const state = op.createOrder(op.receiveStock(op.emptyState(), "raw_cheese", 5 * 22500, wib("2026-09-14")), order({ quantities: { milieu: 9 } }), wib("2026-09-14"));
  const cheese = op.balances(state).find((b) => b.id === "raw_cheese")!;
  assert.equal(cheese.reserved, 9 * 12500);
  assert.equal(cheese.available, 0);
});

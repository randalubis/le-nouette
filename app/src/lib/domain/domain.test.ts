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
  assert.deepEqual(reserved, { raw_cheese: 48816, jar: 2, pouch: 1, sticker_square: 3, sticker_round: 2, jar_seal: 2 });
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
  assert.deepEqual([cheese.onHand, cheese.reserved], [100000 - 48816, 0]);
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

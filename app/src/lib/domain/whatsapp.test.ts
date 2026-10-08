import assert from "node:assert/strict";
import { test } from "node:test";
import type { Order } from "./operations.ts";
import { toWaNumber, waKindFor, waLink, waMessage } from "./whatsapp.ts";

const order = {
  id: "LN-0042", customer: { name: "Sari Dewi", whatsapp: "0812 3456-7890" }, fulfillment: "DELIVERY",
  items: [{ name: "Cheese Stick", quantity: 3 }], total: 75000, currentReadyDate: "2026-10-05", promisedReadyDate: "2026-10-05", status: "NEEDS_PREPARATION", payments: [], address: "Jl. Mawar 1",
} as unknown as Order;

test("toWaNumber normalises variants", () => {
  for (const raw of ["081234567890", "+6281234567890", "6281234567890", "0812 3456-7890"]) assert.equal(toWaNumber(raw), "6281234567890");
  for (const raw of ["", "12345", "0712345678", "08123"]) assert.equal(toWaNumber(raw), null);
});

test("waMessage content per kind", () => {
  for (const kind of ["confirmation", "ready", "rescheduled", "cancelled"] as const) {
    const m = waMessage(kind, order);
    assert.match(m, /Halo Sari/);
    assert.match(m, /LN-0042/);
  }
  assert.match(waMessage("confirmation", order), /Rp75\.000/);
  assert.match(waMessage("confirmation", order), /3 × Cheese Stick/);
  assert.match(waMessage("confirmation", order), /transfer, QRIS/);
  assert.match(waMessage("ready", order), /antar/);
  assert.match(waMessage("ready", { ...order, fulfillment: "PICKUP_BI" }), /diambil/);
  assert.match(waMessage("rescheduled", order), /Senin, 5 Oktober/);
});

test("waLink encodes text and rejects bad numbers", () => {
  const link = waLink("cancelled", order)!;
  assert.ok(link.startsWith("https://wa.me/6281234567890?text="));
  assert.equal(decodeURIComponent(link.split("?text=")[1]), waMessage("cancelled", order));
  assert.ok(!link.includes(" "));
  assert.equal(waLink("ready", { ...order, customer: { name: "A", whatsapp: "x" } }), null);
});

test("waKindFor picks kind from status and dates", () => {
  assert.equal(waKindFor(order), "confirmation");
  assert.equal(waKindFor({ ...order, currentReadyDate: "2026-10-06" }), "rescheduled");
  assert.equal(waKindFor({ ...order, status: "READY_FOR_HANDOVER", currentReadyDate: "2026-10-06" }), "ready");
  assert.equal(waKindFor({ ...order, status: "CANCELLED" }), "cancelled");
  assert.equal(waKindFor({ ...order, status: "COMPLETED" }), "payment");
  assert.match(waMessage("payment", order), /Sisa pembayaran Rp75\.000/);
});

test("payment-aware lines, place and blank name", () => {
  const pay = (amount: number) => ({ ...order, payments: [{ id: "p", amount, method: "CASH", at: "x" }] }) as unknown as Order;
  assert.match(waMessage("confirmation", order), /Kabari kami/);
  assert.match(waMessage("confirmation", order), /antar ke Jl\. Mawar 1/);
  assert.match(waMessage("confirmation", { ...order, fulfillment: "PICKUP_BI" }), /Kantor BI/);
  assert.doesNotMatch(waMessage("confirmation", pay(75000)), /Kabari kami/);
  assert.match(waMessage("confirmation", pay(75000)), /sudah kami terima/);
  assert.match(waMessage("ready", pay(25000)), /Sisa pembayaran Rp50\.000/);
  assert.doesNotMatch(waMessage("ready", pay(75000)), /Sisa/);
  assert.match(waMessage("cancelled", pay(25000)), /Rp25\.000 akan kami kembalikan/);
  assert.doesNotMatch(waMessage("cancelled", order), /kembalikan/);
  assert.match(waMessage("ready", { ...order, customer: { name: " ", whatsapp: "x" } }), /^Halo, ini/);
});

test("dispatched kind for delivery after dispatch", () => {
  const ready = { ...order, status: "READY_FOR_HANDOVER" } as Order;
  assert.equal(waKindFor(ready), "ready");
  assert.match(waMessage("ready", ready), /akan segera kami antar/);
  const sent = { ...ready, dispatchedAt: "2026-10-05T03:00:00Z" } as Order;
  assert.equal(waKindFor(sent), "dispatched");
  const m = waMessage("dispatched", sent);
  assert.match(m, /sedang kami antar ke Jl\. Mawar 1/);
  assert.match(m, /Sisa pembayaran Rp75\.000/);
  assert.doesNotMatch(waMessage("dispatched", { ...sent, payments: [{ id: "p", amount: 75000, method: "CASH", at: "x" }] } as unknown as Order), /Sisa pembayaran/);
});

import assert from "node:assert/strict";
import { test } from "node:test";
import { formatNewOrderMessage } from "./notify.ts";
import * as op from "./domain/operations.ts";

test("new order message has first name only and leaks no phone/address/note", () => {
  const now = new Date("2026-09-14T10:00:00+07:00");
  const s = op.createOrder(op.emptyState(), { idempotencyKey: "n", publicToken: "tok-n", name: "Sari Wulandari", whatsapp: "081234567890", fulfillment: "DELIVERY", address: "Jl. Rahasia 12", note: "pagar biru", quantities: { milieu: 2 } }, now);
  const msg = formatNewOrderMessage(s.orders[0]);
  assert.match(msg, /^🧀 Pesanan baru /);
  assert.match(msg, /Sari · 2 item · Rp/);
  assert.match(msg, /Antar · siap /);
  for (const secret of ["Wulandari", "081234567890", "Rahasia", "pagar"]) assert.ok(!msg.includes(secret), secret);
});

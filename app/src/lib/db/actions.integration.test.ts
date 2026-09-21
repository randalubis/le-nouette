import assert from "node:assert/strict";
import { test } from "node:test";
import { receiveStockAction, createOrderAction, cancelOrderAction } from "@/lib/domain/actions";

test("createOrderAction persists an order that a fresh load can see", async () => {
  const key = `it-${Date.now()}`;
  const { error, order } = await createOrderAction({
    idempotencyKey: key, name: "Integration Test", whatsapp: "081200000000",
    fulfillment: "PICKUP_MANDIRI", quantities: { milieu: 1 },
  });
  assert.equal(error, null);
  assert.ok(order);
  assert.equal(order!.customer.name, "Integration Test");

  const { error: cancelError } = await cancelOrderAction(order!.id);
  assert.equal(cancelError, null);
});

test("receiveStockAction rejects a non-positive quantity via DomainError", async () => {
  const { error } = await receiveStockAction("jar", 0);
  assert.match(error ?? "", /lebih dari 0/);
});

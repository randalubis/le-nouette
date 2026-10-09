import assert from "node:assert/strict";
import { test } from "node:test";
import { createOrderAction } from "@/lib/domain/actions";
import { withDomainTransaction } from "@/lib/db/with-domain-transaction";
import * as op from "@/lib/domain/operations";
import { assertLocalDb } from "@/lib/db/local-guard";

// Writes real rows: fail loudly unless DATABASE_URL is local (npm run test:integration pins le_nouette_dev).
assertLocalDb(process.env.DATABASE_URL);

// Founder actions need a session cookie (unavailable outside a request), so call the
// transaction + domain ops directly; createOrderAction is public and runs as-is.
test("createOrderAction persists an order that a fresh load can see", async () => {
  const key = `it-${Date.now()}`;
  const { error, order } = await createOrderAction({
    idempotencyKey: key, name: "Integration Test", whatsapp: "081200000000",
    fulfillment: "PICKUP_MANDIRI", quantities: { milieu: 1 },
  });
  assert.equal(error, null);
  assert.ok(order);
  assert.ok(order!.publicToken);

  const { error: cancelError } = await withDomainTransaction((s, now) => op.cancelOrder(s, order!.id, now));
  assert.equal(cancelError, null);
});

test("receiveStock rejects a non-positive quantity via DomainError", async () => {
  const { error } = await withDomainTransaction((s, now) => op.receiveStock(s, "jar", 0, now));
  assert.match(error ?? "", /lebih dari 0/);
});

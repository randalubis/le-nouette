import assert from "node:assert/strict";
import { test } from "node:test";
import { createOrderAction } from "@/lib/domain/actions";
import { withDomainTransaction } from "@/lib/db/with-domain-transaction";
import * as op from "@/lib/domain/operations";
import { assertLocalDb } from "@/lib/db/local-guard";
import { inArray } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { buyers } from "@/lib/db/schema";
import { searchBuyers, upsertBuyer } from "@/lib/db/buyers";

// Writes real rows: fail loudly unless DATABASE_URL is local (npm run test:integration pins le_nouette_dev).
assertLocalDb(process.env.DATABASE_URL);

// Founder actions need a session cookie (unavailable outside a request), so call the
// transaction + domain ops directly; createOrderAction is public and runs as-is.
test("createOrderAction persists an order that a fresh load can see", async () => {
  const key = `it-${Date.now()}`;
  const { error, order } = await createOrderAction({
    idempotencyKey: key, name: "Integration Test", whatsapp: "081200000000",
    fulfillment: "PICKUP", quantities: { milieu: 1 },
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

// Buyer directory (0.26.0). Unique test phones; each test removes its own rows.
// Clean by the exact test phones (never by name) so a real buyer in the dev DB can never be touched.
const TEST_PHONES = ["6281200000001", "6281200000100", ...Array.from({ length: 10 }, (_, i) => `62812000002${String(i).padStart(2, "0")}`)];
const cleanBuyers = () => db.delete(buyers).where(inArray(buyers.phone, TEST_PHONES));

test("upsertBuyer: one row per person across phone spellings, latest address wins, empty address keeps old", async () => {
  await cleanBuyers();
  await upsertBuyer({ name: "ZZT Sari", phone: "0812-0000-0001", address: "Jl. Lama 1" });
  await upsertBuyer({ name: "ZZT Sari", phone: "+62 812 0000 0001", address: "Jl. Baru 2" });
  let hits = await searchBuyers("zzt sari");
  assert.equal(hits.length, 1);
  assert.deepEqual([hits[0].phone, hits[0].address], ["081200000001", "Jl. Baru 2"]);
  await upsertBuyer({ name: "ZZT Sari", phone: "081200000001", address: "" });
  hits = await searchBuyers("zzt sari");
  assert.equal(hits[0].address, "Jl. Baru 2");
  await cleanBuyers();
});

test("upsertBuyer: a different name on a known phone keeps the stored name", async () => {
  await cleanBuyers();
  await upsertBuyer({ name: "ZZT Asli", phone: "081200000001", address: "Jl. A" });
  await upsertBuyer({ name: "ZZT Salah Ketik", phone: "081200000001", address: "Jl. B" });
  const hits = await searchBuyers("zzt");
  assert.deepEqual(hits.map((h) => [h.name, h.address]), [["ZZT Asli", "Jl. B"]]);
  await cleanBuyers();
});

test("upsertBuyer: empty or invalid phone writes nothing", async () => {
  await cleanBuyers();
  await upsertBuyer({ name: "ZZT NoPhone", phone: "", address: "x" });
  await upsertBuyer({ name: "ZZT BadPhone", phone: "123", address: "x" });
  assert.deepEqual(await searchBuyers("zzt nophone"), []);
  assert.deepEqual(await searchBuyers("zzt badphone"), []);
});

test("searchBuyers: under 2 chars is empty, wildcards match literally, max 8 hits", async () => {
  await cleanBuyers();
  assert.deepEqual(await searchBuyers("z"), []);
  await upsertBuyer({ name: "ZZT 100% Test", phone: "0812-0000-0100", address: "" });
  assert.equal((await searchBuyers("zzt 100%")).length, 1);
  assert.equal((await searchBuyers("zzt 100_")).length, 0);
  assert.equal((await searchBuyers("zzt %")).length, 0); // a bare % is literal, not match-all
  for (let i = 0; i < 10; i++) await upsertBuyer({ name: `ZZT Many ${i}`, phone: `0812000002${String(i).padStart(2, "0")}`, address: "" });
  assert.equal((await searchBuyers("zzt many")).length, 8);
  await cleanBuyers();
});

// Acceptance §19.6 items 38, 41: export gates run before any DB access; no secrets in export columns.
import assert from "node:assert/strict";
import { afterEach, beforeEach, test } from "node:test";
import { csvDatasetOrError, exportAuthError } from "./export-guard.ts";
import { datasets } from "./export.ts";
import { createSessionCookieValue } from "./founder-auth.ts";

const prev = process.env.ADMIN_SESSION_SECRET;
beforeEach(() => { process.env.ADMIN_SESSION_SECRET = "test-secret"; });
afterEach(() => {
  if (prev === undefined) delete process.env.ADMIN_SESSION_SECRET;
  else process.env.ADMIN_SESSION_SECRET = prev;
});

test("no cookie or bad cookie -> 401 (csv and xlsx gates)", () => {
  for (const cookie of [undefined, "", "garbage", "founder.9999999999999.deadbeef"]) {
    assert.equal(exportAuthError(cookie)?.status, 401);
    const csv = csvDatasetOrError(cookie, "orders");
    assert.ok(csv instanceof Response && csv.status === 401);
  }
});

test("valid cookie passes xlsx gate; csv rejects invalid dataset with 400, accepts known", () => {
  const cookie = createSessionCookieValue();
  assert.equal(exportAuthError(cookie), null);
  for (const bad of [null, "", "nope", "__proto__", "constructor"]) {
    const r = csvDatasetOrError(cookie, bad);
    assert.ok(r instanceof Response && r.status === 400, String(bad));
  }
  assert.equal(csvDatasetOrError(cookie, "orders"), "orders");
});

test("§19.6 (41) no export column looks like a secret (publicToken excluded)", () => {
  for (const [key, d] of Object.entries(datasets)) {
    for (const col of d.columns) assert.ok(!/password|secret|token|session|hash/i.test(col), `${key}.${col}`);
  }
});

import assert from "node:assert/strict";
import { test } from "node:test";
import { buyerDisplayPhone, buyerKey, searchPattern } from "./buyers.ts";

test("buyerKey: every phone spelling of one person gives one key; invalid is null", () => {
  assert.equal(buyerKey("0812-3456-7890"), "6281234567890");
  assert.equal(buyerKey("+62 812 3456 7890"), "6281234567890");
  assert.equal(buyerKey("6281234567890"), "6281234567890");
  assert.equal(buyerKey(""), null);
  assert.equal(buyerKey("12345"), null);
});

test("buyerDisplayPhone: key back to local 08 form", () => {
  assert.equal(buyerDisplayPhone("6281234567890"), "081234567890");
});

test("searchPattern: needs 2 characters, lowercases, escapes LIKE wildcards, appends prefix %", () => {
  assert.equal(searchPattern("a"), null);
  assert.equal(searchPattern("  "), null);
  assert.equal(searchPattern("Bu Sari"), "bu sari%");
  assert.equal(searchPattern("50%_x\\"), "50\\%\\_x\\\\%");
});

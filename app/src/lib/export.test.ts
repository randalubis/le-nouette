import assert from "node:assert/strict";
import { test } from "node:test";
import { datasetKeys, datasetTable, toCsv } from "./export.ts";
import * as op from "./domain/operations.ts";

const now = new Date("2026-09-14T10:00:00+07:00");
let state = op.emptyState();
state = op.createOrder(state, { idempotencyKey: "a", name: 'Sari "Mama", Jr', whatsapp: "081234567890", fulfillment: "PICKUP_MANDIRI", quantities: { milieu: 2, grande: 1 } }, now);
state = op.createOrder(state, { idempotencyKey: "b", name: "Sari", whatsapp: "081234567890", fulfillment: "PICKUP_MANDIRI", quantities: { milieu: 1 } }, now);

test("CSV quotes, doubles quotes, uses CRLF and BOM", () => {
  const csv = toCsv([["a", "b"], ['x,"y"', "line\nbreak"], [null, 3]]);
  assert.equal(csv, '﻿a,b\r\n"x,""y""","line\nbreak"\r\n,3\r\n');
});

test("row counts from state fixture", () => {
  const count = (key: (typeof datasetKeys)[number]) => datasetTable(key, state).length - 1;
  assert.equal(count("orders"), 2);
  assert.equal(count("order-items"), 3);
  assert.equal(count("customers"), 1); // same WhatsApp
  assert.equal(count("payments"), 0);
  assert.equal(count("inventory-balances"), 6);
  for (const key of datasetKeys) {
    const [header, ...rows] = datasetTable(key, state);
    assert.ok(rows.every((r) => r.length === header.length), key);
  }
});

test("CSV neutralises formula injection in text cells only", () => {
  const csv = toCsv([["a"], ["=1+1"], ["+62"], ["-x"], ["@SUM"], ["\tx"], ["\rx"], [-5], ["safe"]]);
  assert.equal(csv, "\ufeffa\r\n'=1+1\r\n'+62\r\n'-x\r\n'@SUM\r\n'\tx\r\n\"'\rx\"\r\n-5\r\nsafe\r\n");
});

test("phone columns are forced to text; other columns and header untouched", () => {
  const csv = toCsv([["customer_whatsapp", "customer_name"], ["081234567890", "0abc"], ["+6281", "x"]]);
  assert.equal(csv, "\ufeffcustomer_whatsapp,customer_name\r\n'081234567890,0abc\r\n'+6281,x\r\n");
});

import assert from "node:assert/strict";
import { test } from "node:test";
import { datasetKeys, datasetTable, exportFilename, parseDateParam, safeText, toCsv } from "./export.ts";
import * as op from "./domain/operations.ts";

const now = new Date("2026-09-14T10:00:00+07:00");
let state = op.emptyState();
state = op.createOrder(state, { idempotencyKey: "a", publicToken: "tok-"+"a", name: 'Sari "Mama", Jr', whatsapp: "081234567890", fulfillment: "PICKUP_MANDIRI", quantities: { milieu: 2, grande: 1 } }, now);
state = op.createOrder(state, { idempotencyKey: "b", publicToken: "tok-"+"b", name: "Sari", whatsapp: "081234567890", fulfillment: "PICKUP_MANDIRI", quantities: { milieu: 1 } }, now);

test("orders export includes referral columns", () => {
  const s = op.setReferral(state, state.orders[0].id, "tok-a", "INSTAGRAM", "@sari");
  const [h, ...rows] = datasetTable("orders", s);
  const [src, nm] = [h.indexOf("referral_source"), h.indexOf("referral_name")];
  assert.deepEqual([rows[0][src], rows[0][nm], rows[1][src], rows[1][nm]], ["INSTAGRAM", "@sari", null, null]);
});

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

test("formula-like names are quoted; negative numbers stay numeric", () => {
  assert.equal(toCsv([["customer_name", "amount"], ['=HYPERLINK("x")', -5000]]), '\ufeffcustomer_name,amount\r\n"\'=HYPERLINK(""x"")",-5000\r\n');
  assert.equal(safeText("=1+1"), "'=1+1"); // xlsx path
  assert.equal(safeText(-5), -5);
  assert.equal(safeText(null), null);
});

test("orders export carries referral_source/referral_name", () => {
  let s = op.createOrder(op.emptyState(), { idempotencyKey: "x1", publicToken: "tok-x1", name: "A", whatsapp: "081234567890", fulfillment: "PICKUP_MANDIRI", quantities: { milieu: 1 } }, new Date("2026-09-14T03:00:00Z"));
  s = op.setReferral(s, s.orders[0].id, "tok-x1", "INSTAGRAM", "=Budi");
  const [h, r] = datasetTable("orders", s);
  assert.equal(r[h.indexOf("referral_source")], "INSTAGRAM");
  assert.equal(r[h.indexOf("referral_name")], "=Budi");
  assert.match(toCsv([h, r]), /,INSTAGRAM,'=Budi,/);
});

test("phone columns are forced to text; other columns and header untouched", () => {
  const csv = toCsv([["customer_whatsapp", "customer_name"], ["081234567890", "0abc"], ["+6281", "x"]]);
  assert.equal(csv, "\ufeffcustomer_whatsapp,customer_name\r\n'081234567890,0abc\r\n'+6281,x\r\n");
});

// --- date-range filter (WIB) ---
const at = (iso: string) => new Date(iso);
let r = op.emptyState();
const mk = (k: string, wa: string, when: string) => { r = op.createOrder(r, { idempotencyKey: k, publicToken: "tok-" + k, name: k, whatsapp: wa, fulfillment: "PICKUP_MANDIRI", quantities: { milieu: 1 } }, at(when)); };
mk("late", "081111111111", "2026-09-10T23:30:00+07:00"); // 10 Sep WIB
mk("early", "082222222222", "2026-09-11T00:30:00+07:00"); // 11 Sep WIB (17:30 UTC on 10th)
mk("later", "081111111111", "2026-09-20T12:00:00+07:00");
r = op.recordPayment(r, r.orders[0].id, "CASH", at("2026-09-25T09:00:00+07:00"));
const ids = (key: (typeof datasetKeys)[number], from?: string, to?: string) => datasetTable(key, r, from, to).slice(1).map((x) => x[0]);

test("range is inclusive and WIB-based", () => {
  assert.equal(ids("orders", "2026-09-10", "2026-09-10").length, 1);
  assert.equal(ids("orders", "2026-09-11", "2026-09-11").length, 1);
  assert.equal(ids("orders", "2026-09-10", "2026-09-11").length, 2);
});
test("one-sided, empty, reversed and invalid ranges", () => {
  assert.equal(ids("orders", "2026-09-11").length, 2);
  assert.equal(ids("orders", undefined, "2026-09-10").length, 1);
  assert.equal(ids("orders", "2027-01-01", "2027-01-02").length, 0);
  assert.equal(ids("orders", "2026-09-30", "2026-09-01").length, 0); // from > to = empty
  assert.equal(ids("orders", "garbage", "2026-02-30").length, 3);
  assert.equal(parseDateParam("2026-9-1"), undefined);
});
test("customers follow orders; payments by paid date; snapshots unfiltered", () => {
  assert.equal(ids("customers", "2026-09-11", "2026-09-19").length, 1);
  assert.equal(ids("payments", "2026-09-25", "2026-09-25").length, 1); // order was created outside range
  assert.equal(ids("payments", "2026-09-01", "2026-09-24").length, 0);
  assert.equal(ids("inventory-balances", "2027-01-01", "2027-01-02").length, 6);
  assert.equal(ids("ready-balances", "2027-01-01", "2027-01-02").length, datasetTable("ready-balances", r).length - 1);
});
test("customers in range keep full-history stats", () => {
  const rows = datasetTable("customers", r, "2026-09-20", "2026-09-20").slice(1);
  assert.equal(rows.length, 1);
  assert.equal(rows[0][2], 2); // order_count: repeat customer, not 1
  assert.equal(rows[0][4], r.orders[0].createdAt); // first_order_at from full history
});
test("filename: range replaces export date; all-history unchanged", () => {
  assert.equal(exportFilename("all", "2026-10-01", "xlsx"), "le-nouette-all-2026-10-01.xlsx");
  assert.equal(exportFilename("orders", "2026-10-01", "csv", "2026-09-01", undefined), "le-nouette-orders_2026-09-01_sd_akhir.csv");
  assert.equal(exportFilename("orders", "2026-10-01", "csv", undefined, "2026-09-30"), "le-nouette-orders_awal_sd_2026-09-30.csv");
  assert.equal(exportFilename("orders", "2026-10-01", "csv", "2026-09-01", "2026-10-01"), "le-nouette-orders_2026-09-01_sd_2026-10-01.csv");
  assert.equal(exportFilename("all", "2026-10-01", "xlsx", "2026-09-01", "2026-09-30"), "le-nouette-all_2026-09-01_sd_2026-09-30.xlsx");
});

// Portable business-data export (docs/technical/notifications-and-reporting.md §17.1).
// Pure: State in, rows out. Adding a dataset = one entry in `datasets`.
// Never put auth/env data here; State contains none.
import { amountPaid, balances, readyBalances, receivable, type State } from "./domain/operations.ts";

export type Cell = string | number | null;
type Dataset = { sheet: string; columns: string[]; rows: (state: State) => Cell[][] };

const dt = (value?: string) => value ?? null;

export const datasets = {
  orders: {
    sheet: "Orders",
    columns: ["order_id", "created_at", "customer_name", "customer_whatsapp", "fulfillment", "address", "note", "status", "total", "amount_paid", "receivable", "promised_ready_date", "current_ready_date", "ready_at", "dispatched_at", "completed_at", "cancelled_at"],
    rows: (s) => s.orders.map((o) => [o.id, o.createdAt, o.customer.name, o.customer.whatsapp, o.fulfillment, o.address ?? null, o.note ?? null, o.status, o.total, amountPaid(o), receivable(o), o.promisedReadyDate, o.currentReadyDate, dt(o.readyAt), dt(o.dispatchedAt), dt(o.completedAt), dt(o.cancelledAt)]),
  },
  "order-items": {
    sheet: "Order Items",
    columns: ["order_id", "product_id", "product_name", "unit_price", "quantity", "line_total"],
    rows: (s) => s.orders.flatMap((o) => o.items.map((i) => [o.id, i.productId, i.name, i.unitPrice, i.quantity, i.unitPrice * i.quantity])),
  },
  customers: {
    sheet: "Customers",
    columns: ["customer_whatsapp", "customer_name", "order_count", "total_ordered", "first_order_at", "last_order_at"],
    // Derived from orders, keyed by WhatsApp; name from the latest order.
    rows: (s) => {
      const byPhone = new Map<string, { name: string; count: number; total: number; first: string; last: string }>();
      for (const o of [...s.orders].sort((a, b) => a.createdAt.localeCompare(b.createdAt))) {
        const c = byPhone.get(o.customer.whatsapp);
        byPhone.set(o.customer.whatsapp, { name: o.customer.name, count: (c?.count ?? 0) + 1, total: (c?.total ?? 0) + (o.status === "CANCELLED" ? 0 : o.total), first: c?.first ?? o.createdAt, last: o.createdAt });
      }
      return [...byPhone].map(([phone, c]) => [phone, c.name, c.count, c.total, c.first, c.last]);
    },
  },
  payments: {
    sheet: "Payments",
    columns: ["payment_id", "order_id", "amount", "method", "paid_at", "reversed_at"],
    rows: (s) => s.orders.flatMap((o) => o.payments.map((p) => [p.id, o.id, p.amount, p.method, p.at, dt(p.reversedAt)])),
  },
  "inventory-movements": {
    sheet: "Inventory Movements",
    columns: ["movement_id", "item_id", "delta", "reason", "at", "ref"],
    rows: (s) => s.movements.map((m) => [m.id, m.itemId, m.delta, m.reason, m.at, m.ref ?? null]),
  },
  "inventory-balances": {
    sheet: "Inventory Balances",
    columns: ["item_id", "name", "on_hand", "reserved", "available", "threshold"],
    rows: (s) => balances(s).map((b) => [b.id, b.name, b.onHand, b.reserved, b.available, b.threshold]),
  },
  "ready-movements": {
    sheet: "Ready Product Movements",
    columns: ["movement_id", "product_id", "delta", "type", "at", "packed_at", "expires_on", "order_id", "source_id", "note"],
    rows: (s) => s.readyMovements.map((m) => [m.id, m.productId, m.delta, m.type, m.at, m.packedAt ?? null, m.expiresOn ?? null, m.orderId ?? null, m.sourceId ?? null, m.note ?? null]),
  },
  "ready-balances": {
    sheet: "Ready Product Balances",
    columns: ["product_id", "name", "available", "expired"],
    rows: (s) => readyBalances(s, new Date()).map((b) => [b.productId, b.name, b.available, b.expired]),
  },
  availability: {
    sheet: "Availability Calendar",
    columns: ["date", "status"],
    rows: (s) => Object.entries(s.calendar).sort(([a], [b]) => a.localeCompare(b)).map(([date, status]) => [date, status]),
  },
} satisfies Record<string, Dataset>;

export type DatasetKey = keyof typeof datasets;
export const datasetKeys = Object.keys(datasets) as DatasetKey[];
export const isDatasetKey = (value: string | null): value is DatasetKey => value !== null && Object.hasOwn(datasets, value);

export const datasetTable = (key: DatasetKey, state: State): Cell[][] => [datasets[key].columns, ...(datasets[key] as Dataset).rows(state)];

// Text cells starting with a formula trigger get a leading ' (OWASP CSV injection); numbers are untouched.
// Phone columns always get it so Excel keeps the leading 0 / +62 as text.
const csvCell = (cell: Cell, forceText = false) => {
  if (cell === null) return "";
  let text = String(cell);
  if (typeof cell === "string" && (forceText || /^[=+\-@\t\r]/.test(text))) text = `'${text}`;
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};

// RFC 4180 rows joined by \r\n, UTF-8 BOM so Excel opens Indonesian text correctly.
// The first row is the header; columns named customer_whatsapp are written as text.
export const toCsv = (table: Cell[][]) => {
  const phone = new Set(table[0]?.flatMap((h, i) => (h === "customer_whatsapp" ? [i] : [])));
  return "﻿" + table.map((row, r) => row.map((cell, i) => csvCell(cell, r > 0 && phone.has(i))).join(",")).join("\r\n") + "\r\n";
};

export const exportFilename = (key: DatasetKey | "all", date: string, ext: "csv" | "xlsx") => `le-nouette-${key}-${date}.${ext}`;

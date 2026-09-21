import { pgTable, text, integer, timestamp, jsonb, serial, date, index } from "drizzle-orm/pg-core";

export const orders = pgTable("orders", {
  id: text("id").primaryKey(),
  idempotencyKey: text("idempotency_key").notNull().unique(),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "string" }).notNull(),
  customerName: text("customer_name").notNull(),
  customerWhatsapp: text("customer_whatsapp").notNull(),
  fulfillment: text("fulfillment").notNull(),
  address: text("address"),
  note: text("note"),
  total: integer("total").notNull(),
  promisedReadyDate: date("promised_ready_date", { mode: "string" }).notNull(),
  currentReadyDate: date("current_ready_date", { mode: "string" }).notNull(),
  status: text("status").notNull(),
  readyAt: timestamp("ready_at", { withTimezone: true, mode: "string" }),
  dispatchedAt: timestamp("dispatched_at", { withTimezone: true, mode: "string" }),
  completedAt: timestamp("completed_at", { withTimezone: true, mode: "string" }),
  cancelledAt: timestamp("cancelled_at", { withTimezone: true, mode: "string" }),
});

export const orderItems = pgTable("order_items", {
  id: serial("id").primaryKey(),
  orderId: text("order_id").notNull().references(() => orders.id),
  productId: text("product_id").notNull(),
  name: text("name").notNull(),
  unitPrice: integer("unit_price").notNull(),
  quantity: integer("quantity").notNull(),
  recipe: jsonb("recipe").notNull().$type<Partial<Record<string, number>>>(),
}, (table) => [index("order_items_order_id_idx").on(table.orderId)]);

export const payments = pgTable("payments", {
  id: text("id").primaryKey(),
  orderId: text("order_id").notNull().references(() => orders.id),
  amount: integer("amount").notNull(),
  method: text("method").notNull(),
  at: timestamp("at", { withTimezone: true, mode: "string" }).notNull(),
  reversedAt: timestamp("reversed_at", { withTimezone: true, mode: "string" }),
}, (table) => [index("payments_order_id_idx").on(table.orderId)]);

export const movements = pgTable("movements", {
  id: text("id").primaryKey(),
  itemId: text("item_id").notNull(),
  delta: integer("delta").notNull(),
  reason: text("reason").notNull(),
  at: timestamp("at", { withTimezone: true, mode: "string" }).notNull(),
  ref: text("ref"),
});

export const reservations = pgTable("reservations", {
  id: serial("id").primaryKey(),
  orderId: text("order_id").notNull().references(() => orders.id),
  itemId: text("item_id").notNull(),
  quantity: integer("quantity").notNull(),
  state: text("state").notNull(),
}, (table) => [index("reservations_order_id_idx").on(table.orderId)]);

export const calendarDates = pgTable("calendar_dates", {
  date: date("date", { mode: "string" }).primaryKey(),
  status: text("status").notNull(),
});

export const storeStatus = pgTable("store_status", {
  id: integer("id").primaryKey(),
  status: text("status").notNull(),
});

export const auditEvents = pgTable("audit_events", {
  id: serial("id").primaryKey(),
  at: timestamp("at", { withTimezone: true, mode: "string" }).notNull(),
  action: text("action").notNull(),
  ref: text("ref"),
});

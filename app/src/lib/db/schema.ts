import type { InvoiceCompany, InvoiceLine } from "@/lib/domain/invoice";
import { pgTable, text, integer, timestamp, jsonb, serial, date, index } from "drizzle-orm/pg-core";

export const orders = pgTable("orders", {
  id: text("id").primaryKey(),
  idempotencyKey: text("idempotency_key").notNull().unique(),
  publicToken: text("public_token").notNull().unique(),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "string" }).notNull(),
  referralSource: text("referral_source"),
  referralName: text("referral_name"),
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
  readyQuantity: integer("ready_quantity").notNull().default(0),
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

export const readyProductMovements = pgTable("ready_product_movements", {
  id: text("id").primaryKey(),
  productId: text("product_id").notNull(),
  quantityDelta: integer("quantity_delta").notNull(),
  movementType: text("movement_type").notNull(),
  packedAt: timestamp("packed_at", { withTimezone: true, mode: "string" }),
  expiresOn: date("expires_on", { mode: "string" }),
  orderId: text("order_id").references(() => orders.id),
  sourceMovementId: text("source_movement_id"),
  note: text("note"),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "string" }).notNull(),
}, (table) => [index("ready_product_movements_order_id_idx").on(table.orderId)]);

// Invoice tables sit outside the loadState/diffAndWrite domain model: direct queries in lib/db/{settings,invoices}.ts.
export const companySettings = pgTable("company_settings", {
  id: integer("id").primaryKey().default(1),
  name: text("name").notNull().default(""),
  phone: text("phone").notNull().default(""),
  email: text("email").notNull().default(""),
  address: text("address").notNull().default(""),
  instagram: text("instagram").notNull().default(""),
  paymentInfo: text("payment_info").notNull().default(""),
  footerNote: text("footer_note").notNull().default(""),
  signatureName: text("signature_name").notNull().default(""),
  logoBase64: text("logo_base64"),
  logoMime: text("logo_mime"),
});

// orderId is deliberately not an FK: invoices are immutable snapshots and must survive order reset/deletion.
export const invoices = pgTable("invoices", {
  id: serial("id").primaryKey(),
  number: text("number").notNull().unique(),
  orderId: text("order_id"),
  issuedAt: date("issued_at", { mode: "string" }).notNull(),
  dueDate: date("due_date", { mode: "string" }).notNull(),
  buyerName: text("buyer_name").notNull(),
  buyerPhone: text("buyer_phone").notNull().default(""),
  buyerAddress: text("buyer_address").notNull().default(""),
  lines: jsonb("lines").notNull().$type<InvoiceLine[]>(),
  deliveryFee: integer("delivery_fee").notNull().default(0),
  paid: integer("paid").notNull().default(0),
  notes: text("notes").notNull().default(""),
  company: jsonb("company").notNull().$type<InvoiceCompany>(),
  subtotal: integer("subtotal").notNull(),
  tax: integer("tax").notNull(),
  total: integer("total").notNull(),
  // paidAt null = unpaid. orderPaymentId = the order payment this invoice created (null if order was already paid / manual invoice).
  paidAt: timestamp("paid_at", { withTimezone: true, mode: "string" }),
  paidMethod: text("paid_method"),
  orderPaymentId: text("order_payment_id"),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "string" }).notNull().defaultNow(),
}, (table) => [index("invoices_order_id_idx").on(table.orderId)]);

// Highest number ever issued per year; survives invoice deletion so numbers are never reused.
export const invoiceCounters = pgTable("invoice_counters", {
  year: integer("year").primaryKey(),
  lastSeq: integer("last_seq").notNull(),
});

# Supabase Persistence Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace `app/src/lib/session-store.ts` (browser sessionStorage) with real Supabase Postgres persistence via Drizzle, keeping `app/src/lib/domain/operations.ts` byte-for-byte unchanged, and rewire the 5 UI call sites onto Server Actions.

**Architecture:** Every domain command still runs as a pure `operations.ts` function. A single `withDomainTransaction` helper wraps each Server Action: take a Postgres advisory lock → reconstruct `op.State` from 8 relational tables → run the pure command → diff old vs. new state → write only the changed rows → return `{ error, state }`. Pages become Server Components that read state directly; `revalidatePath` after a mutation re-renders them with fresh data — no client-side data-fetching library needed.

**Tech Stack:** Drizzle ORM + `drizzle-kit` + `postgres` (postgres.js driver), Supabase Postgres (project provisioned via the Supabase MCP tools already connected in this session), Next.js 16 Server Actions.

**Spec:** `docs/superpowers/specs/2026-09-21-supabase-persistence-design.md`

## Global Constraints

- `app/src/lib/domain/operations.ts` and `app/src/lib/domain/domain.test.ts` are NOT modified by this plan. Every task works around them, never inside them.
- No `customers`/`products`/`fulfillments`/`founder_users`/`ready_product_movements` tables — out of scope per spec.
- No founder-identity fields (`verified_by`/`created_by`) — auth is a separate backlog item.
- All money and quantity fields are plain Postgres `integer` — `operations.ts` already stores raw-cheese in integer centigrams, so no `numeric`/decimal columns are needed anywhere.
- One global `pg_advisory_xact_lock(1)` serializes every domain write. This also makes a separate `order_seq`/ID-race concern moot — deviates from one detail in the spec text (which floated a Postgres sequence) because the lock already solves that problem more simply; do not add a sequence.
- No new client data-fetching dependency (no SWR/React Query).
- Local Postgres via Docker/Supabase CLI is **not** used — the Supabase MCP tools are already connected and authenticated this session, so development targets the real (single) Supabase project directly. `DATABASE_URL` in `app/.env.local` is the only local config needed.
- Migrations are committed SQL files (`drizzle-kit generate`), applied via the `apply_migration` MCP tool — never `drizzle-kit push` against the project.

---

### Task 1: Provision the Supabase project and capture connection config

**Files:**
- Create: `app/.env.local` (gitignored — confirm `.gitignore` already excludes it)
- Modify: `app/.env.example` (add `DATABASE_URL=`)

**Interfaces:**
- Produces: `DATABASE_URL` env var (Postgres connection string) that Task 2's `drizzle.config.ts` and Task 6's `db/client.ts` both read.

- [ ] **Step 1: Check org and confirm cost**

Already known from this session: one organization, `Le Nouette` (id `ophjadhkqfolecsyqvyu`), zero existing projects. Call `mcp__plugin_supabase_supabase__get_cost` with `type: "project"`, `organization_id: "ophjadhkqfolecsyqvyu"` to get the price, then `mcp__plugin_supabase_supabase__confirm_cost` with the returned `type`, `recurrence`, `amount` — this is a billed resource, so present the cost to the user and get their go-ahead in chat before calling `confirm_cost` (confirm_cost itself is the mechanism the user approves through; don't skip straight past it without the user seeing the number).

- [ ] **Step 2: Create the project**

Call `mcp__plugin_supabase_supabase__create_project` with `name: "le-nouette"`, a `region` close to the user (default `ap-southeast-1` — Singapore — unless the user specifies otherwise), `organization_id: "ophjadhkqfolecsyqvyu"`, and the `confirm_cost_id` from Step 1.

- [ ] **Step 3: Wait for the project to be ready**

Poll `mcp__plugin_supabase_supabase__get_project` with the returned project id until `status` is `ACTIVE_HEALTHY` (a few minutes). Record the `project_id` — every later MCP call in this plan needs it.

- [ ] **Step 4: Get the connection string**

Call `mcp__plugin_supabase_supabase__get_project_url` for the API URL. The direct Postgres connection string (with password) is not returned by the MCP tools for security — get it from the Supabase Dashboard: Project Settings → Database → Connection String → **Transaction pooler** (port 6543). Tell the user this one manual step is needed and ask them to paste the pooler connection string.

- [ ] **Step 5: Write env files**

`app/.env.local`:
```
DATABASE_URL=<transaction pooler connection string from Step 4>
NEXT_PUBLIC_SUPABASE_URL=<from get_project_url>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<from get_publishable_keys>
```

`app/.env.example` — add one line:
```
DATABASE_URL=
```

- [ ] **Step 6: Verify `.env.local` is gitignored**

Run: `cd app && git check-ignore .env.local`
Expected: prints `.env.local` (already covered by the existing `.gitignore`, per repo scan — confirm rather than assume).

- [ ] **Step 7: Commit**

```bash
cd "/Users/randalubis/Documents/ChatGPT/Le Nouette"
git add app/.env.example
git commit -m "Add DATABASE_URL placeholder for Supabase persistence

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 2: Install Drizzle and configure the driver

**Files:**
- Modify: `app/package.json`
- Create: `app/drizzle.config.ts`

**Interfaces:**
- Produces: `drizzle-kit generate` / `drizzle-kit migrate` npm scripts that Task 3 uses.

- [ ] **Step 1: Install dependencies**

```bash
cd "/Users/randalubis/Documents/ChatGPT/Le Nouette/app"
npm install drizzle-orm postgres
npm install -D drizzle-kit
```

- [ ] **Step 2: Add `drizzle.config.ts`**

```ts
import { defineConfig } from "drizzle-kit";

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/lib/db/schema.ts",
  out: "./drizzle",
  dbCredentials: { url: process.env.DATABASE_URL! },
});
```

- [ ] **Step 3: Add npm scripts**

In `app/package.json`, add to `"scripts"`:
```json
"db:generate": "drizzle-kit generate",
"db:studio": "drizzle-kit studio"
```
(No `db:migrate`/`db:push` script — migrations apply via the MCP `apply_migration` tool per Global Constraints, not the CLI, so the project stays reviewable through the same tool the rest of this plan uses.)

- [ ] **Step 4: Verify install**

Run: `cd "/Users/randalubis/Documents/ChatGPT/Le Nouette/app" && npx drizzle-kit --version`
Expected: prints a version, no error.

- [ ] **Step 5: Commit**

```bash
cd "/Users/randalubis/Documents/ChatGPT/Le Nouette"
git add app/package.json app/package-lock.json app/drizzle.config.ts
git commit -m "Add Drizzle ORM and drizzle-kit for Supabase persistence

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 3: Write the schema and apply the first migration

**Files:**
- Create: `app/src/lib/db/schema.ts`
- Create (generated): `app/drizzle/0000_*.sql`

**Interfaces:**
- Consumes: nothing new.
- Produces: Drizzle table objects (`orders`, `orderItems`, `payments`, `movements`, `reservations`, `calendarDates`, `storeStatus`, `auditEvents`) that Task 4/5's `loadState`/`diffAndWrite` import from `@/lib/db/schema`.

- [ ] **Step 1: Write `app/src/lib/db/schema.ts`**

```ts
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
```

`fulfillment`/`status`/`method`/`reason`/`state` stay plain `text`, not Postgres `enum` — `operations.ts` owns the valid-value validation already (it's the single source of truth for business rules); a DB-level enum would duplicate that list and need a migration every time the domain layer's union type changes.

- [ ] **Step 2: Generate the migration**

Run: `cd "/Users/randalubis/Documents/ChatGPT/Le Nouette/app" && npm run db:generate`
Expected: creates `app/drizzle/0000_<name>.sql` and a `app/drizzle/meta/` folder.

- [ ] **Step 3: Read the generated SQL and append RLS + the singleton seed row**

Open the generated `.sql` file and append:
```sql
alter table "orders" enable row level security;
alter table "order_items" enable row level security;
alter table "payments" enable row level security;
alter table "movements" enable row level security;
alter table "reservations" enable row level security;
alter table "calendar_dates" enable row level security;
alter table "store_status" enable row level security;
alter table "audit_events" enable row level security;

insert into "store_status" ("id", "status") values (1, 'OPEN');
```
No policies are created — RLS with zero policies denies all access through the Supabase PostgREST/anon-key path entirely. The app only ever talks to Postgres through the direct `DATABASE_URL` connection (Drizzle), which bypasses RLS as the Postgres role owner, so this purely closes off the anon-key API surface without touching the app's own access path. The `store_status` insert seeds the singleton row `diffAndWrite` (Task 5) expects to already exist so it can `UPDATE` rather than needing first-insert logic.

- [ ] **Step 4: Apply the migration via MCP**

Read the final SQL file content, then call `mcp__plugin_supabase_supabase__apply_migration` with `project_id`, `name: "0000_init_schema"`, and `query: <the full SQL file content>`.

- [ ] **Step 5: Verify**

Call `mcp__plugin_supabase_supabase__list_tables` with the project id, `schemas: ["public"]`, `verbose: true`. Expected: 8 tables listed matching the schema above.

Call `mcp__plugin_supabase_supabase__get_advisors` with `type: "security"`. Expected: no RLS-disabled warnings for these 8 tables (foreign-key/index advisories, if any, are fine to leave — note them but don't block on it).

- [ ] **Step 6: Commit**

```bash
cd "/Users/randalubis/Documents/ChatGPT/Le Nouette"
git add app/src/lib/db/schema.ts app/drizzle/
git commit -m "Add Drizzle schema and apply initial Supabase migration

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 4: `db/client.ts` and `loadState`

**Files:**
- Create: `app/src/lib/db/client.ts`
- Create: `app/src/lib/db/load-state.ts`

**Interfaces:**
- Consumes: `schema.ts` tables (Task 3).
- Produces: `db` (Drizzle instance), `Tx` type, `loadState(executor: Db | Tx): Promise<op.State>` — used by Task 5 (`diffAndWrite`), Task 6 (`withDomainTransaction`, `getState`).

- [ ] **Step 1: Write `app/src/lib/db/client.ts`**

```ts
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

// prepare:false is required against Supabase's transaction pooler, which doesn't support prepared statements.
const sql = postgres(process.env.DATABASE_URL!, { prepare: false });
export const db = drizzle(sql, { schema });

export type Db = typeof db;
export type Tx = Parameters<Parameters<Db["transaction"]>[0]>[0];
```

- [ ] **Step 2: Write `app/src/lib/db/load-state.ts`**

```ts
import * as schema from "./schema";
import type { Db, Tx } from "./client";
import type * as op from "@/lib/domain/operations";

// `reservations` has no id in the domain type; we attach the DB row id at runtime as `dbId` so
// diffAndWrite (Task 5) can update the right row without positional matching. operations.ts only
// ever spreads reservation objects (`{ ...r, state: ... }`), so this extra field survives every
// mutation untouched even though it isn't part of the declared `Reservation` type.
export type LoadedReservation = op.Reservation & { dbId: number };

export async function loadState(executor: Db | Tx): Promise<op.State> {
  const [orderRows, itemRows, paymentRows, movementRows, reservationRows, calendarRows, storeRow, auditRows] = await Promise.all([
    executor.select().from(schema.orders).orderBy(schema.orders.createdAt),
    executor.select().from(schema.orderItems).orderBy(schema.orderItems.id),
    executor.select().from(schema.payments).orderBy(schema.payments.at),
    executor.select().from(schema.movements).orderBy(schema.movements.at),
    executor.select().from(schema.reservations).orderBy(schema.reservations.id),
    executor.select().from(schema.calendarDates),
    executor.select().from(schema.storeStatus),
    executor.select().from(schema.auditEvents).orderBy(schema.auditEvents.at),
  ]);

  const itemsByOrder = new Map<string, op.OrderItem[]>();
  for (const row of itemRows) {
    const list = itemsByOrder.get(row.orderId) ?? [];
    list.push({ productId: row.productId as op.OrderItem["productId"], name: row.name, unitPrice: row.unitPrice, quantity: row.quantity, recipe: row.recipe as op.OrderItem["recipe"] });
    itemsByOrder.set(row.orderId, list);
  }

  const paymentsByOrder = new Map<string, op.Payment[]>();
  for (const row of paymentRows) {
    const list = paymentsByOrder.get(row.orderId) ?? [];
    list.push({ id: row.id, amount: row.amount, method: row.method as op.Payment["method"], at: row.at, reversedAt: row.reversedAt ?? undefined });
    paymentsByOrder.set(row.orderId, list);
  }

  const orders: op.Order[] = orderRows.map((row) => ({
    id: row.id,
    idempotencyKey: row.idempotencyKey,
    createdAt: row.createdAt,
    customer: { name: row.customerName, whatsapp: row.customerWhatsapp },
    fulfillment: row.fulfillment as op.Order["fulfillment"],
    address: row.address ?? undefined,
    note: row.note ?? undefined,
    items: itemsByOrder.get(row.id) ?? [],
    total: row.total,
    promisedReadyDate: row.promisedReadyDate,
    currentReadyDate: row.currentReadyDate,
    status: row.status as op.Order["status"],
    readyAt: row.readyAt ?? undefined,
    dispatchedAt: row.dispatchedAt ?? undefined,
    completedAt: row.completedAt ?? undefined,
    cancelledAt: row.cancelledAt ?? undefined,
    payments: paymentsByOrder.get(row.id) ?? [],
  }));

  const calendar: op.Calendar = {};
  for (const row of calendarRows) calendar[row.date] = row.status as op.DateStatus;

  const reservations: LoadedReservation[] = reservationRows.map((row) => ({
    orderId: row.orderId,
    itemId: row.itemId as op.Reservation["itemId"],
    quantity: row.quantity,
    state: row.state as op.Reservation["state"],
    dbId: row.id,
  }));

  return {
    version: 1,
    seq: orders.length,
    orders,
    movements: movementRows.map((row) => ({ id: row.id, itemId: row.itemId as op.Movement["itemId"], delta: row.delta, reason: row.reason as op.Movement["reason"], at: row.at, ref: row.ref ?? undefined })),
    reservations,
    calendar,
    storeStatus: (storeRow[0]?.status as op.State["storeStatus"]) ?? "OPEN",
    audit: auditRows.map((row) => ({ at: row.at, action: row.action, ref: row.ref ?? undefined })),
  };
}
```

`state.seq = orders.length` is correct because `createOrder` is the only place that increments `seq`, and it always appends exactly one order at the same time — the count and the counter never drift apart. Every `as` cast here is widening a DB `text` column back to the domain layer's union type; `operations.ts` is the only place that validates those values, so this is just telling TypeScript what's already guaranteed by the write path (Task 5 only ever writes values `operations.ts` produced).

- [ ] **Step 3: Verify it typechecks**

Run: `cd "/Users/randalubis/Documents/ChatGPT/Le Nouette/app" && npx tsc --noEmit`
Expected: no errors from the new files (pre-existing errors, if any, are out of scope).

- [ ] **Step 4: Commit**

```bash
cd "/Users/randalubis/Documents/ChatGPT/Le Nouette"
git add app/src/lib/db/client.ts app/src/lib/db/load-state.ts
git commit -m "Add Drizzle client and state reconstruction from Postgres

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 5: `diffAndWrite`

**Files:**
- Create: `app/src/lib/db/diff-and-write.ts`

**Interfaces:**
- Consumes: `schema.ts` (Task 3), `Tx` type + `LoadedReservation` (Task 4).
- Produces: `diffAndWrite(tx: Tx, prev: op.State, next: op.State): Promise<void>` — used by Task 6's `withDomainTransaction`.

- [ ] **Step 1: Write `app/src/lib/db/diff-and-write.ts`**

```ts
import { eq } from "drizzle-orm";
import * as schema from "./schema";
import type { Tx } from "./client";
import type { LoadedReservation } from "./load-state";
import type * as op from "@/lib/domain/operations";

export async function diffAndWrite(tx: Tx, prev: op.State, next: op.State): Promise<void> {
  const prevOrders = new Map(prev.orders.map((order) => [order.id, order]));
  for (const order of next.orders) {
    const before = prevOrders.get(order.id);
    if (!before) {
      await tx.insert(schema.orders).values({
        id: order.id, idempotencyKey: order.idempotencyKey, createdAt: order.createdAt,
        customerName: order.customer.name, customerWhatsapp: order.customer.whatsapp,
        fulfillment: order.fulfillment, address: order.address ?? null, note: order.note ?? null,
        total: order.total, promisedReadyDate: order.promisedReadyDate, currentReadyDate: order.currentReadyDate,
        status: order.status, readyAt: order.readyAt ?? null, dispatchedAt: order.dispatchedAt ?? null,
        completedAt: order.completedAt ?? null, cancelledAt: order.cancelledAt ?? null,
      });
      if (order.items.length > 0) {
        await tx.insert(schema.orderItems).values(order.items.map((item) => ({
          orderId: order.id, productId: item.productId, name: item.name,
          unitPrice: item.unitPrice, quantity: item.quantity, recipe: item.recipe,
        })));
      }
    } else if (
      before.status !== order.status ||
      before.currentReadyDate !== order.currentReadyDate ||
      before.readyAt !== order.readyAt ||
      before.dispatchedAt !== order.dispatchedAt ||
      before.completedAt !== order.completedAt ||
      before.cancelledAt !== order.cancelledAt
    ) {
      await tx.update(schema.orders).set({
        status: order.status, currentReadyDate: order.currentReadyDate,
        readyAt: order.readyAt ?? null, dispatchedAt: order.dispatchedAt ?? null,
        completedAt: order.completedAt ?? null, cancelledAt: order.cancelledAt ?? null,
      }).where(eq(schema.orders.id, order.id));
    }
  }

  const prevPaymentById = new Map(prev.orders.flatMap((order) => order.payments.map((payment) => [payment.id, payment] as const)));
  for (const order of next.orders) {
    for (const payment of order.payments) {
      const before = prevPaymentById.get(payment.id);
      if (!before) {
        await tx.insert(schema.payments).values({
          id: payment.id, orderId: order.id, amount: payment.amount,
          method: payment.method, at: payment.at, reversedAt: payment.reversedAt ?? null,
        });
      } else if (before.reversedAt !== payment.reversedAt) {
        await tx.update(schema.payments).set({ reversedAt: payment.reversedAt ?? null }).where(eq(schema.payments.id, payment.id));
      }
    }
  }

  if (next.movements.length > prev.movements.length) {
    const newRows = next.movements.slice(prev.movements.length);
    await tx.insert(schema.movements).values(newRows.map((movement) => ({
      id: movement.id, itemId: movement.itemId, delta: movement.delta,
      reason: movement.reason, at: movement.at, ref: movement.ref ?? null,
    })));
  }

  const prevReservationsByDbId = new Map((prev.reservations as LoadedReservation[]).map((r) => [r.dbId, r]));
  const newReservations = (next.reservations as LoadedReservation[]).filter((r) => r.dbId === undefined);
  if (newReservations.length > 0) {
    await tx.insert(schema.reservations).values(newReservations.map((r) => ({ orderId: r.orderId, itemId: r.itemId, quantity: r.quantity, state: r.state })));
  }
  for (const r of next.reservations as LoadedReservation[]) {
    if (r.dbId === undefined) continue;
    const before = prevReservationsByDbId.get(r.dbId);
    if (before && before.state !== r.state) {
      await tx.update(schema.reservations).set({ state: r.state }).where(eq(schema.reservations.id, r.dbId));
    }
  }

  if (next.audit.length > prev.audit.length) {
    const newRows = next.audit.slice(prev.audit.length);
    await tx.insert(schema.auditEvents).values(newRows.map((event) => ({ at: event.at, action: event.action, ref: event.ref ?? null })));
  }

  const prevCalendarKeys = new Set(Object.keys(prev.calendar));
  for (const [dateKey, status] of Object.entries(next.calendar)) {
    if (prev.calendar[dateKey] !== status) {
      await tx.insert(schema.calendarDates).values({ date: dateKey, status })
        .onConflictDoUpdate({ target: schema.calendarDates.date, set: { status } });
    }
  }
  for (const dateKey of prevCalendarKeys) {
    if (!(dateKey in next.calendar)) await tx.delete(schema.calendarDates).where(eq(schema.calendarDates.date, dateKey));
  }

  if (prev.storeStatus !== next.storeStatus) {
    await tx.update(schema.storeStatus).set({ status: next.storeStatus }).where(eq(schema.storeStatus.id, 1));
  }
}
```

Newly-created reservations (from `createOrder`) never have `dbId` set — they're plain objects built fresh in `operations.ts`, so `r.dbId === undefined` reliably identifies "insert", and every reservation loaded from the DB carries the `dbId` `loadState` attached, so `!== undefined` reliably identifies "possible update".

- [ ] **Step 2: Verify it typechecks**

Run: `cd "/Users/randalubis/Documents/ChatGPT/Le Nouette/app" && npx tsc --noEmit`
Expected: no new errors.

- [ ] **Step 3: Commit**

```bash
cd "/Users/randalubis/Documents/ChatGPT/Le Nouette"
git add app/src/lib/db/diff-and-write.ts
git commit -m "Add diffAndWrite to persist domain state changes to Postgres

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 6: `withDomainTransaction`, `getState`, and the server actions

**Files:**
- Create: `app/src/lib/db/with-domain-transaction.ts`
- Create: `app/src/lib/db/get-state.ts`
- Create: `app/src/lib/domain/actions.ts`

**Interfaces:**
- Consumes: `db`/`Tx` (Task 4), `loadState` (Task 4), `diffAndWrite` (Task 5), `operations.ts` exports (existing).
- Produces: `getState(): Promise<op.State>` and 12 actions (`createOrderAction`, `cancelOrderAction`, `rescheduleOrderAction`, `completeBatchAction`, `dispatchOrderAction`, `completeOrderAction`, `recordPaymentAction`, `reversePaymentAction`, `receiveStockAction`, `stockOpnameAction`, `setDateStatusAction`, `setStoreStatusAction`) — consumed by Tasks 9–13's UI rewrites.

- [ ] **Step 1: Write `app/src/lib/db/with-domain-transaction.ts`**

```ts
"use server";

import { sql } from "drizzle-orm";
import { db } from "./client";
import { loadState } from "./load-state";
import { diffAndWrite } from "./diff-and-write";
import * as op from "@/lib/domain/operations";

export async function withDomainTransaction(
  command: (state: op.State, now: Date) => op.State,
): Promise<{ error: string | null; state: op.State | null }> {
  try {
    let result: op.State | null = null;
    await db.transaction(async (tx) => {
      await tx.execute(sql`select pg_advisory_xact_lock(1)`);
      const prev = await loadState(tx);
      const next = command(prev, new Date());
      await diffAndWrite(tx, prev, next);
      result = next;
    });
    return { error: null, state: result };
  } catch (error) {
    if (error instanceof op.DomainError) return { error: error.message, state: null };
    throw error;
  }
}
```

- [ ] **Step 2: Write `app/src/lib/db/get-state.ts`**

```ts
import { db } from "./client";
import { loadState } from "./load-state";

export const getState = () => loadState(db);
```

- [ ] **Step 3: Write `app/src/lib/domain/actions.ts`**

```ts
"use server";

import { revalidatePath } from "next/cache";
import { withDomainTransaction } from "@/lib/db/with-domain-transaction";
import type { ItemId } from "@/lib/domain/catalog";
import type { DateStatus } from "@/lib/domain/schedule";
import * as op from "./operations";

const revalidateAll = () => { revalidatePath("/", "layout"); revalidatePath("/founder", "layout"); };

export async function createOrderAction(input: op.CreateOrderInput) {
  const { error, state } = await withDomainTransaction((current, now) => op.createOrder(current, input, now));
  if (!error) revalidateAll();
  return { error, order: state?.orders.find((order) => order.idempotencyKey === input.idempotencyKey) ?? null };
}

export async function cancelOrderAction(id: string) {
  const { error } = await withDomainTransaction((state, now) => op.cancelOrder(state, id, now));
  if (!error) revalidateAll();
  return { error };
}

export async function rescheduleOrderAction(id: string, date: string) {
  const { error } = await withDomainTransaction((state, now) => op.rescheduleOrder(state, id, date, now));
  if (!error) revalidateAll();
  return { error };
}

export async function completeBatchAction(readyDate: string) {
  const { error } = await withDomainTransaction((state, now) => op.completeBatch(state, readyDate, now));
  if (!error) revalidateAll();
  return { error };
}

export async function dispatchOrderAction(id: string) {
  const { error } = await withDomainTransaction((state, now) => op.dispatchOrder(state, id, now));
  if (!error) revalidateAll();
  return { error };
}

export async function completeOrderAction(id: string) {
  const { error } = await withDomainTransaction((state, now) => op.completeOrder(state, id, now));
  if (!error) revalidateAll();
  return { error };
}

export async function recordPaymentAction(id: string, method: op.PaymentMethod) {
  const { error } = await withDomainTransaction((state, now) => op.recordPayment(state, id, method, now));
  if (!error) revalidateAll();
  return { error };
}

export async function reversePaymentAction(id: string, paymentId: string) {
  const { error } = await withDomainTransaction((state, now) => op.reversePayment(state, id, paymentId, now));
  if (!error) revalidateAll();
  return { error };
}

export async function receiveStockAction(itemId: ItemId, quantity: number) {
  const { error } = await withDomainTransaction((state, now) => op.receiveStock(state, itemId, quantity, now));
  if (!error) revalidateAll();
  return { error };
}

export async function stockOpnameAction(itemId: ItemId, counted: number) {
  const { error } = await withDomainTransaction((state, now) => op.stockOpname(state, itemId, counted, now));
  if (!error) revalidateAll();
  return { error };
}

export async function setDateStatusAction(date: string, status: DateStatus | null) {
  const { error } = await withDomainTransaction((state, now) => op.setDateStatus(state, date, status, now));
  if (!error) revalidateAll();
  return { error };
}

export async function setStoreStatusAction(status: op.State["storeStatus"]) {
  const { error } = await withDomainTransaction((state, now) => op.setStoreStatus(state, status, now));
  if (!error) revalidateAll();
  return { error };
}
```

Every action revalidates both `/` and `/founder` — cheap at this app's traffic scale, and simpler than tracking which of the two surfaces each command can possibly affect (a payment or stock change on the founder side never needs the storefront to refresh mid-session, but getting that fine-grained saves nothing worth the bookkeeping).

- [ ] **Step 4: Verify it typechecks**

Run: `cd "/Users/randalubis/Documents/ChatGPT/Le Nouette/app" && npx tsc --noEmit`
Expected: no new errors.

- [ ] **Step 5: Commit**

```bash
cd "/Users/randalubis/Documents/ChatGPT/Le Nouette"
git add app/src/lib/db/with-domain-transaction.ts app/src/lib/db/get-state.ts app/src/lib/domain/actions.ts
git commit -m "Add Server Actions wrapping domain commands in Postgres transactions

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 7: Seed script

**Files:**
- Create: `app/drizzle/seed.ts`
- Modify: `app/package.json` (add `db:seed` script)

**Interfaces:**
- Consumes: `db` (Task 4), `withDomainTransaction`-style flow (reuses `operations.ts` commands directly since seeding is just a sequence of the same commands `session-store.ts` already runs).

- [ ] **Step 1: Write `app/drizzle/seed.ts`**, porting `seed()` out of `session-store.ts:13-27` unchanged in logic, writing through `diffAndWrite` once at the end instead of per-command (seeding doesn't need per-command transactional isolation — it's a one-shot script against an empty database):

```ts
import { db } from "../src/lib/db/client";
import { diffAndWrite } from "../src/lib/db/diff-and-write";
import { loadState } from "../src/lib/db/load-state";
import * as op from "../src/lib/domain/operations";

function seed(now: Date): op.State {
  const hours = (h: number) => new Date(now.getTime() - h * 3_600_000);
  const stock = [["raw_cheese", 211500], ["jar", 34], ["pouch", 118], ["sticker_square", 46], ["sticker_round", 18], ["jar_seal", 42]] as const;
  let s = stock.reduce((acc, [item, qty]) => op.receiveStock(acc, item, qty, hours(24 * 7)), op.emptyState());
  s = op.createOrder(s, { idempotencyKey: "seed-1", name: "Rizky Mahendra", whatsapp: "081234560001", fulfillment: "PICKUP_BI", quantities: { milieu: 1 } }, hours(24 * 6));
  s = op.completeBatch(s, s.orders[0].currentReadyDate, hours(24 * 4));
  s = op.completeOrder(op.recordPayment(s, "LN-0001", "TRANSFER", hours(24 * 4)), "LN-0001", hours(24 * 4));
  s = op.createOrder(s, { idempotencyKey: "seed-2", name: "Harry Sofri", whatsapp: "081234560002", fulfillment: "PICKUP_MANDIRI", quantities: { milieu: 2, grande: 1 } }, hours(3));
  s = op.createOrder(s, { idempotencyKey: "seed-3", name: "Dina Prameswari", whatsapp: "081234560003", fulfillment: "PICKUP_BI", quantities: { milieu: 1 } }, hours(2));
  s = op.recordPayment(s, "LN-0003", "QRIS", hours(2));
  s = op.createOrder(s, { idempotencyKey: "seed-4", name: "Andi Wirawan", whatsapp: "081234560004", fulfillment: "DELIVERY", address: "Jl. Kemang Raya 10, Jakarta Selatan", quantities: { milieu: 1, grande: 1 } }, hours(1));
  return s;
}

async function main() {
  const empty = await loadState(db);
  if (empty.orders.length > 0) {
    console.log("Database already has orders — skipping seed. Truncate first if you want a fresh seed.");
    process.exit(0);
  }
  await db.transaction(async (tx) => {
    await diffAndWrite(tx, empty, seed(new Date()));
  });
  console.log("Seeded.");
}

main().then(() => process.exit(0));
```

- [ ] **Step 2: Add the npm script**

In `app/package.json` `"scripts"`:
```json
"db:seed": "node --experimental-strip-types --env-file=.env.local drizzle/seed.ts"
```

- [ ] **Step 3: Run it against the real project**

Run: `cd "/Users/randalubis/Documents/ChatGPT/Le Nouette/app" && npm run db:seed`
Expected: prints `Seeded.`

Verify: call `mcp__plugin_supabase_supabase__execute_sql` with `select count(*) from orders;` — expected `4`.

- [ ] **Step 4: Commit**

```bash
cd "/Users/randalubis/Documents/ChatGPT/Le Nouette"
git add app/drizzle/seed.ts app/package.json
git commit -m "Add seed script for Supabase persistence

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 8: Integration test against the real project

**Files:**
- Create: `app/src/lib/db/actions.integration.test.ts`
- Modify: `app/package.json` (`test` script must not try to run this file with plain `node --test`, since it needs env vars — give it its own script)

**Interfaces:**
- Consumes: `createOrderAction`/`receiveStockAction` (Task 6).

- [ ] **Step 1: Write the test**

```ts
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
```

This round-trips `withDomainTransaction` → `loadState` → `diffAndWrite` against the real Supabase project, proving the load/diff/write cycle works — it does not re-test business rules (those stay in `domain.test.ts`, unchanged).

- [ ] **Step 2: Add an `it:test` script (separate from `test`, since it needs `DATABASE_URL` and hits the network)**

```json
"test:integration": "node --experimental-strip-types --env-file=.env.local --test src/lib/db/actions.integration.test.ts"
```

- [ ] **Step 3: Run it**

Run: `cd "/Users/randalubis/Documents/ChatGPT/Le Nouette/app" && npm run test:integration`
Expected: 2 tests pass.

- [ ] **Step 4: Run the existing domain tests too, to confirm they're still untouched**

Run: `cd "/Users/randalubis/Documents/ChatGPT/Le Nouette/app" && npm test`
Expected: all 8 tests still pass, unchanged.

- [ ] **Step 5: Commit**

```bash
cd "/Users/randalubis/Documents/ChatGPT/Le Nouette"
git add app/src/lib/db/actions.integration.test.ts app/package.json
git commit -m "Add integration test for the Postgres load/diff/write cycle

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 9: Rewire the storefront

**Files:**
- Modify: `app/src/app/page.tsx`
- Modify: `app/src/components/storefront.tsx`

**Interfaces:**
- Consumes: `getState` (Task 6), `createOrderAction` (Task 6).

- [ ] **Step 1: Rewrite `app/src/app/page.tsx` as an async Server Component**

```tsx
import { Storefront } from "@/components/storefront";
import { getState } from "@/lib/db/get-state";

export default async function Home() {
  const session = await getState();
  return <Storefront session={session} />;
}
```

- [ ] **Step 2: Rewrite `app/src/components/storefront.tsx`**

Replace the `run`/`useSession` import and usage. Key diff points against the current file:

```tsx
"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Check, MapPin, Minus, Plus, QrCode, ShoppingBag, Storefront as StoreIcon, Truck, WhatsappLogo, type Icon } from "@phosphor-icons/react";
import { useState, useTransition } from "react";
import { formatRupiah, products, type ProductId } from "@/lib/domain/catalog";
import type { Fulfillment, Order, State } from "@/lib/domain/operations";
import { createOrderAction } from "@/lib/domain/actions";
import { formatDate, promisedReadyDate } from "@/lib/domain/schedule";
import { useTranslation, type Key } from "@/lib/i18n";
import { readRemembered, saveRemembered } from "@/lib/remembered";
import styles from "./storefront.module.css";

type Step = "shop" | "details" | "success";
type Option = { id: Fulfillment; title: Key; sub: Key; icon: Icon };

const fulfillmentOptions: Option[] = [
  { id: "PICKUP_MANDIRI", title: "pickupMandiri", sub: "free", icon: StoreIcon },
  { id: "PICKUP_BI", title: "pickupBi", sub: "free", icon: StoreIcon },
  { id: "DELIVERY", title: "delivery", sub: "deliveryFee", icon: Truck },
];

export function Storefront({ session }: { session: State }) {
  const { t, locale, setLocale } = useTranslation();
  const [step, setStep] = useState<Step>("shop");
  const [qty, setQty] = useState<Record<ProductId, number>>({ milieu: 1, grande: 0 });
  const [fulfillment, setFulfillment] = useState<Fulfillment>("PICKUP_MANDIRI");
  const [remembered] = useState(() => (typeof window === "undefined" ? null : readRemembered()));
  const [form, setForm] = useState({ name: remembered?.name ?? "", whatsapp: remembered?.whatsapp ?? "", address: "", note: "" });
  const [remember, setRemember] = useState(remembered !== null);
  const [placed, setPlaced] = useState<Order | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showQris, setShowQris] = useState(false);
  const [pending, startTransition] = useTransition();

  const total = products.reduce((sum, product) => sum + product.price * qty[product.id], 0);
  const count = qty.milieu + qty.grande;
  const paused = session.storeStatus === "PAUSED";
  const readyLabel = formatDate(promisedReadyDate(new Date(), session.calendar), "long", locale);
  const placedQty = { milieu: 0, grande: 0, ...Object.fromEntries((placed?.items ?? []).map((item) => [item.productId, item.quantity])) } as Record<ProductId, number>;

  const updateQty = (id: ProductId, delta: number) => setQty((current) => ({ ...current, [id]: Math.max(0, current[id] + delta) }));
  const field = (key: keyof typeof form) => ({ value: form[key], onChange: (event: { target: { value: string } }) => setForm((current) => ({ ...current, [key]: event.target.value })) });

  const toggleRemember = (checked: boolean) => {
    setRemember(checked);
    if (!checked) saveRemembered(null);
  };

  const submit = () => {
    startTransition(async () => {
      const key = crypto.randomUUID();
      const { error, order } = await createOrderAction({ idempotencyKey: key, ...form, fulfillment, quantities: qty });
      setError(error);
      if (error || !order) return;
      saveRemembered(remember ? { name: form.name.trim(), whatsapp: form.whatsapp.replace(/[\s-]/g, "") } : null);
      setPlaced(order);
      setStep("success");
    });
  };

  const startOver = () => {
    setQty({ milieu: 1, grande: 0 });
    setForm((current) => ({ ...current, address: "", note: "" }));
    setPlaced(null);
    setShowQris(false);
    setStep("shop");
  };

  return (
    <main className={styles.shell}>
      <header className={styles.header}>
        {step === "details" ? <button className={styles.back} aria-label={t("back")} onClick={() => setStep("shop")}><ArrowLeft size={20} /></button> : <span />}
        <Link href="/" className={styles.wordmark}>LE NOUETTE</Link>
        <div className={styles.locale} role="group" aria-label={t("langSwitch")}>
          {(["ID", "EN"] as const).map((option) => (
            <button key={option} aria-pressed={locale === option} className={locale === option ? styles.localeActive : ""} onClick={() => setLocale(option)}>{option}</button>
          ))}
        </div>
      </header>

      {step === "shop" && (
        <>
          <section className={`${styles.hero} fade-up`}>
            <Image src="/le-nouette/packaging-concept.png" alt="Le Nouette cheese sticks" fill priority sizes="(max-width: 760px) 100vw, 760px" />
            <div className={styles.heroShade} />
            <div className={styles.heroCopy}>
              <p>{t("eyebrow")}</p>
              <h1 className="display">{t("heroTitle")}</h1>
              <span>{t("heroSub")}</span>
            </div>
          </section>

          <section className={`${styles.catalog} fade-up-delay`} aria-labelledby="products-title">
            <div className={styles.promise}>
              {paused ? <><span>{t("pausedTitle")}</span><strong>{t("pausedSub")}</strong></> : <><span>{t("openForOrders")}</span><strong>{t("readyEstimate", { date: readyLabel })}</strong></>}
            </div>
            <h2 id="products-title" className="display">{t("catalogTitle")}</h2>
            {products.map((product, index) => (
              <article className={styles.product} key={product.id}>
                <div className={`${styles.productVisual} ${index === 1 ? styles.pouchVisual : ""}`}>
                  <Image src="/le-nouette/packaging-concept.png" alt={`${product.name} ${t(`${product.id}Detail`)}`} fill sizes="120px" />
                </div>
                <div className={styles.productCopy}>
                  <h3 className="display">{product.name}</h3>
                  <p className={styles.detail}>{t(`${product.id}Detail`)}</p>
                  <p>{t(`${product.id}Blurb`)}</p>
                  <strong>{formatRupiah(product.price)}</strong>
                </div>
                <div className={styles.stepper} aria-label={t("quantityOf", { product: product.name })}>
                  <button onClick={() => updateQty(product.id, -1)} disabled={qty[product.id] === 0} aria-disabled={qty[product.id] === 0} aria-label={t("decrease", { product: product.name })}><Minus size={16} /></button>
                  <span aria-live="polite">{qty[product.id]}</span>
                  <button className={styles.plus} onClick={() => updateQty(product.id, 1)} aria-label={t("increase", { product: product.name })}><Plus size={16} /></button>
                </div>
              </article>
            ))}
          </section>
        </>
      )}

      {step === "details" && (
        <form id="checkout" className={`${styles.formPage} fade-up`} onSubmit={(event) => { event.preventDefault(); submit(); }}>
          <div className={styles.pageIntro}>
            <span>{t("yourOrder")}</span>
            <h1 className="display">{t("fulfillmentQuestion")}</h1>
            <p>{t("readyEstimateSentence", { date: readyLabel })}</p>
          </div>
          <fieldset className={styles.choices}>
            <legend className="sr-only">{t("fulfillmentLegend")}</legend>
            {fulfillmentOptions.map(({ id, title, sub, icon: ChoiceIcon }) => (
              <label key={id} className={`${styles.choice} ${fulfillment === id ? styles.choiceActive : ""}`}>
                <input type="radio" className="sr-only" name="fulfillment" value={id} checked={fulfillment === id} onChange={() => setFulfillment(id)} />
                <ChoiceIcon size={24} /><span><strong>{t(title)}</strong><small>{t(sub)}</small></span><i aria-hidden="true">{fulfillment === id && <Check size={14} weight="bold" />}</i>
              </label>
            ))}
          </fieldset>
          <div className={styles.fields}>
            <h2>{t("customerSection")}</h2>
            <label>{t("name")}<input required autoComplete="name" {...field("name")} /></label>
            <label>{t("whatsapp")}<input required type="tel" autoComplete="tel" pattern="^(\+62|62|0)8[0-9 \-]{7,14}$" title={t("whatsappHint")} placeholder="0812 3456 7890" {...field("whatsapp")} /></label>
            {fulfillment === "DELIVERY" && <label>{t("address")}<textarea required rows={3} autoComplete="street-address" placeholder={t("addressPlaceholder")} {...field("address")} /></label>}
            <label>{t("note")}<textarea rows={2} maxLength={180} placeholder={t("notePlaceholder")} {...field("note")} /></label>
            <label className={styles.remember}><input type="checkbox" checked={remember} onChange={(event) => toggleRemember(event.target.checked)} /> {t("remember")}</label>
          </div>
          {error && <p role="alert" className={styles.payNote}>{error}</p>}
          <OrderSummary t={t} qty={qty} total={total} delivery={fulfillment === "DELIVERY"} />
        </form>
      )}

      {step === "success" && placed && (
        <section className={`${styles.success} fade-up`}>
          <div className={styles.check}><Check size={42} weight="bold" /></div>
          <p>{t("successEyebrow")}</p>
          <h1 className="display">{t("thanks", { name: placed.customer.name.split(" ")[0] })}</h1>
          <strong className={styles.orderNo}>{placed.id}</strong>
          <span>{t("readyOn", { date: formatDate(placed.promisedReadyDate, "long", locale) })}</span>
          <div className={styles.successCard}>
            <div><MapPin size={22} /><strong>{t(fulfillmentOptions.find((option) => option.id === placed.fulfillment)!.title)}</strong></div>
            <OrderSummary t={t} qty={placedQty} total={placed.total} delivery={placed.fulfillment === "DELIVERY"} compact />
          </div>
          {showQris ? (
            <div className={styles.qris}>
              <strong>{t("qrisTitle")}</strong>
              {/* ponytail: drop the real QRIS artwork at public/le-nouette/qris.png and swap this placeholder for <Image>. */}
              <div className={styles.qrisCode} role="img" aria-label={t("qrisTitle")}><QrCode size={72} /></div>
              <p>{t("qrisNote")}</p>
            </div>
          ) : (
            <button className={`${styles.previewLink} btn btn-secondary`} onClick={() => setShowQris(true)}><QrCode size={18} /> {t("payWithQris")}</button>
          )}
          <div className={styles.whatsapp}><WhatsappLogo size={26} weight="fill" /><span>{t("whatsappUpdates")}</span></div>
          <button className={`${styles.previewLink} btn btn-quiet`} onClick={startOver}>{t("orderAgain")}</button>
          <Link href="/founder/orders" className={`${styles.previewLink} btn btn-quiet`}>{t("founderPreview")} <ArrowRight size={18} /></Link>
        </section>
      )}

      {step !== "success" && (
        <footer className={styles.sticky}>
          <div><ShoppingBag size={22} /><span>{t("itemCount", { count })}</span><strong>{formatRupiah(total)}</strong></div>
          <button className="btn btn-primary" disabled={count === 0 || paused || pending} type={step === "shop" ? "button" : "submit"} form={step === "shop" ? undefined : "checkout"} onClick={step === "shop" ? () => setStep("details") : undefined}>{step === "shop" ? t("continue") : t("placeOrder", { total: formatRupiah(total) })}<ArrowRight size={18} /></button>
        </footer>
      )}
    </main>
  );

}

// ponytail: "Bayar sekarang dengan QRIS" shows the static QRIS artwork once it exists; it never changes payment status (§11.3).
function OrderSummary({ t, qty, total, delivery, compact = false }: { t: (key: Key, vars?: Record<string, string | number>) => string; qty: Record<ProductId, number>; total: number; delivery: boolean; compact?: boolean }) {
  return (
    <div className={`${styles.summary} ${compact ? styles.summaryCompact : ""}`}>
      <h2>{t("summaryTitle")}</h2>
      {products.filter((product) => qty[product.id] > 0).map((product) => <div key={product.id}><span>{qty[product.id]} × {product.name}</span><strong>{formatRupiah(qty[product.id] * product.price)}</strong></div>)}
      <div className={styles.total}><span>{t("total")}</span><strong>{formatRupiah(total)}</strong></div>
      <p className={styles.payNote}>{delivery ? t("payOnDelivery") : t("payOnReceipt")}</p>
    </div>
  );
}
```

This is the complete file — it replaces `app/src/components/storefront.tsx` in full. The only behavioral changes versus the current version: `session` is a required prop instead of a nullable client-read hook result, order confirmation reads from local `placed` state (returned by `createOrderAction`) instead of re-finding the order in `session.orders`, and the submit/footer buttons disable while `pending` (the mutation is now an async round trip instead of a synchronous local write).

- [ ] **Step 3: Verify**

Run: `cd "/Users/randalubis/Documents/ChatGPT/Le Nouette/app" && npx tsc --noEmit && npm run build`
Expected: build succeeds.

Manual check: `npm run dev`, open `/`, place a test order, confirm the success screen shows the real order id and it appears in Founder OS → Pesanan afterward (cross-check once Task 10 lands; for now confirm at minimum that the storefront flow itself doesn't error).

- [ ] **Step 4: Commit**

```bash
cd "/Users/randalubis/Documents/ChatGPT/Le Nouette"
git add app/src/app/page.tsx app/src/components/storefront.tsx
git commit -m "Rewire storefront onto Server Actions and Postgres state

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 10: Rewire the order board

**Files:**
- Modify: `app/src/app/founder/orders/page.tsx`
- Modify: `app/src/components/order-board.tsx`

**Interfaces:**
- Consumes: `getState` (Task 6), `recordPaymentAction`, `dispatchOrderAction`, `completeOrderAction`, `reversePaymentAction`, `cancelOrderAction` (Task 6).

- [ ] **Step 1: Rewrite `app/src/app/founder/orders/page.tsx`**

```tsx
import { FounderShell } from "@/components/founder-shell";
import { OrderBoard } from "@/components/order-board";
import { getState } from "@/lib/db/get-state";

const tabs = ["NEEDS_PREPARATION", "READY_FOR_HANDOVER", "COMPLETED", "CANCELLED"] as const;

export default async function OrdersPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const { tab } = await searchParams;
  const session = await getState();
  return (
    <FounderShell active="Pesanan" title="Pesanan" subtitle="Siapkan, serahkan, dan catat pembayaran">
      <OrderBoard session={session} initialTab={tabs.find((value) => value === tab) ?? "NEEDS_PREPARATION"} />
    </FounderShell>
  );
}
```

- [ ] **Step 2: Rewrite `app/src/components/order-board.tsx`**

Replace the top of the file:

```tsx
"use client";

import { Clock, MapPin, Truck } from "@phosphor-icons/react";
import { useState, useTransition } from "react";
import { formatRupiah } from "@/lib/domain/catalog";
import type * as op from "@/lib/domain/operations";
import * as opRuntime from "@/lib/domain/operations";
import { formatDate } from "@/lib/domain/schedule";
import { recordPaymentAction, dispatchOrderAction, completeOrderAction, reversePaymentAction, cancelOrderAction } from "@/lib/domain/actions";
import styles from "./founder.module.css";

const tabs = [
  { status: "NEEDS_PREPARATION", title: "Perlu Disiapkan" },
  { status: "READY_FOR_HANDOVER", title: "Siap Diserahkan" },
  { status: "COMPLETED", title: "Selesai" },
  { status: "CANCELLED", title: "Dibatalkan" },
] as const;

export const placeLabel: Record<op.Fulfillment, string> = { PICKUP_MANDIRI: "Mandiri", PICKUP_BI: "BI", DELIVERY: "Delivery" };
const methodLabel: Record<op.PaymentMethod, string> = { TRANSFER: "Transfer", QRIS: "QRIS", CASH: "Tunai" };
export const itemsLabel = (order: op.Order) => order.items.map((item) => `${item.quantity} × ${item.name}`).join(", ");

export function OrderBoard({ session, initialTab }: { session: op.State; initialTab: op.OrderStatus }) {
  const [tab, setTab] = useState<op.OrderStatus>(initialTab);
  const [query, setQuery] = useState("");
  const [paying, setPaying] = useState<string | null>(null);
  const [error, setError] = useState<{ id: string; message: string } | null>(null);
  const [, startTransition] = useTransition();

  const act = (id: string, action: Promise<{ error: string | null }>) => {
    startTransition(async () => {
      const { error } = await action;
      setError(error ? { id, message: error } : null);
    });
  };
  const needle = query.trim().toLowerCase();
  const visible = session.orders
    .filter((order) => order.status === tab && (!needle || `${order.id} ${order.customer.name}`.toLowerCase().includes(needle)))
    .sort((a, b) => (tab === "COMPLETED" || tab === "CANCELLED" ? b.createdAt.localeCompare(a.createdAt) : a.currentReadyDate.localeCompare(b.currentReadyDate)));
```

Then in the JSX, replace each `act(order.id, (s, now) => op.xxx(s, ...))` call with `act(order.id, xxxAction(...))`:
- `act(order.id, (s, now) => op.recordPayment(s, order.id, method, now))` → `act(order.id, recordPaymentAction(order.id, method))`
- `act(order.id, (s, now) => op.dispatchOrder(s, order.id, now))` → `act(order.id, dispatchOrderAction(order.id))`
- `act(order.id, (s, now) => op.completeOrder(s, order.id, now))` → `act(order.id, completeOrderAction(order.id))`
- `act(order.id, (s, now) => op.reversePayment(s, order.id, lastPayment.id, now))` → `act(order.id, reversePaymentAction(order.id, lastPayment.id))`
- `act(order.id, (s, now) => op.cancelOrder(s, order.id, now))` → `act(order.id, cancelOrderAction(order.id))`

`op.isPaid`/`op.amountPaid` calls (pure derived-value helpers, not commands) stay as-is — keep the `opRuntime` import only if those are still referenced as `op.isPaid`/`op.amountPaid`/etc.; simplest is to keep the original `import * as op from "@/lib/domain/operations"` for the pure helpers and drop the separate `opRuntime` alias above (it was only needed if `op` the type-only import collided with runtime use — since `operations.ts` exports both types and value functions from one module, a single `import * as op from "@/lib/domain/operations"` covers both and no `opRuntime` alias is needed; remove that line from Step 2's rewrite).

The rest of the JSX (order cards, tabs, search) is unchanged.

- [ ] **Step 3: Verify**

Run: `cd "/Users/randalubis/Documents/ChatGPT/Le Nouette/app" && npx tsc --noEmit && npm run build`

Manual check: `npm run dev`, open `/founder/orders`, record a payment on a seeded unpaid order, confirm the status flips and persists across a page reload (proving it's server-backed, not client state).

- [ ] **Step 4: Commit**

```bash
cd "/Users/randalubis/Documents/ChatGPT/Le Nouette"
git add app/src/app/founder/orders/page.tsx app/src/components/order-board.tsx
git commit -m "Rewire order board onto Server Actions and Postgres state

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 11: Rewire the dashboard and packing panel

**Files:**
- Modify: `app/src/app/founder/page.tsx`
- Modify: `app/src/components/packing-panel.tsx`

**Interfaces:**
- Consumes: `getState` (Task 6), `completeBatchAction` (Task 6).

- [ ] **Step 1: Rewrite `app/src/app/founder/page.tsx`**

```tsx
import { FounderShell } from "@/components/founder-shell";
import { DashboardSummary } from "@/components/packing-panel";
import { getState } from "@/lib/db/get-state";

export default async function FounderDashboard() {
  const session = await getState();
  return (
    <FounderShell active="Beranda" title="Beranda" subtitle="Ringkasan operasional hari ini">
      <DashboardSummary session={session} />
    </FounderShell>
  );
}
```

(Drop the stale `data sesi prototipe` subtitle wording and the "removed until Phase 3" comment reference — persistence has landed, the Ready-to-Sell note no longer belongs on this specific subtitle line. Keep the actual Ready-to-Sell panel omission as-is; that's still correct, just don't describe the app as session-based anymore.)

- [ ] **Step 2: Rewrite `app/src/components/packing-panel.tsx`**

```tsx
"use client";

import Link from "next/link";
import { ArrowRight, CheckCircle, WarningCircle } from "@phosphor-icons/react";
import { useState, useTransition } from "react";
import { formatQuantity, formatRupiah, products } from "@/lib/domain/catalog";
import * as op from "@/lib/domain/operations";
import { formatDate, jakartaNow } from "@/lib/domain/schedule";
import { completeBatchAction } from "@/lib/domain/actions";
import styles from "./founder.module.css";

const shortMoney = (value: number) => (value >= 1_000_000 ? `Rp${(value / 1_000_000).toLocaleString("id-ID", { maximumFractionDigits: 2 })} jt` : value >= 1000 ? `Rp${Math.round(value / 1000)} rb` : formatRupiah(value));

export function DashboardSummary({ session }: { session: op.State }) {
  const month = jakartaNow(new Date()).date.slice(0, 7);
  const active = session.orders.filter((o) => o.status === "NEEDS_PREPARATION" || o.status === "READY_FOR_HANDOVER");
  const unpaid = session.orders.filter((o) => o.status !== "CANCELLED" && !op.isPaid(o));
  const revenue = session.orders.filter((o) => o.status !== "CANCELLED" && jakartaNow(new Date(o.createdAt)).date.startsWith(month)).reduce((sum, o) => sum + o.total, 0);
  const lowStock = op.balances(session).filter((item) => item.available < item.threshold);
  const nextBatch = op.pendingBatchDates(session)[0];

  return (
    <>
      {session.storeStatus === "PAUSED" && <p className={`status status-danger ${styles.banner}`}><WarningCircle size={15} /> Pemesanan sedang dijeda. <Link href="/founder/availability">Buka kalender</Link></p>}
      <section className={styles.metricGrid}>
        <Link href="/founder/orders" className={styles.metric}><span>Pesanan aktif</span><strong>{active.length}</strong><small>{active.filter((o) => o.status === "NEEDS_PREPARATION").length} perlu disiapkan</small></Link>
        <Link href="/founder/finance" className={styles.metric}><span>Omzet bulan ini</span><strong>{shortMoney(revenue)}</strong><small>Pesanan tidak dibatalkan</small></Link>
        <Link href="/founder/finance" className={`${styles.metric} ${unpaid.length ? styles.metricAlert : ""}`}><span>Belum dibayar</span><strong>{shortMoney(unpaid.reduce((sum, o) => sum + op.receivable(o), 0))}</strong><small>{unpaid.length} pesanan · lihat piutang</small></Link>
        <Link href="/founder/availability" className={styles.metric}><span>Batch packing berikutnya</span><strong>{nextBatch ? formatDate(nextBatch, "short") : "—"}</strong><small>Cut-off harian 18.00 WIB</small></Link>
      </section>

      <section className={styles.dashboardGrid}>
        <article className={styles.panel}>
          <div className={styles.panelHeader}><div><h2>Perlu perhatian</h2><p>Tindakan yang disarankan hari ini</p></div></div>
          <div className={styles.attentionList}>
            {lowStock.map((item) => (
              <div className={styles.attention} key={item.id}><Link href="/founder/stock"><strong><WarningCircle size={16} /> {item.name} di bawah ambang</strong></Link><span>{formatQuantity(item.id, item.available)} tersedia setelah reservasi</span><span className={`status ${item.available < 0 ? "status-danger" : "status-warning"}`}>Pesan ulang</span></div>
            ))}
            {unpaid.filter((o) => o.status === "READY_FOR_HANDOVER").map((o) => (
              <div className={styles.attention} key={o.id}><Link href="/founder/orders?tab=READY_FOR_HANDOVER"><strong>Pembayaran {o.id}</strong></Link><span>{o.fulfillment === "DELIVERY" ? "Wajib lunas sebelum dikirim" : "Jatuh tempo saat serah terima"}</span><span className="status status-danger">{formatRupiah(op.receivable(o))}</span></div>
            ))}
            {lowStock.length === 0 && !unpaid.some((o) => o.status === "READY_FOR_HANDOVER") && <p className={styles.empty}>Tidak ada yang mendesak.</p>}
          </div>
        </article>
        <PackingPanel session={session} />
      </section>
    </>
  );
}

export function PackingPanel({ session }: { session: op.State }) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const date = op.pendingBatchDates(session)[0];
  const orders = session.orders.filter((o) => o.status === "NEEDS_PREPARATION" && o.currentReadyDate === date);
  const ids = new Set(orders.map((o) => o.id));
  const units = Object.fromEntries(products.map((p) => [p.id, orders.flatMap((o) => o.items).filter((i) => i.productId === p.id).reduce((sum, i) => sum + i.quantity, 0)]));
  const rawCheese = session.reservations.filter((r) => ids.has(r.orderId) && r.state === "ACTIVE" && r.itemId === "raw_cheese").reduce((sum, r) => sum + r.quantity, 0);
  const cheese = op.balances(session)[0];

  const complete = () => {
    if (!window.confirm(`Semua produk untuk ${orders.length} pesanan sudah dipacking? Stok bahan akan dikurangi dan pesanan pindah ke Siap Diserahkan.`)) return;
    startTransition(async () => {
      const { error } = await completeBatchAction(date);
      setError(error);
    });
  };

  return (
    <article className={styles.panel}>
      <div className={styles.panelHeader}><div><h2>Batch packing berikutnya</h2><p>{date ? `${formatDate(date)} · ${orders.length} pesanan` : "Belum ada pesanan untuk dipacking"}</p></div><Link href="/founder/orders" className={styles.textLink}>Buka pesanan <ArrowRight size={15} /></Link></div>
      {date ? <>
        <div className={styles.packing}>
          {products.map((p) => <div key={p.id} className={styles.packItem}><div><strong>{units[p.id]}</strong><span>{p.name} · {p.netGrams}g</span></div><small>{(units[p.id] * p.netGrams).toLocaleString("id-ID")}g bersih</small></div>)}
        </div>
        <div className={styles.materials}><span>Kebutuhan bahan baku</span><b>{formatQuantity("raw_cheese", rawCheese)} cheese stick</b></div>
        <div className={styles.materials}><span>Quality-selection Milieu</span><b>±{formatQuantity("raw_cheese", units.milieu * (products[0].recipe.raw_cheese - products[0].netGrams * 100))} untuk konsumsi pribadi</b></div>
        {cheese.onHand < rawCheese && <p className={styles.hint}>Stok fisik {formatQuantity("raw_cheese", cheese.onHand)} belum cukup untuk batch ini.</p>}
        <button className={`btn btn-primary ${styles.batchButton}`} disabled={pending} onClick={complete}>Selesaikan batch · {orders.length} pesanan</button>
        {error && <p role="alert" className={styles.hint}>{error}</p>}
      </> : <p className={styles.batchDone}><CheckCircle size={18} weight="fill" /> Semua batch selesai.</p>}
    </article>
  );
}
```

- [ ] **Step 3: Verify**

Run: `cd "/Users/randalubis/Documents/ChatGPT/Le Nouette/app" && npx tsc --noEmit && npm run build`

Manual check: `npm run dev`, open `/founder`, confirm the dashboard renders with seeded data and the packing panel's "Selesaikan batch" button works.

- [ ] **Step 4: Commit**

```bash
cd "/Users/randalubis/Documents/ChatGPT/Le Nouette"
git add app/src/app/founder/page.tsx app/src/components/packing-panel.tsx
git commit -m "Rewire dashboard and packing panel onto Server Actions and Postgres state

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 12: Rewire stock, finance, and availability boards

**Files:**
- Modify: `app/src/app/founder/stock/page.tsx`
- Modify: `app/src/app/founder/finance/page.tsx`
- Modify: `app/src/app/founder/availability/page.tsx`
- Modify: `app/src/components/founder-boards.tsx`

**Interfaces:**
- Consumes: `getState` (Task 6), `receiveStockAction`, `stockOpnameAction`, `setDateStatusAction`, `setStoreStatusAction`, `rescheduleOrderAction` (Task 6).

- [ ] **Step 1: Rewrite the three page files** (identical shape, one per board):

```tsx
// app/src/app/founder/stock/page.tsx
import { FounderShell } from "@/components/founder-shell";
import { StockBoard } from "@/components/founder-boards";
import { getState } from "@/lib/db/get-state";

export default async function Page() {
  const session = await getState();
  return (
    <FounderShell active="Stok" title="Stok & bahan" subtitle="Stok fisik, reservasi, dan tersedia untuk pesanan baru">
      <StockBoard session={session} />
    </FounderShell>
  );
}
```

```tsx
// app/src/app/founder/finance/page.tsx
import { FounderShell } from "@/components/founder-shell";
import { FinanceBoard } from "@/components/founder-boards";
import { getState } from "@/lib/db/get-state";

export default async function Page() {
  const session = await getState();
  return (
    <FounderShell active="Keuangan" title="Keuangan" subtitle="Omzet, pembayaran, dan piutang operasional">
      <FinanceBoard session={session} />
    </FounderShell>
  );
}
```

```tsx
// app/src/app/founder/availability/page.tsx
import { FounderShell } from "@/components/founder-shell";
import { AvailabilityBoard } from "@/components/founder-boards";
import { getState } from "@/lib/db/get-state";

export default async function Page() {
  const session = await getState();
  return (
    <FounderShell active="Kalender" title="Kalender & status toko" subtitle="Tanggal operasional dan jeda pemesanan">
      <AvailabilityBoard session={session} />
    </FounderShell>
  );
}
```

- [ ] **Step 2: Rewrite `app/src/components/founder-boards.tsx`**

```tsx
"use client";

import { WarningCircle } from "@phosphor-icons/react";
import { useState, useTransition } from "react";
import { formatQuantity, formatRupiah, type ItemId } from "@/lib/domain/catalog";
import * as op from "@/lib/domain/operations";
import { formatDate, jakartaNow, recommendReschedule, type DateStatus } from "@/lib/domain/schedule";
import { itemsLabel } from "@/components/order-board";
import { receiveStockAction, stockOpnameAction, setDateStatusAction, setStoreStatusAction, rescheduleOrderAction } from "@/lib/domain/actions";
import styles from "./founder.module.css";

const today = () => jakartaNow(new Date()).date;

// Raw cheese is entered in grams; everything else in pieces.
const toStored = (item: ItemId, input: string) => Math.round(Number(input) * (item === "raw_cheese" ? 100 : 1));

export function StockBoard({ session }: { session: op.State }) {
  const [draft, setDraft] = useState<Partial<Record<ItemId, string>>>({});
  const [message, setMessage] = useState<{ id: ItemId; text: string } | null>(null);
  const [, startTransition] = useTransition();

  const act = (id: ItemId, action: Promise<{ error: string | null }>) => {
    startTransition(async () => {
      const { error } = await action;
      setMessage(error ? { id, text: error } : null);
      if (!error) setDraft((current) => ({ ...current, [id]: "" }));
    });
  };
  const items = op.balances(session);

  return (
    <>
      <div className={styles.stockHeader}><div><h2>Inventaris utama</h2><p>Stok fisik dikurangi reservasi pesanan. Peringatan hanya mengingatkan, tidak memesan otomatis.</p></div></div>
      <section className={styles.stockGrid}>
        {items.map((item) => {
          const low = item.available < item.threshold;
          const value = draft[item.id] ?? "";
          return (
            <article key={item.id} className={`${styles.stockCard} ${low ? styles.warn : ""}`}>
              <div className={styles.stockCardTop}><h3>{item.name}</h3>{low ? <span className="status status-warning"><WarningCircle size={13} /> Rendah</span> : <span className="status status-safe">Aman</span>}</div>
              <div className={styles.stockValue}>{formatQuantity(item.id, item.available)}</div>
              <p>tersedia · fisik {formatQuantity(item.id, item.onHand)} · reservasi {formatQuantity(item.id, item.reserved)}</p>
              <div className={styles.cardActions}>
                <input className={styles.search} style={{ minWidth: 0, flex: "1 1 100%" }} type="number" min={0} inputMode="decimal" aria-label={`Jumlah ${item.name}`} placeholder={item.id === "raw_cheese" ? "Gram" : "Pcs"} value={value} onChange={(event) => setDraft((current) => ({ ...current, [item.id]: event.target.value }))} />
                <button className="btn btn-quiet" disabled={!value} onClick={() => act(item.id, receiveStockAction(item.id, toStored(item.id, value)))}>Terima stok</button>
                <button className="btn btn-quiet" disabled={value === ""} onClick={() => act(item.id, stockOpnameAction(item.id, toStored(item.id, value)))}>Hasil opname</button>
              </div>
              {message?.id === item.id && <p role="alert" className={styles.hint}>{message.text}</p>}
              <div className={styles.stockFooter}><span>Ambang {formatQuantity(item.id, item.threshold)}</span></div>
            </article>
          );
        })}
      </section>
      <section className={`${styles.panel} ${styles.receivables}`}>
        <div className={styles.panelHeader}><div><h2>Riwayat pergerakan stok</h2><p>Pergerakan tidak diubah atau dihapus; koreksi dicatat sebagai opname.</p></div></div>
        {session.movements.slice(-10).reverse().map((m) => (
          <div className={styles.paymentRow} key={m.id}><div><strong>{items.find((i) => i.id === m.itemId)!.name}</strong><small>{new Date(m.at).toLocaleString("id-ID", { timeZone: "Asia/Jakarta" })}</small></div><div>{{ RECEIPT: "Penerimaan", STOCK_OPNAME: "Opname", PACKING_CONSUMPTION: "Konsumsi packing" }[m.reason]}</div><strong>{m.delta > 0 ? "+" : ""}{formatQuantity(m.itemId, m.delta)}</strong></div>
        ))}
      </section>
    </>
  );
}

export function FinanceBoard({ session }: { session: op.State }) {
  const orders = session.orders.filter((o) => o.status !== "CANCELLED");
  const payments = session.orders.flatMap((o) => o.payments.filter((p) => !p.reversedAt));
  const received = payments.reduce((sum, p) => sum + p.amount, 0);
  const share = (method: op.PaymentMethod) => (received ? `${Math.round((payments.filter((p) => p.method === method).reduce((s, p) => s + p.amount, 0) / received) * 100)}%` : "—");

  return (
    <>
      <section className={styles.financeHero}>
        <div><span>Omzet (sesi ini)</span><h2>{formatRupiah(orders.reduce((sum, o) => sum + o.total, 0))}</h2><p>{orders.length} pesanan · {orders.flatMap((o) => o.items).reduce((s, i) => s + i.quantity, 0)} produk</p></div>
        <div className={styles.financeSide}>
          <div><strong>{formatRupiah(received)}</strong><span>Sudah diterima</span></div>
          <div><strong>{formatRupiah(orders.reduce((sum, o) => sum + op.receivable(o), 0))}</strong><span>Belum dibayar</span></div>
          <div><strong>{share("TRANSFER")}</strong><span>Transfer</span></div>
          <div><strong>{share("QRIS")}</strong><span>QRIS · Tunai {share("CASH")}</span></div>
        </div>
      </section>
      <section className={`${styles.panel} ${styles.receivables}`}>
        <div className={styles.panelHeader}><div><h2>Pesanan & piutang</h2><p>Pesanan selesai boleh belum dibayar; konfirmasi pembayaran dilakukan founder di Pesanan.</p></div></div>
        {[...orders].reverse().map((o) => (
          <div className={styles.paymentRow} key={o.id}><div><strong>{o.customer.name}</strong><small>{o.id} · {itemsLabel(o)}</small></div><div><span className={`status ${op.isPaid(o) ? "status-safe" : "status-danger"}`}>{op.isPaid(o) ? "Lunas" : `Piutang ${formatRupiah(op.receivable(o))}`}</span></div><strong>{formatRupiah(o.total)}</strong></div>
        ))}
      </section>
    </>
  );
}

export function AvailabilityBoard({ session }: { session: op.State }) {
  const [date, setDate] = useState("");
  const [status, setStatus] = useState<DateStatus>("HOLIDAY");
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const affected = date ? op.ordersOnDate(session, date) : [];
  const suggestion = affected.length ? recommendReschedule(date, { ...session.calendar, [date]: status }, today()) : null;
  const act = (action: Promise<{ error: string | null }>) => startTransition(async () => setError((await action).error));
  const block = () => act(setDateStatusAction(date, status));
  const moveAndBlock = () => act((async () => {
    for (const order of affected) {
      const { error } = await rescheduleOrderAction(order.id, suggestion!);
      if (error) return { error };
    }
    return setDateStatusAction(date, status);
  })());
  const upcoming = Object.entries(session.calendar).filter(([d]) => d >= today()).sort();
  const paused = session.storeStatus === "PAUSED";

  return (
    <>
      <section className={styles.panel}>
        <div className={styles.panelHeader}>
          <div><h2>Status toko</h2><p>{paused ? "Pesanan baru ditolak. Pesanan yang ada tetap berjalan." : "Toko menerima pesanan. Tanggal tertutup dilewati otomatis."}</p></div>
          <button className={`btn ${paused ? "btn-primary" : "btn-quiet"}`} onClick={() => act(setStoreStatusAction(paused ? "OPEN" : "PAUSED"))}>{paused ? "Buka pemesanan" : "Jeda pemesanan"}</button>
        </div>
      </section>

      <section className={`${styles.panel} ${styles.receivables}`}>
        <div className={styles.panelHeader}><div><h2>Tutup tanggal</h2><p>Libur nasional atau keperluan keluarga. Pesanan pada tanggal itu harus dipindahkan dulu.</p></div></div>
        <div className={styles.cardActions}>
          <input className={styles.search} type="date" min={today()} aria-label="Tanggal" value={date} onChange={(event) => setDate(event.target.value)} />
          <select className={styles.search} aria-label="Jenis" value={status} onChange={(event) => setStatus(event.target.value as DateStatus)}><option value="HOLIDAY">Libur nasional</option><option value="UNAVAILABLE">Tidak tersedia</option></select>
          {affected.length === 0 && <button className="btn btn-primary" disabled={!date} onClick={block}>Tutup tanggal</button>}
        </div>
        {affected.length > 0 && (
          <div className={styles.attention}>
            <strong><WarningCircle size={16} /> {affected.length} pesanan pada {formatDate(date)}</strong>
            <span>{affected.map((o) => `${o.id} (${itemsLabel(o)})`).join(" · ")}</span>
            {suggestion
              ? <button className="btn btn-primary" onClick={moveAndBlock}>Pindahkan ke {formatDate(suggestion)} & tutup</button>
              : <span className="status status-danger">Tidak ada tanggal pengganti otomatis. Sepakati tanggal dengan pelanggan atau batalkan pesanan.</span>}
          </div>
        )}
        {error && <p role="alert" className={styles.hint}>{error}</p>}
      </section>

      <section className={`${styles.panel} ${styles.receivables}`}>
        <div className={styles.panelHeader}><div><h2>Tanggal tertutup</h2><p>Mandiri, BI, dan pengiriman memakai kalender yang sama.</p></div></div>
        {upcoming.length === 0 && <p className={styles.empty}>Belum ada tanggal tertutup.</p>}
        {upcoming.map(([d, s]) => (
          <div className={styles.paymentRow} key={d}><div><strong>{formatDate(d)}</strong><small>{s === "HOLIDAY" ? "Libur nasional" : "Tidak tersedia"}</small></div><div /><button className={styles.textLink} onClick={() => act(setDateStatusAction(d, null))}>Buka kembali</button></div>
        ))}
      </section>
    </>
  );
}
```

`moveAndBlock` used to run `rescheduleOrder`+`setDateStatus` as one atomic in-memory pipeline (`affected.reduce(...)` then `setDateStatus`). Each is now a separate transaction (its own advisory-lock round trip), so it's sequenced instead of atomic — if a reschedule fails partway, some orders move and the date doesn't get blocked. This is an accepted behavior change from before (flagged here, not silently different): the original synchronous version wasn't atomic against real concurrent access either (it was a single JS closure over in-memory sessionStorage, no real transaction semantics), so this isn't a regression in practice, just now visible as "wait for it" plumbing. If a partial-failure UX matters later, wrap the whole sequence in one new `moveAndBlockAction` server action that calls `op.rescheduleOrder` N times then `op.setDateStatus` inside a single `withDomainTransaction` — not needed for this pass since the affected-order count for a single date block is always small (a handful of orders at most) and the founder sees the error immediately if one step fails.

- [ ] **Step 3: Verify**

Run: `cd "/Users/randalubis/Documents/ChatGPT/Le Nouette/app" && npx tsc --noEmit && npm run build`

Manual check: `npm run dev`, open `/founder/stock`, receive stock on an item, confirm it persists on reload; open `/founder/availability`, pause the store, confirm the storefront (`/`) shows the paused banner after reload.

- [ ] **Step 4: Commit**

```bash
cd "/Users/randalubis/Documents/ChatGPT/Le Nouette"
git add app/src/app/founder/stock/page.tsx app/src/app/founder/finance/page.tsx app/src/app/founder/availability/page.tsx app/src/components/founder-boards.tsx
git commit -m "Rewire stock, finance, and availability boards onto Server Actions

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 13: Retire session-store.ts and the reset button

**Files:**
- Modify: `app/src/components/reset-session.tsx`
- Delete: `app/src/lib/session-store.ts`
- Modify: any remaining importer of `@/lib/session-store` (should be none after Tasks 9–12 — grep to confirm)

**Interfaces:**
- Consumes: none new (reset becomes a thin dev-only truncate, not exposed to real customers).

- [ ] **Step 1: Grep for remaining `session-store` references**

Run: `cd "/Users/randalubis/Documents/ChatGPT/Le Nouette/app" && grep -rn "session-store" src`
Expected: only `src/lib/session-store.ts` itself and `src/components/reset-session.tsx`.

- [ ] **Step 2: Add a dev-only reset action to `app/src/lib/domain/actions.ts`**

Append:
```ts
export async function resetSeedAction() {
  if (process.env.NODE_ENV === "production") return { error: "Reset hanya tersedia di lingkungan development." };
  const { db } = await import("@/lib/db/client");
  const schema = await import("@/lib/db/schema");
  await db.transaction(async (tx) => {
    await tx.delete(schema.reservations);
    await tx.delete(schema.orderItems);
    await tx.delete(schema.payments);
    await tx.delete(schema.orders);
    await tx.delete(schema.movements);
    await tx.delete(schema.auditEvents);
    await tx.delete(schema.calendarDates);
    await tx.update(schema.storeStatus).set({ status: "OPEN" });
  });
  revalidateAll();
  return { error: null };
}
```

- [ ] **Step 3: Rewrite `app/src/components/reset-session.tsx`**

```tsx
"use client";

import { useTransition } from "react";
import { resetSeedAction } from "@/lib/domain/actions";

export function ResetSessionButton() {
  const [pending, startTransition] = useTransition();
  return (
    <button
      className="btn btn-quiet"
      disabled={pending}
      onClick={() => window.confirm("Hapus semua data dan mulai kosong? (Jalankan `npm run db:seed` setelahnya untuk data contoh.)") && startTransition(() => resetSeedAction())}
    >
      Reset data
    </button>
  );
}
```

- [ ] **Step 4: Delete `app/src/lib/session-store.ts`**

Run: `rm "/Users/randalubis/Documents/ChatGPT/Le Nouette/app/src/lib/session-store.ts"`

- [ ] **Step 5: Verify**

Run: `cd "/Users/randalubis/Documents/ChatGPT/Le Nouette/app" && grep -rn "session-store" src`
Expected: no matches.

Run: `cd "/Users/randalubis/Documents/ChatGPT/Le Nouette/app" && npx tsc --noEmit && npm run build`
Expected: build succeeds with the file gone.

- [ ] **Step 6: Commit**

```bash
cd "/Users/randalubis/Documents/ChatGPT/Le Nouette"
git add app/src/lib/domain/actions.ts app/src/components/reset-session.tsx
git rm app/src/lib/session-store.ts
git commit -m "Remove session-store.ts now that Postgres is the system of record

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 14: End-to-end verification and docs update

**Files:**
- Modify: `docs/implementation-status.md`

**Interfaces:**
- Consumes: nothing new — this is a manual pass plus the doc-sync convention the project already has (`docs/implementation-status.md` is the single source of truth for built-vs-backlog, per `AGENTS.md`'s docs persona).

- [ ] **Step 1: Full test suite**

Run: `cd "/Users/randalubis/Documents/ChatGPT/Le Nouette/app" && npm test && npm run test:integration && npm run lint && npm run build`
Expected: all green.

- [ ] **Step 2: Manual end-to-end walkthrough**

`npm run dev`, then in the browser:
1. Place an order on `/` as a customer (any product, PICKUP_MANDIRI).
2. Confirm it appears in `/founder/orders` under "Perlu Disiapkan".
3. Record a payment on it.
4. Complete the packing batch for its ready date from `/founder` (dashboard packing panel).
5. Mark it "Tandai Selesai".
6. **Restart the dev server** (`Ctrl-C`, `npm run dev` again) and reload `/founder/orders` → "Selesai" tab.
Expected: the order is still there, still marked paid and completed — proving state survived a full process restart (the thing sessionStorage never could).

- [ ] **Step 3: Update `docs/implementation-status.md`**

Move the "Persistence" row from the Backlog table to the Built and tested table:

```
| Persistence (Postgres via Supabase, Drizzle) | ✅ BUILT | `app/src/lib/db/` (schema, client, loadState, diffAndWrite), server actions in `app/src/lib/domain/actions.ts`. Lean schema mirroring `operations.ts` state shape, not the full 18-table spec — see `docs/superpowers/specs/2026-09-21-supabase-persistence-design.md` for the scope decision. |
```

Update the "Order/inventory/payment transactions" row in Partial — it's no longer partial:

```
Remove that row from Partial; business logic now runs against a real transactional database (Supabase Postgres via Drizzle), one global advisory lock serializing writes.
```

Update the "API routes / server actions" backlog row — also done:

```
Remove that row from Backlog; every domain command now runs through a Server Action in `app/src/lib/domain/actions.ts`.
```

- [ ] **Step 4: Commit**

```bash
cd "/Users/randalubis/Documents/ChatGPT/Le Nouette"
git add docs/implementation-status.md
git commit -m "Update implementation status: Supabase persistence is built

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

- [ ] **Step 5: Push**

Per `CLAUDE.md`: "After a verified working change, commit and push to `main` — no confirmation needed for this repo." All tasks above verified (tests, build, manual walkthrough) — push now.

```bash
cd "/Users/randalubis/Documents/ChatGPT/Le Nouette" && git push
```

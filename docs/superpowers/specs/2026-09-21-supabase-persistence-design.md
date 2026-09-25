# Supabase persistence — design

**Status: shipped** — See [Implementation status](../../implementation-status.md) for evidence (Persistence row, ✅ BUILT).

[← Implementation status](../../implementation-status.md) · [← Data model](../../technical/data-model.md) · [← Architecture](../../technical/architecture.md)

## Context

`docs/implementation-status.md` names persistence as the single biggest gap versus both specs: all state currently lives in `app/src/lib/session-store.ts` (browser `sessionStorage`, reseeded with fake demo data, wiped on tab close). This spec covers replacing that with real Postgres (Supabase) persistence via Drizzle, while keeping the existing pure domain layer (`app/src/lib/domain/operations.ts`) completely unchanged — it is already a tested, correct state machine; the goal is to give it durable storage, not to rewrite it.

This is one of nine items in the project backlog (see implementation-status.md). Founder authentication (`founder_users`, login, `verified_by`/`created_by` tracking) is explicitly **out of scope** — that's backlog item #2, tackled separately. The full 18-table normalized schema in `data-model.md` is explicitly **not** the target here — this spec covers a leaner schema that mirrors what `operations.ts` actually models today (orders with embedded items/payments, flat movements/reservations, no separate customer/product/fulfillment entities). Widening to the full spec schema is a future migration once auth and the Ready-to-Sell tier land and those entities actually need to exist separately.

## Goals

- Replace `sessionStorage` with Supabase Postgres as the system of record.
- Preserve `operations.ts` byte-for-byte — no domain logic changes, no test changes to `domain.test.ts`.
- Make writes safe under concurrent Founder OS usage (two founders using the app at once).
- Keep local dev unblocked even before a cloud Supabase project exists.
- Migrate the 5 UI call sites off the synchronous `run()`/`useSession()` API onto Server Actions.

## Non-goals

- Founder auth, `founder_users`, `verified_by`/`created_by` fields.
- The full 18-table spec schema (customers, products, fulfillments, ready_product_movements, founder_users, order_reschedules as a distinct table).
- Realtime cross-tab/cross-device sync (Supabase Realtime) — a revalidation-on-action refresh is enough for this traffic scale.
- Vercel deployment itself (separate backlog item; this spec only requires the app to run against a real Postgres instance, local or cloud).

## Architecture

```text
Client component (storefront.tsx, order-board.tsx, ...)
        │  useTransition() + call server action
        ▼
Server Action ("use server", app/src/lib/domain/actions.ts)
        │  1. pg_advisory_xact_lock(1)          — serialize all domain writes
        │  2. loadState(tx)                     — reconstruct operations.State from tables
        │  3. operations.someCommand(state, ...)— pure, throws DomainError on rejection
        │  4. diffAndWrite(tx, prev, next)       — insert/update only what changed
        │  5. revalidatePath(...)
        ▼
Postgres (Supabase in prod, `supabase start` local Postgres in dev)
```

Everything below the server action boundary runs inside one Drizzle transaction. The advisory lock means every domain write across the whole app is fully serialized — no row-level lock design needed. At this business's order volume (single digits per day), a global lock adds no perceptible latency and removes an entire class of race-condition bugs (e.g. two founders completing the same batch, or the `LN-000N` sequence racing) for free.

## Schema

Drizzle schema in `app/src/lib/db/schema.ts`, mirroring `operations.ts` types directly:

| Table | Columns | Notes |
|---|---|---|
| `orders` | `id` (text PK, `LN-0001` style), `idempotency_key` (unique), `created_at`, `customer_name`, `customer_whatsapp`, `fulfillment`, `address`, `note`, `total`, `promised_ready_date`, `current_ready_date`, `status`, `ready_at`, `dispatched_at`, `completed_at`, `cancelled_at` | 1:1 with `Order` minus `items`/`payments` |
| `order_items` | `id` (serial PK), `order_id` FK, `product_id`, `name`, `unit_price`, `quantity`, `recipe` (jsonb) | `recipe` stays JSON — it's a point-in-time snapshot, never queried relationally, matches how the domain type already treats it |
| `payments` | `id` (text PK, `LN-0001-P1` style), `order_id` FK, `amount`, `method`, `at`, `reversed_at` | |
| `movements` | `id` (text PK, `M-123` style), `item_id`, `delta`, `reason`, `at`, `ref` | append-only, never updated after insert except this app never edits movements — matches invariant 12 |
| `reservations` | `id` (serial PK), `order_id` FK, `item_id`, `quantity`, `state` | |
| `calendar_dates` | `date` (text PK), `status` | one row per overridden date; matches `State.calendar` being a sparse map |
| `store_status` | `id` (fixed `1`, PK), `status` | singleton row, seeded once by migration |
| `audit_events` | `id` (serial PK), `at`, `action`, `ref` | append-only |
| `order_seq` | Postgres `SEQUENCE`, not a table | replaces `state.seq` for `LN-000N` generation — avoids the race of counting `orders.length` |

No `customers`, `products`, `fulfillments`, `founder_users`, `ready_product_movements`, or `order_reschedules` tables (reschedule already recorded as an audit event, matching current domain behavior).

## Write path (`loadState` / `diffAndWrite`)

- `loadState(tx)`: `SELECT *` from all 8 tables, reassemble into `operations.State` (join `order_items`/`payments`/`reservations` back onto their `orders` by `order_id`, fold `calendar_dates` rows into the `Calendar` map). This is a handful of queries against small tables — the whole business's lifetime order history is expected to be low thousands of rows at most, so no pagination/streaming concern.
- `diffAndWrite(tx, prev, next)`: compare `prev`/`next` `State` by table.
  - `orders`: any order whose id is new → insert; whose fields changed → update (shallow field compare, since `withOrder`'s patches are the only mutation path).
  - `order_items`: only ever inserted (orders are created with items already attached; items are never edited in place today) — insert rows for orders new in this diff.
  - `payments`, `reservations`: rows present in `next` but not `prev` (by id) → insert; rows whose mutable fields (`reversedAt`, `state`) changed → update.
  - `movements`, `audit_events`: append-only — any row in `next` beyond `prev`'s length → insert. Never updated, never deleted (matches invariants 9/12).
  - `calendar_dates`: diff the map — added/changed keys → upsert, removed keys → delete (this one *is* deletable; `setDateStatus(..., null, ...)` explicitly clears an override).
  - `store_status`: single-row upsert if changed.
- All ids continue to be generated exactly as `operations.ts` already does (`LN-${seq}`, `M-${movements.length+1}`, etc.) — the loaded `state.seq`/array lengths feed the same ID-generation code paths, so no `operations.ts` change is needed. The advisory lock guarantees no other transaction can interleave and invalidate those lengths.

## Server actions

New file `app/src/lib/domain/actions.ts` (or split per feature area if it grows unwieldy — start as one file, split when it's actually hard to navigate). One `"use server"` async function per `operations.ts` export used by the UI: `createOrderAction`, `cancelOrderAction`, `rescheduleOrderAction`, `completeBatchAction`, `dispatchOrderAction`, `completeOrderAction`, `recordPaymentAction`, `reversePaymentAction`, `receiveStockAction`, `stockOpnameAction`, `setDateStatusAction`, `setStoreStatusAction`. Each follows the same shape:

```ts
export async function createOrderAction(input: op.CreateOrderInput) {
  return withDomainTransaction((state, now) => op.createOrder(state, input, now));
}
```

`withDomainTransaction` is the one shared helper implementing lock → load → run → catch `DomainError` → diff/write → revalidate → return `{ error: string | null }` (mirrors today's `run()` return contract, so calling components change their plumbing but not their error-handling shape).

## UI migration

Each of the 5 call sites (`storefront.tsx`, `order-board.tsx`, `founder-boards.tsx`, `packing-panel.tsx`, `reset-session.tsx`) swaps:
- `useSession()` (client `useSyncExternalStore` over `sessionStorage`) → data passed down from a server component that queries the DB directly (or a lightweight client fetch if the page must stay a client component — decide per file during implementation, default to server component where the file structure allows it).
- `run(cmd)` (synchronous) → `startTransition(async () => { const { error } = await someAction(...); ... })` via `useTransition()`, since the call is now async.

`reset-session.tsx` (currently clears `sessionStorage`) becomes a dev-only server action that truncates the domain tables and re-runs the seed script — kept for local testing convenience, not exposed in a way a real customer could trigger.

No new client data-fetching dependency (no SWR/React Query) — Next's Server Actions + `revalidatePath` already give "mutate then see fresh data" at this app's traffic scale.

## Local dev & migrations

- Add `drizzle-orm`, `drizzle-kit`, `postgres` (driver) to `app/package.json`.
- `app/drizzle/` holds generated SQL migrations, committed to git, reviewed before merge (per architecture.md's "never schema-push directly against production").
- `app/drizzle.config.ts` points at `DATABASE_URL`.
- Local dev: Supabase CLI (`supabase start`) runs a local Postgres in Docker — this unblocks development before a cloud Supabase project exists. `.env.local.example` gets `DATABASE_URL`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` placeholders (the latter two already exist as empty placeholders in `.env.example`).
- Provisioning an actual cloud Supabase project is a manual step for the user (I can't create cloud accounts) — the plan will include the exact steps/values needed when that happens, but implementation and testing proceed against local Postgres in the meantime.
- Seed script: port the existing `seed()` function out of `session-store.ts` into a `app/drizzle/seed.ts` runnable script, so local/dev DBs start with the same demo data the app currently seeds into sessionStorage.

## Testing

- `operations.ts` + `domain.test.ts` unchanged — still the correctness source of truth for business rules, still pure/fast (`node --test`).
- New integration test (`app/src/lib/domain/actions.test.ts` or similar) against local Postgres: round-trips one or two commands through `withDomainTransaction` to prove `loadState`/`diffAndWrite` correctly reconstruct and persist state. Not a full re-test of business rules — those stay in `domain.test.ts`.
- Manual verification: run app against local Postgres, exercise storefront order creation + Founder OS packing/payment flow end-to-end, confirm state survives a server restart (proving it's no longer sessionStorage-backed).

## Open questions for implementation time (not blocking this spec)

- Exact Drizzle column types for money (`integer`, per architecture.md §5.2) and dates (`date` vs `text` for `YYYY-MM-DD` business dates, per §5.4) — follow architecture.md's conventions section directly, no new decision needed.
- Whether `order_items`/`reservations` need `updated_at` per architecture.md §5.4's "every table with mutable state" rule — `order_items` is insert-only today so no; `reservations` mutates `state`, so yes, add it.

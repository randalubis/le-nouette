# Implementation Status

[← Product spec hub](./product-spec.md) · [← Technical spec hub](./technical-spec.md)

This is the single source of truth for what's actually built versus backlog in the Le Nouette app (`./app`), as of this documentation restructure (21 September 2026). It is a separate axis from the decision-confidence labels used throughout the product and technical spokes (`LOCKED`/`ASSUMPTION`/`OPEN`/`DEFERRED` and `REQUIRED`/`PROPOSED`/`OPEN`/`DEFERRED`) — a `LOCKED` business decision or a `REQUIRED` technical rule can still be entirely unbuilt. Spoke docs point back here with a short `**Implementation: ...**` line; the narrative and evidence live here, not duplicated across spokes.

Status legend: ✅ BUILT · 🚧 PARTIAL · ⏳ BACKLOG

## Built and tested

| Area | Status | Evidence |
|---|---|---|
| Domain state machine (orders, payments, inventory, packing, scheduling commands) | ✅ BUILT | `app/src/lib/domain/operations.ts` — createOrder, cancelOrder, rescheduleOrder, completeBatch, dispatchOrder, completeOrder, recordPayment, reversePayment, receiveStock, stockOpname, setDateStatus, setStoreStatus |
| Scheduling rules (weekday mapping, holiday rule, 18:00 WIB cutoff, reschedule recommendation) | ✅ BUILT | `app/src/lib/domain/schedule.ts` |
| Static product catalog and inventory item list | ✅ BUILT | `app/src/lib/domain/catalog.ts` (hardcoded, not DB-backed — see Persistence below) |
| Domain unit tests | ✅ BUILT (unit-only) | `app/src/lib/domain/domain.test.ts`, 8 tests via `node --test`, covering [§19.1–§19.5](./technical/acceptance-tests.md), [§8.5](./technical/scheduling-engine.md#85-blocking-a-date), [§10.6](./product/inventory-model.md#106-stock-opname-and-adjustment) |
| Customer storefront: 3-screen flow, ID/EN i18n | ✅ BUILT | `app/src/components/storefront.tsx`, `app/src/lib/i18n.ts` |
| Founder OS: Beranda, Pesanan Kanban, Stok, Availability, Keuangan | ✅ BUILT | `app/founder/page.tsx`, `app/founder/orders`, `app/founder/stock`, `app/founder/availability`, `app/founder/finance`, shared `founder-shell.tsx` |
| Remembered customer details (device-local opt-in) | ✅ BUILT | `app/src/lib/remembered.ts` |
| Persistence (Postgres via Supabase, Drizzle) | ✅ BUILT | `app/src/lib/db/` (schema, client, loadState, diffAndWrite), server actions in `app/src/lib/domain/actions.ts`. Lean schema mirroring `operations.ts` state shape, not the full 18-table spec — see `docs/superpowers/specs/2026-09-21-supabase-persistence-design.md` for the scope decision. |

## Partial

| Area | Status | Evidence |
|---|---|---|
| QRIS payment | 🚧 PARTIAL | Static placeholder image only (`storefront.tsx:165,189`); tapping "Bayar sekarang dengan QRIS" never changes payment status. Matches the spec's own note that a static display shouldn't auto-confirm payment ([§11.1](./product/payments-and-receivables.md)), but no real confirmation UX exists either. |
| Acceptance tests | 🚧 PARTIAL | [§19.1–§19.5](./technical/acceptance-tests.md) automated; §19.6–§19.8 have no code to test yet (export, Ready-to-Sell tier still missing; §19.6 login coverage still backlog). |
| Founder authentication / access gating ([§8.1](./product/founder-os.md#81-access-model), [§15](./technical/security.md)) | 🚧 PARTIAL | `/founder/*` is gated by `app/src/proxy.ts` behind a login screen (`app/src/app/login/page.tsx`) and an HMAC-signed session cookie (`app/src/lib/founder-auth.ts`, `app/src/lib/domain/auth-actions.ts`). Deviates from spec: a single shared `ADMIN_EMAIL`/`ADMIN_PASSWORD` env credential, not per-founder Supabase Auth accounts — no individual accounts, no rate-limiting/lockout, no audit trail of who logged in. |

## Backlog

| Area | Status | Evidence |
|---|---|---|
| Ready-to-Sell inventory tier ([§10.1–10.2](./product/inventory-model.md), [§6.14](./technical/data-model.md#614-ready_product_movements)) | ⏳ BACKLOG | Explicitly deferred in code: `operations.ts:100` ("Product Ready to Sell allocation ... is Phase 3; every unit is reserved from raw materials"); the dashboard panel was removed (`app/founder/page.tsx:7`). |
| Referral capture ([§6.4](./product/storefront-experience.md#64-referral-capture)) | ⏳ BACKLOG | Not found anywhere in the storefront code. |
| CSV/XLSX business-data export ([§17.1](./technical/notifications-and-reporting.md#171-portable-business-data-export)) | ⏳ BACKLOG | No export code found (`grep -r "xlsx\|csv\|unduh" app/src` returns nothing). |
| WhatsApp deep-link generation ([§16](./technical/notifications-and-reporting.md)) | ⏳ BACKLOG | No prefilled-message/deep-link code found. |
| Component/integration/e2e tests | ⏳ BACKLOG | Only the domain-layer unit tests and the Postgres load/diff/write integration test exist; no tests for UI components, `i18n.ts`, or `remembered.ts`. |
| Vercel deployment | ⏳ BACKLOG | Not set up; the app has not been deployed yet. |

## How to keep this current

When a backlog item ships, move its row up and update its status here — spoke docs link to this file rather than repeating status prose, so this is the only place that needs editing.

# Le Nouette V1 Technical Specification

**Version:** 0.2.0
**Status:** Proposed implementation baseline — hub, see topic spokes below for detail
**Last updated:** 21 September 2026
**Business authority:** [`docs/product-spec.md`](./product-spec.md)
**Timezone:** `Asia/Jakarta`

Companion document: [Product Specification](./product-spec.md) · [Implementation Status](./implementation-status.md) · [Change Log](./changelog.md)

---

## 1. Purpose

This document translates the agreed Le Nouette business and operating model into an implementation-ready V1 system design. It defines what data exists, how it changes, which rules must always hold, and what the customer and founders can do.

The business specification remains authoritative whenever this technical document conflicts with a locked business decision.

Detailed rules live in the topic spokes linked below, each keeping the original section numbering (`§N`) so this hub, the product spec, and the app's own tests (`app/src/lib/domain/domain.test.ts`) stay cross-referenceable. In particular, `app/src/lib/domain/domain.test.ts` cites `§19.1`–`§19.5`, `§8.5`, and `§10.6` by number — do not renumber [Acceptance Tests](./technical/acceptance-tests.md) or [Scheduling Engine](./technical/scheduling-engine.md).

### 1.1 Technical design principles

1. Use one relational database as the operational source of truth.
2. Prefer database constraints and transactions over distributed workflows.
3. Keep the public storefront and Founder OS in one responsive web application unless deployment evidence requires separation.
4. Store facts and movements; derive balances and summaries.
5. Preserve historical prices, costs, promises, and adjustments.
6. Make order acceptance, reservation changes, packing consumption, and payment recording atomic.
7. Do not require payment gateways, background microservices, message queues, native apps, or real-time sockets in V1.
8. Make every consequential founder action explicit and auditable.

### 1.2 Status labels

- **REQUIRED** — necessary to implement a locked V1 behavior.
- **PROPOSED** — recommended technical choice that may change with stack selection.
- **OPEN** — requires a business or implementation decision.
- **DEFERRED** — intentionally excluded from V1.

These labels describe **decision confidence**, not build status. For what's actually running in the app today versus still backlog, see [Implementation Status](./implementation-status.md) — a separate axis using `✅ BUILT` / `🚧 PARTIAL` / `⏳ BACKLOG`, referenced inline from the spokes below where relevant.

---

## Topic spokes

| Spoke | Covers |
|---|---|
| [Architecture](./technical/architecture.md) | System boundaries, high-level architecture, domain relationship map (ER diagram), data conventions (§2–5) |
| [Core Data Model](./technical/data-model.md) | Full field-level schema for all 18 tables, plus derived values and required invariants (§6–7) |
| [Fulfillment Scheduling Engine](./technical/scheduling-engine.md) | Weekday mapping, availability evaluation, new-order algorithm, checkout cutoff, date blocking, Pause Orders (§8) |
| [Order, Inventory, and Payment Workflows](./technical/workflows.md) | Order lifecycle, inventory workflows, payment workflow, failure handling (§9–11, 18) |
| [Founder OS and Storefront UI Requirements](./technical/ui-requirements.md) | Per-screen Founder OS requirements, public storefront requirements (§12–13) |
| [Application Actions and API Surface](./technical/api-surface.md) | Public/founder reads and commands, concurrency/idempotency, connectivity model (§14) |
| [Authentication, Authorization, and Security](./technical/security.md) | Founder access, public input controls, sensitive data, retention/anonymization, auditability (§15) |
| [Notifications and Reporting](./technical/notifications-and-reporting.md) | WhatsApp message strategy, reporting metric definitions, XLSX export (§16–17) |
| [Acceptance Tests](./technical/acceptance-tests.md) | 50 numbered test assertions across scheduling, ordering, packing, inventory, payments, permissions, connectivity, Ready to Sell (§19) |
| [Build Sequence and Deferred Capabilities](./technical/decisions-and-deferred.md) | Original phased build plan (historical — see Implementation Status for current state), open decisions, deferred technical capabilities (§20–22) |

Also see: [Implementation Status](./implementation-status.md) for what's built vs backlog, and [Change Log](./changelog.md) for the full decision history.

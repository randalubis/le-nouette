# Le Nouette Product and Operating Specification

**Document type:** Living specification hub — see topic spokes below for detail
**Version:** 0.2.0
**Status:** Working baseline
**Last updated:** 21 September 2026
**Primary market and timezone:** Indonesia · Asia/Jakarta
**Source:** Decisions and facts captured in the referenced Cheese Stick Micro Business conversation

Companion document: [Technical Specification](./technical-spec.md) · [Implementation Status](./implementation-status.md) · [Change Log](./changelog.md)

---

## 1. Purpose and governance

This document defines the current business, product, operating, and technical model for Le Nouette. It is the primary reference for future design and development. The purpose is to prevent facts, recommendations, and unresolved ideas from becoming mixed together as the product evolves.

Detailed rules live in the topic spokes linked below, each keeping the original section numbering (`§N`) so this hub, the technical spec, and the app's own tests (`app/src/lib/domain/domain.test.ts`) stay cross-referenceable.

### 1.1 Decision labels

- **LOCKED** — explicitly confirmed by the founders or directly established as current operating reality.
- **ASSUMPTION** — a working calculation, proposed implementation, or recommendation that is useful for design but still needs validation.
- **OPEN** — unresolved and requiring a founder decision, measurement, or external validation.
- **DEFERRED** — intentionally excluded from V1; reconsider only when evidence or scale justifies it.

These labels describe **decision confidence**, not build status. For what's actually shipped in the app versus still backlog, see [Implementation Status](./implementation-status.md) — a separate axis using `✅ BUILT` / `🚧 PARTIAL` / `⏳ BACKLOG`, referenced inline from the spokes below where relevant.

### 1.2 Change discipline

When a material decision changes:

1. Update the affected spoke section.
2. Change its decision label if appropriate.
3. Add an entry to [the change log](./changelog.md).
4. Preserve historical financial values and customer promises; do not rewrite past records to match new settings.

### 1.3 Product north star

**LOCKED:** Le Nouette should become a reliable, low-friction, always-orderable micro business without creating a second full-time job for the founders.

- Near-term, the business should generate dependable profit that can help fund the founders' child's education.
- Long-term, it may become a meaningful income source and an optional exit path from office work for the founder's wife.
- Normal founder attention of approximately **15–30 minutes per day** is acceptable.
- The operating system should create consistency while preserving family time and owner control.

---

## Topic spokes

| Spoke | Covers |
|---|---|
| [Business Context and Brand](./product/business-context.md) | Current business reality, operational problem, operating principles, brand positioning and identity (§2–3) |
| [Products, Pricing, and Economics](./product/products-and-economics.md) | Product catalog, bill of materials, yield rules, COGS, unit economics, material planning example (§4–5, Appendix A) |
| [Customer Storefront Experience](./product/storefront-experience.md) | Experience principles, the 3-screen checkout flow, availability messaging, referral capture, Bahasa label reference (§6, Appendix B) |
| [Fulfillment Scheduling and Availability](./product/fulfillment-scheduling.md) | Weekday mapping, holiday rule, daily cutoff, the Founder Availability Calendar, date blocking, Pause Orders (§7) |
| [Founder OS and Packing Workflow](./product/founder-os.md) | Access model, information architecture, Beranda, the mobile Kanban, independent payment state, real-world packing workflow (§8–9) |
| [Inventory Model](./product/inventory-model.md) | Inventory philosophy, tracked items, reservations, consumption, stock opname, supplier replenishment, shortage behavior (§10) |
| [Payments, Cash, and Receivables](./product/payments-and-receivables.md) | Customer payment model, receivables, current cash-handling context (§11) |
| [Technical and Data Rules](./product/technical-constraints.md) | Business-authored architecture principles, core entities, timestamps, state transitions, notifications, export, retention (§12) — see also the [Technical Specification](./technical-spec.md) for implementation detail |
| [V1 Scope, Deferred Features, and Open Questions](./product/scope-and-decisions.md) | Customer/founder/operational V1 scope, deferred-features list, open questions, locked-decisions index, current-assumptions summary (§13–17) |

Also see: [Implementation Status](./implementation-status.md) for what's built vs backlog, and [Change Log](./changelog.md) for the full decision history.

# Acceptance Tests

[← Technical spec hub](../technical-spec.md)

**Implementation: 🚧 PARTIAL** — §19.1–§19.5, §8.5, §10.6, and §19.8 items 47–48, 48b–48c, 50 are automated tests in `app/src/lib/domain/domain.test.ts`. §19.6 items 38, 40, 41 (partly) and §19.7 item 46 are automated (see coverage notes below); items 39, 43–44, 45 are not applicable / not implemented / e2e (Phase C); §19.8 item 49 (cancel quantity-reduction reversal, only partial). Section numbering is kept byte-identical to the original technical spec because the test file cites these numbers directly — do not renumber. See [implementation-status.md](../implementation-status.md).

## 19. Acceptance tests

### 19.1 Scheduling

1. Monday order promises Wednesday.
2. Tuesday order promises Thursday even when Wednesday is a holiday.
3. Wednesday order promises Friday.
4. Thursday, Friday, Saturday, and Sunday orders promise the next Monday.
5. If the target date is unavailable, a new order moves forward to the next valid date; for example, an unavailable Friday moves to Monday when Saturday and Sunday are non-operational.
6. Blocking a date with confirmed orders recommends the next available date when it is within three calendar days, otherwise the nearest earlier available date; if no earlier date exists, it requires a manually recorded later date or cancellation and cannot complete while unresolved.
7. Existing orders never silently move later.
8. Paused store rejects order submission server-side.
9. A founder-entered Indonesian national holiday is unavailable by default.
10. A founder can add multiple holiday dates in one initial batch.
11. Editing or removing a holiday with affected confirmed orders invokes the explicit resolution workflow.
12. Adding a future holiday leaves the store open and moves new orders past the blocked date; only an explicit Pause Orders command rejects new orders. Mandiri and BI return the same date-validity result from this shared calendar.

### 19.2 Ordering and reservations

13. Two Milieu plus one Grande reserves 250 g raw cheese, two jars, one pouch, two Milieu square stickers, one Grande square sticker, two round stickers, and two seals.
14. Order creation does not reduce on-hand stock.
15. Cancelling an unpacked order releases every active reservation.
16. Editing quantities replaces reservations correctly and updates captured totals.
17. Refreshing or double-submitting checkout with one idempotency key creates only one order.
18. A note of 180 Unicode characters is accepted; 181 characters is rejected without creating an order.
19. The remember-details control starts unchecked; opting in saves only name, WhatsApp number, and language, while opting out clears saved identity data.
19a. Order tracking requires both id and public_token; bad tokens or mismatched pairs return not-found uniformly (no information leakage). The tracking response contains only customer-safe data: id, status, fulfillment, ready dates, items (name/qty), total, isPaid, timestamps.
19b. A delivery order's tracking shows four ordered steps (Pesanan diterima, Dikemas, Sedang diantar, Selesai); each completed step shows its date and time in Asia/Jakarta, and exactly one step carries `aria-current="step"`.
19c. A cancelled delivery order shows a single "Dibatalkan {date}" line instead of the timeline; a pickup order shows no timeline.

### 19.3 Packing

20. Completing a batch, or marking a single order packed (Selesai Packing), reduces on-hand by the relevant active reservations and clears them atomically.
20a. Marking one order packed consumes only that order's reservations, once; a second call, or a call on a READY, COMPLETED, CANCELLED or unknown order, is rejected.
20b. A batch completed after some of its orders were packed individually consumes only the remaining orders' reservations; completing a batch when every order is already packed is rejected.
21. The included orders become ready only after consumption commits.
22. Completing the same batch twice creates no duplicate consumption.
23. Grande consumes 225 g per unit.
24. Milieu consumes and persists exactly 125 g per unit under the current pooled-stock yield rule; the batch requires no remainder input, and rounded UI summaries never change the stored value.

### 19.4 Inventory

25. Receiving 50 supplier packs at 225 g increases raw cheese by 11,250 g.
26. Stock opname from 4,280 g system to 4,120 g actual creates a −160 g adjustment; if this falls below reservations, it preserves those reservations and promises while showing negative ATP and a critical warning.
27. A positive physical variance creates a positive adjustment.
28. Available-to-promise equals on-hand minus active reservations; raw cheese at or below 2,250 g and packaging at or below its seeded threshold show warnings without creating a supplier order or inventory receipt. A 12-jar shortage recommends 30 jars, a 12-pouch shortage recommends 100 pouches, and a 12-seal shortage recommends 50 seals.
29. Expiration labels do not appear in operational inventory.

### 19.5 Payments

30. Completing an unpaid order leaves it in receivables.
30a. After an unpaid completion, revenue includes the order, received excludes it, and receivable includes it; recording the full payment moves it to received and clears the receivable.
30b. An unpaid order in NEEDS_PREPARATION or READY_FOR_HANDOVER counts under `awaitingPayment` (Menunggu pembayaran), not `receivableCompleted`; after completion it moves to `receivableCompleted` (Piutang); a cancelled order counts in neither. `receivable` equals the sum of the two at every step.
30c. Method shares show "—" when nothing has been received; with received payments, the three shares (Transfer, QRIS, Tunai) total 100 under largest-remainder rounding.
31. Recording the full payment makes the order paid without changing fulfillment status.
32. QRIS display alone does not mark an order paid.
33. A payment reversal restores the correct receivable.
34. A founder can record bank transfer, QRIS, or cash, and no catch-all payment method is offered.
35. An unpaid or partially paid external-delivery order is rejected ("Pengiriman perlu lunas terlebih dahulu.") unless dispatch is submitted with `allowUnpaid = true`; a fully paid one can be dispatched without changing its payment status.
35a. A dispatch with `allowUnpaid = true` on an unpaid order succeeds, audits `ORDER_DISPATCHED:UNPAID`, and still fails before `current_ready_date`.
35b. Bulk dispatch is atomic: if any selected order fails a check (pickup, not ready, already dispatched, date, or unpaid without `allowUnpaid`), no order is dispatched; with `allowUnpaid`, unpaid orders in the set dispatch and the audit lists their ids.
36. Recording payment always captures the authenticated founder and payment time; transaction reference and note may be empty, and no receipt image is required or accepted.
37. A paid external-delivery order still cannot be dispatched before packing completion or before `current_ready_date`; no dispatch-hour value is required.

### 19.6 Permissions and history

38. Unauthenticated users cannot access Founder OS data.
39. Both founders can perform the same allowed operations.
40. Historical item prices and recipe quantities remain unchanged after master-data updates.
41. Only an authenticated active founder can generate an XLSX export, and the workbook contains no authentication secrets.
42. An all-history export preserves the IDs needed to relate orders, items, customers, payments, and inventory records.
43. A completed order's delivery address and customer note are cleared after 90 days without changing totals or operational history.
44. Customer anonymization removes identifying profile values while preserving historical relationships and reports.

**Coverage notes (items 38–46):**
- 38: `app/src/lib/founder-auth.test.ts` (checkCredentials, cookie verify), `app/src/proxy.test.ts` (redirect to /login, matcher), `app/src/lib/export-guard.test.ts` (export routes 401 before DB). `requireFounder` redirect in server actions is not unit-tested (needs `next/headers`); e2e (Phase C).
- 39: not applicable: single shared credential.
- 40: `domain.test.ts` (order price/recipe snapshot survives catalog edits).
- 41: `export-guard.test.ts` (401 without valid session; no secret-like column names). XLSX happy-path content is not tested (route needs the DB).
- 42: `export.test.ts` (ID columns relate datasets).
- 43–44: not implemented (see implementation-status.md BACKLOG).
- 45: partly covered by Playwright e2e (`app/e2e/customer.spec.ts`, offline during order submit never shows the success state); founder-mutation offline is not tested.
- E2E scenario map (Playwright, `npm run e2e`, see [dev-workflow §8](./dev-workflow.md)): `customer.spec.ts` = order flow, validation, referral once, Lacak tracking, WhatsApp href, sticky header, scroll-to-top, offline submit; `founder.spec.ts` = auth gate (§19.6), board, Kirim WhatsApp link, payment, ranged CSV export, logout; `safety.spec.ts` = DB isolation.
- 46: `domain.test.ts` (same idempotency key creates one order).

### 19.7 Connectivity

45. Losing connectivity during a founder mutation never shows an unverified success state.
46. Retrying an idempotent command after an uncertain response does not create a duplicate business event.

### 19.8 Product Ready to Sell

47. An accidental extra is recorded under Milieu or Grande only and atomically consumes its recipe components.
48. A matching new order allocates the oldest ready unit first and reserves components only for the uncovered quantity.
49. Cancelling the order restores its ready-unit allocation through an append-only reversal. (Reducing the order is BACKLOG: no edit-quantity operation exists; see implementation-status.)
50. Expiry is one calendar month from local packing date; allocation selects the oldest unexpired matching unit and never selects an expired source.

### 19.9 Layout (0.16.0)

51. The orders toolbar (status tabs, fulfilment chips, search, sort) stays inside the container with no horizontal overflow at 320, 390, 600, 900 and 1440 px; search and sort are never clipped.
52. Keuangan hero cards in one row share a baseline for their values at 390 and 1440 px (label, value, hint top-aligned).
53. Customer timeline and tracking total stay readable in dark mode (no salmon total; step state shown by shape as well as colour). Checked by Playwright at 390 and 1440, light and dark; no automated test.

# Acceptance Tests

[← Technical spec hub](../technical-spec.md)

**Implementation: 🚧 PARTIAL** — §19.1–§19.5, §8.5, §10.6, and §19.8 items 47–48, 48b–48c, 50 are automated tests in `app/src/lib/domain/domain.test.ts`. §19.6 (auth/login), §19.8 item 49 (cancel quantity-reduction reversal, only partial), and §19.7 (connectivity) have no code yet. Section numbering is kept byte-identical to the original technical spec because the test file cites these numbers directly — do not renumber. See [implementation-status.md](../implementation-status.md).

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

13. Two Milieu plus one Grande reserves 488.16 g raw cheese, two jars, one pouch, three square stickers, two round stickers, and two seals.
14. Order creation does not reduce on-hand stock.
15. Cancelling an unpacked order releases every active reservation.
16. Editing quantities replaces reservations correctly and updates captured totals.
17. Refreshing or double-submitting checkout with one idempotency key creates only one order.
18. A note of 180 Unicode characters is accepted; 181 characters is rejected without creating an order.
19. The remember-details control starts unchecked; opting in saves only name, WhatsApp number, and language, while opting out clears saved identity data.

### 19.3 Packing

20. Completing a batch reduces on-hand by its reservations and clears active reserved quantities atomically.
21. The included orders become ready only after consumption commits.
22. Completing the same batch twice creates no duplicate consumption.
23. Grande consumes 225 g per unit.
24. Milieu consumes and persists exactly 131.58 g per unit under recipe version 1 without binary floating-point drift; the batch requires no actual-remainder input, and rounded UI summaries never change the stored value.

### 19.4 Inventory

25. Receiving 50 supplier packs at 225 g increases raw cheese by 11,250 g.
26. Stock opname from 4,280 g system to 4,120 g actual creates a −160 g adjustment; if this falls below reservations, it preserves those reservations and promises while showing negative ATP and a critical warning.
27. A positive physical variance creates a positive adjustment.
28. Available-to-promise equals on-hand minus active reservations; raw cheese at or below 2,250 g and packaging at or below its seeded threshold show warnings without creating a supplier order or inventory receipt. A 12-jar shortage recommends 30 jars, a 12-pouch shortage recommends 100 pouches, and a 12-seal shortage recommends 50 seals.
29. Expiration labels do not appear in operational inventory.

### 19.5 Payments

30. Completing an unpaid order leaves it in receivables.
31. Recording the full payment makes the order paid without changing fulfillment status.
32. QRIS display alone does not mark an order paid.
33. A payment reversal restores the correct receivable.
34. A founder can record bank transfer, QRIS, or cash, and no catch-all payment method is offered.
35. An unpaid or partially paid external-delivery order cannot be dispatched; a fully paid one can be dispatched without changing its payment status.
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

### 19.7 Connectivity

45. Losing connectivity during a founder mutation never shows an unverified success state.
46. Retrying an idempotent command after an uncertain response does not create a duplicate business event.

### 19.8 Product Ready to Sell

47. An accidental extra is recorded under Milieu or Grande only and atomically consumes its recipe components.
48. A matching new order allocates the oldest ready unit first and reserves components only for the uncovered quantity.
49. Cancelling or reducing the order restores its ready-unit allocation through an append-only reversal.
50. Expiry is one calendar month from local packing date; allocation selects the oldest unexpired matching unit and never selects an expired source.

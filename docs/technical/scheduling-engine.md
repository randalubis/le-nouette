# Fulfillment Scheduling Engine

[← Technical spec hub](../technical-spec.md)

**Implementation: ✅ BUILT** — this entire section is implemented and tested in `app/src/lib/domain/schedule.ts`. See [implementation-status.md](../implementation-status.md).

## 8. Fulfillment scheduling engine

### 8.1 Base weekday mapping

```text
MONDAY    → WEDNESDAY
TUESDAY   → THURSDAY
WEDNESDAY → FRIDAY
THURSDAY  → NEXT MONDAY
FRIDAY    → NEXT MONDAY
SATURDAY  → NEXT MONDAY
SUNDAY    → NEXT MONDAY
```

### 8.2 Availability evaluation

A fulfillment date is valid when:

1. the store may accept orders;
2. the date is not marked `UNAVAILABLE` or `HOLIDAY`;
3. the date is operational under the base calendar;
4. it passes the single shared operational calendar used by both Mandiri and BI pickup.

**REQUIRED:** V1 has no office-specific availability table, override, or calendar. `PICKUP_MANDIRI` and `PICKUP_BI` remain separate fulfillment method values for routing and reporting, but both use the same date-validity result. External delivery also follows the shared ready-date calendar; dispatch timing remains a separate rule.

Founder-entered holidays evaluate as unavailable until a founder explicitly changes or removes the date entry.

### 8.3 New-order algorithm

```text
calculatePromisedDate(orderInstant, fulfillmentMethod):
  localDateTime = orderInstant in Asia/Jakarta
  schedulingDate = date(localDateTime)

  if time(localDateTime) >= 18:00:
    schedulingDate = schedulingDate + 1 calendar day

  candidate = baseWeekdayMapping(schedulingDate)

  while candidate is not a valid fulfillment date:
    candidate = next calendar date

  return candidate
```

A holiday between `localDate` and `candidate` is irrelevant. Only candidate-date availability matters.

**REQUIRED:** The availability search is strictly forward-only. It evaluates each following calendar date and returns the first operational, available date; it never selects a date earlier than the base weekday result. Non-operational weekend dates are skipped naturally by the validity check.

### 8.4 Checkout cutoff

**REQUIRED:** The scheduling cutoff is **18:00 WIB**. Checkout remains open, but an order submitted at or after 18:00 uses the following calendar day as `schedulingDate`. The cutoff comparison is performed server-side in `Asia/Jakarta` and revalidated when the order is created.

```text
Monday 17:59:59 WIB → schedulingDate Monday  → ready Wednesday
Monday 18:00:00 WIB → schedulingDate Tuesday → ready Thursday
Sunday 17:59:59 WIB → schedulingDate Sunday  → ready Monday
Sunday 18:00:00 WIB → schedulingDate Monday  → ready Wednesday
```

### 8.5 Blocking a date

Before saving an unavailable date:

1. find all non-cancelled orders whose `current_ready_date` equals the target date;
2. search forward through the Founder Availability Calendar for the next available operational date;
3. if the forward date is one, two, or three calendar days after the target date, recommend that date;
4. if the forward date is more than three calendar days after the target date, search backward and recommend the nearest earlier available operational date;
5. present the recommended date and affected order/unit totals;
6. allow the founder to confirm the recommendation, resolve orders individually, or cancel the calendar edit;
7. when no qualifying earlier date exists, offer no automatic fallback and require the founder to record a customer-agreed later date or cancel the order;
8. if a paid order is cancelled, keep it flagged until the founder records the manual refund/reversal;
9. reject final date blocking while any affected order remains unresolved;
10. for rescheduling, update only `current_ready_date`, preserving `promised_ready_date`;
11. create reschedule and audit records for every change;
12. prepare customer notifications.

The three-day comparison uses calendar days, not business days. Every candidate must pass the authoritative Founder Availability Calendar. The algorithm must never change or cancel an existing order without explicit founder confirmation. Manual resolution is an exception workflow, not another scheduling algorithm.

### 8.6 Pause Orders

- When `PAUSED`, new order submission is rejected server-side even if a stale browser page still shows checkout.
- Existing orders and Founder OS remain operational.
- Resuming changes only store acceptance; it does not recalculate historical orders.
- Creating a holiday or unavailable calendar date never changes `store_status` to `PAUSED`.
- While the store remains `OPEN`, checkout continues accepting future orders and the scheduling engine skips blocked dates using its normal forward search.
- Only an explicit authenticated founder command may pause or resume the store.

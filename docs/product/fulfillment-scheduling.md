# Fulfillment Scheduling and Availability

[← Product spec hub](../product-spec.md)

**Implementation: ✅ BUILT** — weekday mapping, holiday rule, 18:00 WIB cutoff, and reschedule recommendation are implemented and tested in `app/src/lib/domain/schedule.ts`. See [implementation-status.md](../implementation-status.md).

## 7. Fulfillment scheduling and availability

### 7.1 Base weekday rule

**LOCKED:** The operating promise is described to customers as two business days, implemented using Le Nouette's actual fulfillment calendar:

| Order placed | Normal promised ready/delivery day |
|---|---|
| Monday | Wednesday |
| Tuesday | Thursday |
| Wednesday | Friday |
| Thursday | Monday |
| Friday | Monday |
| Saturday | Monday |
| Sunday | Monday |

This is not a generic "add two business days" algorithm. Thursday through Sunday feed into the next Monday fulfillment batch.

**LOCKED:** For external delivery, `current_ready_date` is also the planned courier-dispatch date. Dispatch may occur on that date only after the order is fully packed and full payment has been verified. Le Nouette does not promise a specific dispatch hour in V1, and courier arrangement remains manual.

### 7.2 Holiday rule

**LOCKED**

- A holiday **between** the order date and the intended fulfillment date does not add a day.
- Example: order Tuesday, Wednesday is a holiday, normal fulfillment Thursday → promise remains Thursday.
- If the intended fulfillment date itself is unavailable, the scheduling engine must select a valid available date using the authoritative calendar.

**LOCKED:** For a new order whose calculated date is unavailable, move forward one calendar day at a time until the next available operational date. Never move a new order earlier than its calculated date. If the search crosses a weekend, skip non-operational weekend dates and continue forward.

### 7.3 Daily order cutoff

**LOCKED:** The daily scheduling cutoff is **18:00 WIB** (`Asia/Jakarta`). Customers may continue ordering after the cutoff, but the fulfillment engine treats an order submitted at or after 18:00 as placed on the following calendar day.

| Submitted | Scheduling date | Normal promised date |
|---|---|---|
| Monday 17:59 WIB | Monday | Wednesday |
| Monday 18:00 WIB | Tuesday | Thursday |
| Sunday 17:59 WIB | Sunday | Monday |
| Sunday 18:00 WIB | Monday | Wednesday |

### 7.4 Authoritative scheduling sequence

**LOCKED:** At checkout, the engine must:

1. Determine the local submission date and time in `Asia/Jakarta`.
2. If submitted at or after 18:00 WIB, use the following calendar day as the scheduling date.
3. Apply the Le Nouette weekday mapping.
4. Check whether the target fulfillment date is a public holiday or otherwise unavailable.
5. Check the Founder Availability Calendar.
6. Move to the next valid date for a new order if the target date is unavailable.
7. Store the resulting `promised_ready_date` on the order.

Historical orders are never silently recalculated when calendar settings change.

### 7.5 Founder Availability Calendar

**LOCKED:** Founder OS includes an Airbnb-like calendar through which either founder can declare operational availability for family holidays, events, or emergencies.

Core states:

- `AVAILABLE`
- `UNAVAILABLE`
- public-holiday/closed state

**LOCKED:** Mandiri and BI office pickup use this same operational availability calendar in V1. They remain distinct fulfillment choices on orders, but founders do not maintain separate office calendars or office-specific available dates.

**LOCKED:** Indonesian national holidays are maintained manually by the founders in Founder OS. Initial dates may be entered individually or in a batch, and future holidays can be added as they become known. A holiday defaults to unavailable for fulfillment but remains editable by either founder. Any change affecting confirmed orders uses the normal explicit rescheduling workflow and never silently changes a promise. V1 has no external holiday-data dependency.

**ASSUMPTION:** A `LIMITED` state and per-day order caps may be added later, but are not required for V1.

The calendar should also show operational demand such as order count and units due on each date.

### 7.6 Blocking dates with existing commitments

**LOCKED**

- If a founder blocks a date that already has confirmed orders, Founder OS must identify every affected order before confirming the block.
- First find the next available operational date after the affected date using the Founder Availability Calendar.
- If that later date is no more than **three calendar days** after the affected date, recommend moving the order to that later date.
- If that later date is more than three calendar days away, recommend the nearest available operational date before the affected date.
- Every recommended date must be available in the Founder Availability Calendar. If no qualifying earlier date exists, the system makes no automatic choice and requires manual resolution with the customer.
- A manual resolution may record a customer-agreed later date or cancellation. If a paid order is cancelled, its refund remains a manual payment operation with an auditable record.
- The date block cannot be finalized until every affected order has a valid resolution.
- A founder must explicitly confirm each resolution; the system never changes an existing order silently.
- Notify the customer of the revised date through the normal prefilled WhatsApp workflow.
- Preserve the immutable original `promised_ready_date`; only `current_ready_date` changes.

Preserve schedule history:

```text
promised_ready_date
current_ready_date
rescheduled
reschedule_reason = OWNER_UNAVAILABLE
rescheduled_at
rescheduled_by
```

### 7.7 Pause Orders

**LOCKED:** Founder OS provides an emergency switch to pause the whole storefront independently of individual calendar dates.

Planned holidays and unavailable calendar dates do not activate this switch automatically. Founders use **Pause Orders** only when they intentionally want to stop all new-order acceptance, including future-dated orders.

```text
store_status = OPEN | PAUSED
pause_reason
resume_date = optional
```

If paused, the storefront clearly states that Le Nouette is temporarily not accepting orders. If a resume date is known, it may be shown. Existing confirmed orders remain owner responsibilities and require explicit handling.

# Authentication, Authorization, and Security

[← Technical spec hub](../technical-spec.md)

**Implementation: 🚧 PARTIAL** — Founder server actions are authenticated in-action via `requireFounder()` (`app/src/lib/founder-session.ts`), which verifies an HMAC-signed, httpOnly `founder_session` cookie and redirects to `/login` on failure. All 22 founder-only server actions (16 in `app/src/lib/domain/actions.ts`, 6 in `invoice-actions.ts`) call `requireFounder()` as their first line. Public actions are `createOrderAction`, `saveReferralAction` and `trackOrdersAction`; none calls `requireFounder()`. Authentication uses a single shared `ADMIN_EMAIL`/`ADMIN_PASSWORD` env credential rather than per-founder Supabase Auth accounts — no individual accounts, no rate-limiting/lockout, no audit trail. Cookie is verified server-side; session lookup does not query Supabase Auth. CSRF protection relies on Next.js Server Actions' built-in origin check. See [implementation-status.md](../implementation-status.md).

## 15. Authentication, authorization, and security

### 15.1 Founder access

**Target state (REQUIRED); not built.** The bullets below describe the target. The current build uses the single shared credential described in the Implementation note above. No login rate limit exists. See the [prioritized follow-ups](./../implementation-status.md#prioritized-open-follow-ups).

- Founder OS requires authentication.
- Both founders receive identical permissions.
- Launch access is limited to two pre-approved individual accounts.
- Public signup and shared founder credentials are disabled.
- Authentication uses Supabase Auth email/password with verified email-based password recovery.
- Every protected server action verifies the Supabase session and an active matching `founder_users.auth_user_id`; authentication alone does not imply founder authorization.
- Use secure, HTTP-only, same-site session cookies if browser sessions are implemented directly.
- Require CSRF protection for cookie-authenticated mutations.
- Rate-limit login attempts.
- Provide a safe account-recovery method appropriate to the chosen identity system.

### 15.2 Public input controls

**Current build:** only the 180-character order-note limit is enforced server-side. Other field length limits, input type and bounds checks, and order-creation rate limiting are not built. See the [prioritized follow-ups](./../implementation-status.md#prioritized-open-follow-ups).

- Validate and length-limit all fields server-side.
- Enforce the 180-character order-note limit both in the UI and server-side, counting Unicode characters consistently.
- Normalize phone numbers without assuming malformed values are valid.
- Escape output and use parameterized queries/ORM bindings.
- Rate-limit order creation by reasonable request/IP heuristics.
- Add lightweight spam protection only if abuse occurs; avoid CAPTCHA by default.
- Prevent spreadsheet formula injection in exported CSV/XLSX files by prefixing user-supplied text cells that begin with `=`, `+`, `@`, tab, or CR with a single-quote apostrophe.
- Validate referral source enum server-side (whitelisted values only: Teman, keluarga, Instagram, WhatsApp, Lainnya, null).
- Verify the order's public_token for all referral-capture mutations (`saveReferralAction`); accept the referral only once per order (set-once, no overwrite).

### 15.3 Sensitive data

- Customer WhatsApp numbers and delivery addresses are private business data.
- Restrict them to authenticated founders.
- Encrypt network traffic.
- Avoid writing full customer details to application logs.
- Treat generated XLSX exports as private files containing customer and business data.

### 15.4 Retention and anonymization

**REQUIRED**

- Retain orders, captured monetary values, payments, inventory movements, packing records, and audit events as business history.
- Automatically clear `fulfillments.delivery_address` and `fulfillments.customer_note` 90 days after `orders.completed_at`.
- Set `personal_data_purged_at` when cleanup succeeds. Cleanup must be idempotent.
- Allow an authenticated founder to anonymize a customer. Set name and WhatsApp values to null, set `anonymized_at`, and preserve the customer ID and historical relationships. Enforce WhatsApp uniqueness only for non-null active values.
- Anonymization must not delete or recalculate orders, payments, inventory movements, packing records, or reports.
- Device-saved customer details are browser-local and require separate disclosure/consent wording.

### 15.5 Auditability

Every status transition, payment, inventory adjustment, availability override, pause/resume action, and reschedule records actor and timestamp.

### 15.6 Reset-data tool guard (0.21.0)

**Implementation: 🚧 PARTIAL.** `resetSeedAction` (`app/src/lib/domain/actions.ts`) wipes app data. On a non-local `DATABASE_URL` (host not localhost, 127.0.0.1 or ::1, per `app/src/lib/db/local-guard.ts`) it requires `RESET_TOOL_SECRET` to be set and equal to the submitted key, regardless of `NODE_ENV`. On a local database it still allows the reset when `NODE_ENV` is not production. The reset also deletes invoices and invoice counters; `company_settings` is kept. Residual, still open: the key is read from the `?key=` query string and compared with `===` (not constant time, not POSTed); see [prioritized follow-ups](../implementation-status.md#prioritized-open-follow-ups). The remote-DB branch has no automated test.

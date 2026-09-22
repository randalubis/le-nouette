# Authentication, Authorization, and Security

[← Technical spec hub](../technical-spec.md)

**Implementation: 🚧 PARTIAL** — `/founder/*` is gated behind a login screen and an HMAC-signed, httpOnly session cookie (`app/src/proxy.ts`, `app/src/lib/founder-auth.ts`), but as a single shared `ADMIN_EMAIL`/`ADMIN_PASSWORD` env credential rather than per-founder Supabase Auth accounts — no CSRF-specific handling beyond Next.js Server Actions' built-in origin check, no rate-limiting/lockout, no account recovery flow. See [implementation-status.md](../implementation-status.md).

## 15. Authentication, authorization, and security

### 15.1 Founder access

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

- Validate and length-limit all fields server-side.
- Enforce the 180-character order-note limit both in the UI and server-side, counting Unicode characters consistently.
- Normalize phone numbers without assuming malformed values are valid.
- Escape output and use parameterized queries/ORM bindings.
- Rate-limit order creation by reasonable request/IP heuristics.
- Add lightweight spam protection only if abuse occurs; avoid CAPTCHA by default.

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

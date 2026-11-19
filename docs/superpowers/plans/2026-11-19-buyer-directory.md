# Buyer directory Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Store buyer name, phone, and address, and let the invoice wizard's name box search earlier buyers and fill phone and address on pick.

**Architecture:** New `buyers` table keyed by normalised phone. Pure helpers in `lib/domain/buyers.ts`, direct queries in `lib/db/buyers.ts` (same pattern as `lib/db/invoices.ts`, outside `loadState`). Invoice create and edit actions upsert the buyer after writing the invoice. A founder-only server action serves prefix search. The wizard gets a combobox component for the name field.

**Tech Stack:** Next.js App Router server actions, Drizzle ORM on Postgres (postgres-js), `node --test` unit tests, `tsx` integration tests on local `le_nouette_dev`.

**Spec:** `docs/superpowers/specs/2026-11-19-buyer-directory-design.md`

## Global Constraints

- Every new server action calls `requireFounder()` first and sanitises input with the existing `str()` in `invoice-actions.ts`.
- RLS enabled on `buyers`, no policies.
- Phone key is `toWaNumber()` from `app/src/lib/domain/whatsapp.ts`. A phone that returns `null` is never stored in the directory.
- Search needs at least 2 characters, returns at most 8 rows, matches by prefix on `lower(name)`.
- No buyer name, phone, or address in logs, error messages, or `audit_events.ref`.
- A directory write failure never fails invoice creation or edit.
- Invoices stay immutable snapshots: no foreign key from `invoices` to `buyers`.
- UI strings in Indonesian. No hard-coded colours; reuse tokens (`docs/technical/founder-os-design-system.md`).
- Migration `0008` is applied to local `le_nouette_dev` and `le_nouette_e2e` first. Production only in Task 7.
- Never run tooling against `app/.env.local`.

## Review Focus

Each line has its pinning test in the task named in brackets.

1. Name typed with fewer than 2 characters sends no request and shows no list. [Task 5, manual check]
2. Query containing `%`, `_`, or `\` matches those characters literally, not as wildcards. [Task 1, Task 3]
3. Invoice with empty or invalid phone saves normally and creates no buyer row. [Task 3]
4. Same person typed as `0812-3456-7890`, `+62 812 3456 7890`, `6281234567890` yields one row holding the latest address. [Task 1, Task 3]
5. Saving with an empty address keeps the stored address. [Task 3]
6. Directory write fails (for example table missing in production before migration): invoice is still created; search returns an empty list. [Task 4]
7. A slow response for an old keystroke must not overwrite the list for the newest keystroke. [Task 5, manual check]

---

### Task 1: Pure helpers

**Files:**
- Create: `app/src/lib/domain/buyers.ts`
- Test: `app/src/lib/domain/buyers.test.ts` (picked up by the `src/lib/domain/*.test.ts` glob in `npm test`)

**Interfaces:**
- Produces: `buyerKey(phone: string): string | null` (returns `toWaNumber(phone)`); `buyerDisplayPhone(key: string): string` (`"6281234567890"` becomes `"081234567890"`, that is `"0" + key.slice(2)`); `searchPattern(query: string): string | null` (trims, returns `null` under 2 characters, otherwise lowercased, escapes `\`, `%`, `_` with a backslash, appends `%`).

- [ ] **Step 1: Write the failing tests** in `buyers.test.ts`, importing from `./buyers.ts` (note the `.ts` extension, as in `invoice.test.ts`):
  - `buyerKey("0812-3456-7890")`, `buyerKey("+62 812 3456 7890")`, `buyerKey("6281234567890")` all equal `"6281234567890"`. `buyerKey("")` and `buyerKey("12345")` are `null`.
  - `buyerDisplayPhone("6281234567890")` equals `"081234567890"`.
  - `searchPattern("a")` is `null`, `searchPattern("  ")` is `null`, `searchPattern("Bu Sari")` equals `"bu sari%"`, `searchPattern("50%_x\\")` equals `"50\\%\\_x\\\\%"`.
- [ ] **Step 2: Run** `cd app && node --test src/lib/domain/buyers.test.ts`. Expected: FAIL, module not found.
- [ ] **Step 3: Implement** the three functions in `buyers.ts` with the signatures above. `buyerKey` is a one-line wrapper over `toWaNumber`.
- [ ] **Step 4: Run** the same command. Expected: PASS.
- [ ] **Step 5: Commit** `feat(buyers): phone key and search pattern helpers`.

---

### Task 2: Table, migration, reset list

**Files:**
- Modify: `app/src/lib/db/schema.ts` (append `buyers`)
- Create: `app/drizzle/0008_buyers.sql`
- Modify: `app/drizzle/meta/_journal.json` (entry idx 8, tag `0008_buyers`, `when` greater than `1790900000000`, same shape as idx 7)
- Modify: `app/src/lib/domain/actions.ts:99` (add `buyers` to the `truncate table` list in `resetSeedAction`)

**Interfaces:**
- Produces: Drizzle export `buyers` with columns `id` serial pk, `name` text not null, `phone` text not null unique, `address` text not null default `''`, `updatedAt` timestamptz (`mode: "string"`) not null default now. Index `buyers_name_prefix_idx` on `lower(name) text_pattern_ops`.

- [ ] **Step 1: Add the table** to `schema.ts` following the `invoices` table style. Express the prefix index in the Drizzle table callback with `sql` (`index("buyers_name_prefix_idx").on(sql\`lower(${table.name}) text_pattern_ops\`)`); if drizzle-kit rejects that form, declare the index only in the SQL file.
- [ ] **Step 2: Write `0008_buyers.sql`** in the style of `0005_invoices.sql` (statements separated by `--> statement-breakpoint`): `CREATE TABLE "buyers"`, the unique constraint on `phone`, `CREATE INDEX "buyers_name_prefix_idx" ON "buyers" (lower("name") text_pattern_ops)`, `ALTER TABLE "buyers" ENABLE ROW LEVEL SECURITY`, then the backfill. Backfill: one `INSERT INTO buyers (name, phone, address, updated_at) SELECT DISTINCT ON (phone) ... ORDER BY phone, ts DESC ON CONFLICT (phone) DO NOTHING` over a `UNION ALL` of `orders` (`customer_name`, `customer_whatsapp`, `coalesce(address, '')`, `created_at`) and `invoices` (`buyer_name`, `buyer_phone`, `buyer_address`, `created_at`). Normalise in SQL with the same rule as `toWaNumber`: strip `[\s-]`, keep only rows matching `^(\+62|62|0)8\d{7,13}$`, then `regexp_replace(..., '^\+?62', '62')` and `regexp_replace(..., '^0', '62')`. Skip rows where `btrim(name) = ''`.
- [ ] **Step 3: Add `buyers` to the truncate list** in `resetSeedAction` so the dev reset and e2e reset clear it.
- [ ] **Step 4: Apply to local DB.** The dev DB already exists, so `dev-db.sh` will not re-run migrations. Run `psql -v ON_ERROR_STOP=1 -d le_nouette_dev -f app/drizzle/0008_buyers.sql`. Check `psql -d le_nouette_dev -c "select count(*), count(distinct phone) from buyers"`. Expected: both numbers equal and greater than 0 on seeded data. Run `cd app && npx tsc --noEmit`. Expected: clean. If `le_nouette_dev` does not exist, run `npm run dev:db` first (it applies every `drizzle/0*.sql`, including 0008).
- [ ] **Step 5: Commit** `feat(buyers): buyers table with RLS and backfill (0008)`.

---

### Task 3: DB layer

**Files:**
- Create: `app/src/lib/db/buyers.ts` (`import "server-only"` like `invoices.ts`)
- Modify: `app/src/lib/db/actions.integration.test.ts` (add tests; it already pins to local DB via `assertLocalDb`)

**Interfaces:**
- Consumes: `buyerKey`, `buyerDisplayPhone`, `searchPattern` (Task 1); `buyers` (Task 2).
- Produces: `type BuyerHit = { id: number; name: string; phone: string; address: string }` (phone already in display form `08…`); `upsertBuyer(input: { name: string; phone: string; address: string }): Promise<void>`; `searchBuyers(query: string): Promise<BuyerHit[]>`.

- [ ] **Step 1: Write failing integration tests** (they import `upsertBuyer`, `searchBuyers` from `@/lib/db/buyers`; clean their own rows by phone with a unique test phone, as the existing tests clean after themselves):
  - Two `upsertBuyer` calls with `0812-0000-0001` then `+62 812 0000 0001`, second with a new address: `searchBuyers` returns exactly one hit with the second address and `phone` `"081200000001"`.
  - `upsertBuyer` with address `""` after a non-empty one keeps the non-empty address.
  - `upsertBuyer` with phone `""` and with phone `"123"` writes nothing (search for that name returns no hit).
  - `searchBuyers("x")` returns `[]`. A buyer named `"100% Test"` is found by `"100%"` but not by `"100_"`.
  - `searchBuyers` returns at most 8 hits when 10 matching buyers exist.
- [ ] **Step 2: Run** `cd app && npm run test:integration`. Expected: the new tests FAIL, module not found.
- [ ] **Step 3: Implement.** `upsertBuyer`: `buyerKey(phone)`, return early on `null` or empty trimmed name; `insert ... onConflictDoUpdate` on `phone`, setting `name`, `updatedAt = now()`, and `address = case when excluded.address = '' then buyers.address else excluded.address end` through a `sql` fragment. `searchBuyers`: `searchPattern(query)`, return `[]` on `null`; select `where lower(name) like ${pattern} escape '\\'`, order by `updated_at desc`, limit 8; map `phone` through `buyerDisplayPhone`.
- [ ] **Step 4: Run** `npm run test:integration`. Expected: PASS.
- [ ] **Step 5: Commit** `feat(buyers): upsert and prefix search queries`.

---

### Task 4: Server actions

**Files:**
- Modify: `app/src/lib/domain/invoice-actions.ts` (`createInvoiceAction`, `updateInvoiceAction`, new `searchBuyersAction`)

**Interfaces:**
- Consumes: `upsertBuyer`, `searchBuyers`, `BuyerHit` (Task 3).
- Produces: `searchBuyersAction(query: string): Promise<BuyerHit[]>` (exported server action; `BuyerHit` type re-exported or imported by the component with `import type`).

- [ ] **Step 1: Add `searchBuyersAction`.** First line `await requireFounder()`, then `return searchBuyers(str(query, 120))`, wrapped in `try/catch` returning `[]` on any error (table missing, DB hiccup) with no data in a log.
- [ ] **Step 2: Add the upsert call** in `createInvoiceAction` after `createInvoice` succeeds and in `updateInvoiceAction` after `updateInvoice` succeeds, using the cleaned `buyerName`, `buyerPhone`, `buyerAddress`. Put it in a small local helper `saveBuyer(clean)` that wraps `upsertBuyer` in `try/catch` and swallows the error, so a directory failure cannot change the action's result.
- [ ] **Step 3: Check** `cd app && npx tsc --noEmit && npm run lint`. Expected: clean. Review the diff to confirm no value is logged.
- [ ] **Step 4: Commit** `feat(buyers): founder-only search action, save buyer on invoice create and edit`.

---

### Task 5: Wizard combobox

**Files:**
- Create: `app/src/components/buyer-combobox.tsx`
- Modify: `app/src/components/invoice-wizard.tsx` (the "Nama pembeli" label in step 0)
- Modify: `app/src/components/invoice.module.css` (listbox styles using existing tokens)

**Interfaces:**
- Consumes: `searchBuyersAction`, `BuyerHit` (Task 4).
- Produces: `BuyerCombobox({ value, onChange, onPick }: { value: string; onChange: (name: string) => void; onPick: (b: BuyerHit) => void })`, a client component that renders the same `<label className={s.field}>Nama pembeli<input …/></label>` look plus a listbox.

- [ ] **Step 1: Build `BuyerCombobox`.** Input with `role="combobox"`, `aria-expanded`, `aria-controls`, `aria-activedescendant`, `autoComplete="off"`. Debounce 200 ms. Fewer than 2 trimmed characters: clear the list and send nothing. A request counter ref discards responses that are not the latest. Options show name with phone and address as secondary text. ArrowDown/ArrowUp move, Enter picks, Escape closes, blur closes after a click on an option still registers (use `onMouseDown` on options). Typing never calls `onPick`.
- [ ] **Step 2: Wire into the wizard.** Replace the name label with `<BuyerCombobox value={buyer.name} onChange={(name) => setBuyer({ ...buyer, name })} onPick={(b) => setBuyer({ name: b.name, phone: b.phone, address: b.address })} />`. Leave `pick` (from order), lines, fee, and paid untouched.
- [ ] **Step 3: Style** the list in `invoice.module.css` with existing tokens (`--canvas`, `--line`, `--ink`, `--muted`, `--radius-control`). Hover/active option uses an existing surface token. Touch target at least 44px. Follow `founder-os-design-system.md`; add a line there if the pattern is new.
- [ ] **Step 4: Verify.** `cd app && npx tsc --noEmit && npm run lint`. Then `npm run dev:db`, run `npm run dev` with throwaway `ADMIN_*` env vars, open `/founder/invoices/new`, and check: typing 1 character shows no list; typing 2 shows seeded buyers; arrow keys and Enter fill phone and address; typing a new name leaves phone and address alone; edit mode still works.
- [ ] **Step 5: Commit** `feat(buyers): buyer search combobox in invoice wizard`.

---

### Task 6: Verification, review, docs

**Files:**
- Modify: `docs/technical/data-model.md`, `docs/technical/security.md` (§15.3), `docs/technical/api-surface.md`, `docs/implementation-status.md`, `docs/changelog.md`, `docs/technical/founder-os-design-system.md` (only if Task 5 added a pattern)
- Modify: `app/package.json` version bump if the repo bumps it per feature (follow the 0.25.0 commit)

- [ ] **Step 1: Full checks.** `cd app && npx tsc --noEmit && npm test && npm run lint && npm run build && npm run test:integration`. Expected: all pass.
- [ ] **Step 2: E2E.** `npm run e2e:setup` then `npm run e2e` (local `le_nouette_e2e` only). Expected: existing specs pass.
- [ ] **Step 3: Reviewer persona.** Dispatch `le-nouette-reviewer` with the Playwright kit in `.claude/playwright/` on the invoice wizard step 0 at 390px and 1440px, light and dark. Fix owner-tagged items. At most one more review pass.
- [ ] **Step 4: Docs persona.** Dispatch `le-nouette-docs`. Required content: new table and RLS in `data-model.md`; `security.md` §15.3 says the directory is founder-only, RLS on, no field encryption and why; `api-surface.md` lists `searchBuyersAction`; status and changelog entry state migration `0008` is applied locally only and not yet in production.
- [ ] **Step 5: Commit** `docs: buyer directory (0.26.0)` with the feature commits. The pre-commit hook requires `docs/` in the commit that touches `app/src`.

---

### Task 7: Production rollout (gated)

Do not start without the owner's go-ahead at this point, even though Supabase and Vercel access was offered. Migration order matters: table first, deploy second.

**Interfaces:**
- Consumes: green Task 6.

- [ ] **Step 1: Ask the owner about `0007`.** Production has not applied `0007_pickup_single.sql`, which rewrites `orders.fulfillment`. Ask whether to apply it together with `0008`. Do nothing on `0007` without an answer.
- [ ] **Step 2: Confirm access.** Calling a Supabase MCP tool by name or a `ToolSearch` query naming `plugin:supabase:supabase` retries the connection. If still unauthenticated, tell the owner to authorise it (`/mcp` in an interactive session) or hand over `0008_buyers.sql` for them to run in the Supabase SQL editor.
- [ ] **Step 3: Read-only pre-check** on project `xvbloiuwedrpcrjjusky`: `list_migrations` shows 0000 to 0006, and `select to_regclass('public.buyers')` is null.
- [ ] **Step 4: Apply `0008`** (and `0007` only if approved) with the Supabase `apply_migration` tool. Check `select count(*), count(distinct phone) from buyers` (equal) and `select relrowsecurity from pg_class where relname = 'buyers'` (true). Run the Supabase security advisor and confirm no new RLS warning for `buyers`. Report row counts only, never names or numbers.
- [ ] **Step 5: Deploy.** Push to `main` (the repo allows this once verified), confirm the Vercel deployment reaches READY, then open `/founder/invoices/new` on the production site and confirm the combobox lists buyers. Do not create or edit real invoices.
- [ ] **Step 6: Update docs** to say `0008` is applied in production, with the date, and commit.

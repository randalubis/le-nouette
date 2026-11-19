# Buyer directory for invoices (design)

Status: awaiting owner approval. Size: small change (one table, two server actions, one wizard step).

## Intent

The owner issues invoices for repeat customers. Today the invoice wizard can only prefill from an order, so a returning customer without a fresh order means retyping name, phone, and address. The owner wants a stored buyer directory. In the wizard's buyer step, the name box accepts typed text or a pick from earlier buyers, and picking one fills phone and address.

## Goals

- Store buyer name, phone, and address in a `buyers` table.
- Name box in the invoice wizard (`invoice-wizard.tsx`, step "Pembeli") offers matching earlier buyers as the owner types. Picking one fills phone and address. Typing a new name still works.
- A buyer is saved or updated automatically when an invoice is created or edited.
- Existing buyers are backfilled once from `orders` and `invoices`.
- Customer data stays founder-only.

## Non-goals

- Autofill of products, delivery fee, or notes (owner chose phone and address only).
- A buyer management page, merge tool, or delete button. Add when the owner asks.
- Column-level encryption. `orders` and `invoices` already hold the same fields in plain text, so encrypting only `buyers` would not raise overall protection. Doing it properly covers all three tables and is a separate change.
- Linking invoices to buyers by foreign key. Invoices stay immutable snapshots (`schema.ts` invoice comment); autofill copies values into the form only.

## Anti-goals

- Shipping the whole buyer list to the browser.
- Two directory rows for the same person because of phone formatting (`0812…` vs `+62 812…`).
- Editing a buyer changing any issued invoice.

## Constraints

- Follow the invoice tables' pattern: direct queries in `lib/db/`, outside the `loadState`/`diffAndWrite` domain model.
- Every new server action calls `requireFounder()` first and sanitises input with the existing `str()` helper in `invoice-actions.ts`.
- RLS enabled on the new table, no policies. The app connects through `DATABASE_URL`, which bypasses RLS, and the anon key gets nothing.
- No buyer names or numbers in logs or audit refs.
- Migration `0008` is applied to local `le_nouette_dev` and `le_nouette_e2e` only. Production is not touched; the status doc must say it is unapplied, as it does for 0007.
- Founder UI changes follow `docs/technical/founder-os-design-system.md` and are checked at 390px and 1440px, light and dark.

## Approaches

1. **Separate `buyers` table (chosen).** Upsert on invoice save, backfill once. Fast indexed search, edits to the directory later are cheap, and phone is a real unique key. Cost: one migration and a second place where buyer data lives.
2. **Query distinct buyers from `invoices` and `orders` at search time.** No migration and no new storage. Rejected: no stable identity (one person appears under several spellings), no place to correct a record, and it scans two growing tables with jsonb for every keystroke.
3. **Browser-local list (like `remembered.ts`).** No server storage. Rejected: the directory would differ per device and the owner asked for stored buyer details.

## Design

**Table `buyers`**: `id` serial pk, `name` text not null, `phone` text not null unique (normalised, see below), `address` text not null default '', `updated_at` timestamptz not null default now(). RLS enabled. Index for name search: `lower(name)` btree with `text_pattern_ops` (prefix match).

**Normalisation.** Reuse `toWaNumber()` (`lib/domain/whatsapp.ts`). A phone that normalises to a valid `62…` number is the key. A buyer whose phone is empty or invalid is not saved to the directory (the invoice itself still saves as today), because there is no safe key to deduplicate on.

**Save.** `createInvoice` and `updateInvoice` callers (the two actions in `invoice-actions.ts`) call `upsertBuyer({ name, phone, address })` after the invoice is written. On a phone conflict it overwrites name and address with the latest values and bumps `updated_at`. An empty address never erases a stored one (call made while writing the plan). A failure to upsert must not fail invoice creation: catch, skip, no data in the log message.

**Search.** New server action `searchBuyersAction(query)`: `requireFounder()`, trim, require at least 2 characters, escape `%`, `_`, `\` in the query, prefix match on `lower(name)`, order by `updated_at desc`, limit 8, return `{ id, name, phone, address }[]`.

**Wizard.** The name input becomes a combobox. The native `<input list>` does not fit because the options come from the server per keystroke, so use a plain input plus a listbox below it (`role="combobox"`, `aria-expanded`, arrow keys, Enter to pick, Escape to close), debounced about 200 ms. Picking a result sets name, phone, and address. Typing without picking changes nothing else. Edit mode and the "Dari pesanan" prefill keep working and are not overwritten until the owner picks a buyer. Strings in Indonesian, matching the wizard.

**Backfill.** Migration `0008` creates the table, enables RLS, and inserts distinct buyers from `orders` (customer name and WhatsApp, address when present) and `invoices` (buyer fields). It normalises the phone in SQL with the same rule as `toWaNumber`, skips rows that do not match, and keeps the most recent row per phone. If the SQL normalisation proves awkward, a one-off script in `app/drizzle/` calling `toWaNumber` replaces it. Builder's call.

**Tests.** Unit test for the normalise-and-dedupe rule (`0812-3456-7890`, `+62 812…`, `62812…` become one key; invalid and empty are skipped) and for query escaping. One integration check on `le_nouette_dev`: create two invoices for the same phone, expect one `buyers` row with the later address. No fixtures or frameworks beyond what the repo already uses.

**Docs.** `data-model.md` (new table), `security.md` §15.3 (buyers table is founder-only, no field encryption yet and why), `api-surface.md` (new action), `implementation-status.md`, `changelog.md`, via the docs persona before commit.

## Left to the builder

- Exact column type and index details for the prefix search.
- SQL versus script for the backfill.
- Combobox styling, using existing tokens in `founder.module.css` and `invoice.module.css`.
- Whether `updated_at` ordering or name ordering reads better in the dropdown, after seeing real data.

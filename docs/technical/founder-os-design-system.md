# Founder OS Design System ("Cool Slate")

[← Technical spec hub](../technical-spec.md) · [UI requirements](./ui-requirements.md) · [Changelog](../changelog.md)

**This is the source of truth for how any Founder OS screen looks and behaves.** Read it before building or changing any page, component or feature under `/founder` or `/login`. If something you need is missing, extend this document in the same change (the docs persona checks it).

Scope: the Founder OS back office and the founder login. The public storefront keeps its own wine palette and is **not** covered here.

Provenance: designed in the "Founder OS Redesign" Design canvas (Palette C "Cool Slate"), built in phases 1 to 4 (changelog 0.17.0 to 0.20.0) and refined by the reviewer passes (0.20.1), then by reviewer pass 1 and pass 2 with fixes made after pass 2 and verified without a third pass (0.20.3). The 0.20.5 single reviewer pass covered order-card action order and attention icon chips (7/10, synthetic states only). The 0.22.0 UI pass was reviewed on seeded data (pass 1 7/10, pass 2 8.5/10 SHIP); the three small fixes after pass 2 were measured, not re-reviewed. Where this file and the code disagree, the code in `app/src/components/founder.module.css` wins, then fix this file.

## 1. Principles

1. **Calm, neutral, one accent.** Slate surfaces, one sage accent, red only for alerts. Never introduce a new hue for decoration.
2. **One primary action per card.** The most likely next step is the filled button; everything else is quiet.
3. **Lead with the next action.** Each screen opens with what the founder should do now (hero tile, attention list), details follow.
4. **Mobile first, thumb first.** Design at 390px, then widen to 1440px. Primary controls sit in the lower, reachable part of a card.
5. **Tokens, not literals.** No hard-coded colors, radii or shadows in founder components.
6. **Light and dark are equal citizens.** Every screen must pass in both.

## 2. Where the system lives

| Concern | File |
|---|---|
| Founder tokens, shell (sidebar, topbar, mobile nav), dashboard, orders, stock, finance, calendar | `app/src/components/founder.module.css` |
| Global tokens and shared `.btn`, `.status`, `.icon-btn` | `app/src/app/globals.css` |
| Shared cards | `app/src/components/ui/` (`metric-card`, `action-card`, `list-row-card`, each with a `.module.css`) |
| Invoice and form patterns (fields, steps, lines, table, summary) | `app/src/components/invoice.module.css` |
| Login (own scoped copy of the tokens on `.page`, because it sits outside the shell) | `app/src/app/login/login.module.css` |

Tokens are overridden on the `.app` wrapper, so anything rendered inside the Founder shell re-themes automatically. A new page inside the shell needs no theming work if it only uses tokens and the shared components.

## 3. Color tokens

Use the token name, never the hex. Hex values are listed so reviewers can sanity-check.

| Token | Light | Dark | Use |
|---|---|---|---|
| `--canvas` / `--paper` | `#f2f4f5` | `#121719` | Page background, inset tiles |
| `--surface` / `--cream` | `#ffffff` | `#1b2326` | Cards, panels, topbar |
| `--sunken` | `#e8ecee` | `#263033` | Tabs track, disabled, bar track, table header |
| `--ink` | `#161b1d` | `#e6ecee` | Body and heading text |
| `--muted` | `#5b686d` | `#b4c1c6` | Captions, hints, labels |
| `--line` | `#dfe4e6` | `#3a484d` | Card and divider borders |
| `--control` | `#cfd7da` | `#4a5a60` | Borders of buttons, inputs, pills (slightly stronger than `--line`) |
| `--chip` | `#e3eaec` | `#34434a` | Active-nav pill, soft chips |
| `--wine` (primary) | `#1f2a2e` | `#b7cbb8` | Primary buttons, active states, charts. Historical name: it is slate in light and sage in dark |
| `--on-primary` | `#fafbfb` | `#1f2a2e` | Text on primary |
| `--primary-hover` | `#161e21` | `#cddccd` | Primary hover |
| `--wine-text` | `#1f2a2e` | `#b7cbb8` | Emphasised numbers, links |
| `--danger-bg` / `--danger-line` / `--danger-fg` | `#fbe1dd` / `#e9b7b0` / `#a3312d` | `#4a2226` / `#7a3a3f` / `#f4b4ae` | The red family: alert tiles, card errors, the payment attention chip. Canonical since 0.22.0; `--alert-*` is removed |
| `--side-bg`, `--side-fg`, `--side-fg2`, `--side-mute`, `--side-accent` | slate sidebar, sage accent `#b7cbb8` | darker sidebar `#0e1315` | Sidebar only |
| `--side-hover`, `--side-active`, `--side-line`, `--side-strong`, `--side-on-accent`, `--side-ring` | white overlays `.07`, `.1`, `.14`; `#ffffff`; `#1f2a2e`; `#b7cbb8` | same | Sidebar hover, active item, dividers, strong text and the sidebar focus ring (0.22.0) |
| `--hero-bg`, `--hero-fg`, `--hero-sub`, `--hero-accent` | `#1f2a2e` / `#fff` / `#c5d0d4` / `#b7cbb8` | hero bg `#263033` | Dark hero tiles |
| `--hero-tint`, `--hero-line`, `--hero-tile`, `--hero-field-bg`, `--hero-field-fg`, `--hero-on-accent`, `--hero-accent-hover` | white `.1`, `.16`, `.08` overlays; `#fafbfb` / `#161b1d`; `#1f2a2e`; `#cddccd` | same | Parts of the dark hero: tiles, dividers, fields, accent hover (0.22.0) |
| `--hover` | `rgba(0,0,0,.05)` | same; nearly invisible on dark | Hover fill for menu links (open, section 11) |
| `--nav-h`, `--bulk-h` | `68px` / `150px` | same | Mobile bottom nav height; list bottom padding reserved under the mobile bulk bar (0.22.0) |
| `--shadow`, `--shadow-sm`, `--shadow-md`, `--shadow-menu`, `--shadow-float` | see section 5 | `--shadow` only differs in dark | Elevation (0.22.0) |
| `--focus-width`, `--focus-offset` | `2px` / `2px` (`globals.css`) | same | Focus ring width and offset; see section 8 |
| `--bar-neutral` | `#aebcc1` | `#5d6e74` | Stock bars (healthy) |
| `--chart-1`, `--chart-2`, `--chart-3` | `#1f2a2e`, `#7c8d93`, `#cfd7da` | `#b7cbb8`, `#6d7f86`, `#3d4b50` | Data series, in this order |
| `--danger-*`, `--safe-*`, `--warn-*`, `--neutral-*` | from `globals.css` | dark variants in `globals.css` | Status chips and inline messages |

Rules:

- Meaning by color: **red** = needs action or problem, **amber** = caution or low, **green** = fine or paid, **slate/neutral** = information. Do not use color alone; always pair it with text or an icon.
- Dark mode is `@media (prefers-color-scheme: dark)`. Never branch on a JS theme flag.
- Contrast: body text at least 4.5:1, large text (24px, or 19px bold) at least 3:1, in both modes. Do not lower contrast with `opacity`; pick a token.

## 4. Typography

- Family: the app sans (`--font-sans`, Geist via `globals.css`). The serif display face is storefront-only; do not use `.display` in Founder.
- Page title (`.topbar h1`): 22px desktop, 20px mobile, weight 700, tracking -0.02em.
- Panel title (`h2` in `.panelHeader`): 17px. Card title (`h3`): 14px.
- Hero and metric value: 32px (27px under 560px), tracking -0.04em, weight 650 to 700. Money in neutral tiles is fluid: `clamp(17px, 16cqi, 32px)` from the tile's own width (`ui/metric-card.module.css`), so full Rupiah fits at 320px. Compact hero value `clamp(16px, 14cqi, 22px)`. Finance hero value `clamp(30px, 12cqi, 52px)`.
- Body 14px, hint and caption 13px, chip and legend 12px. **Never below 12px.**
- Numbers in tables, calendars and totals use `font-variant-numeric: tabular-nums`.
- Money is always `formatRupiah()` (full Rupiah, `lib/domain/catalog.ts`). `shortMoney` (`Rp250 rb`) was deleted in 0.22.0; the Beranda hero shows full Rupiah. Quantities use `formatQuantity()`. Negative stock uses `formatAvailable()` (never below 0) and `formatShortage()` (`Kurang 25 g`). Dates use `formatDateTime()` (`9 Okt, 11.20`; year shown only when it is not the current year) and `formatDate()` in `lib/domain/schedule.ts`. Never hand-format.

## 5. Shape, spacing, elevation

- Radius: cards `--radius-card` (22px), controls `--radius-control` (14px), inner tiles 16px, order cards 18px, pills and chips 999px. Calendar days 12px.
- Card padding: `--pad-card` 22px; panels 24px; 14 to 16px on screens under 560px.
- Gaps: 12 to 14px between tiles, 18px between panels, 8px between buttons, 28px before a section header that follows a panel.
- Borders over shadows. Cards use a 1px `--line` border. Shadow rule (0.22.0): use only these tokens, never a literal shadow. `--shadow-menu` for dropdown menus (export and avatar menus), `--shadow-float` for the mobile bulk bar, `--shadow-sm` for the active segmented tab, `--shadow-md` for the order card. `--shadow` is defined in the Founder tokens but no Founder rule uses it.
- Page container: `.content`, max width 1480px, padding 28px 32px (18px 14px on mobile, extra bottom padding for the fixed nav).

## 6. Layout and responsive rules

- **Breakpoints (as in the CSS, 0.22.0):** 1280px (invoice table starts; the invoice list is cards up to 1279px, and Aksi wraps to two rows from 1280 to 1439px), 1000px (Pengaturan form in two columns), 900px and 901px (shell switches: sidebar above 900px, bottom nav and fixed bulk bar at 900px and below; invoice table rules start at 901px), 600px (Pengaturan contact row and wizard steps in one column), 560px (single-column and denser cards; status tabs 2x2; fulfillment chips 4 across; Keuangan tiles 2 across), 480px (invoice table padding), 360px (wizard steps 2x2; bottom nav labels 12px and not bold; calendar gap 0), 340px (Keuangan side tiles one column).
- **Desktop (above 900px):** left sidebar 248px (slate, sage active bar, user card at the bottom), sticky topbar 76px, content grid.
- **Mobile (900px and below):** sidebar hidden, fixed bottom nav of 6 items (active item gets a chip behind the icon), topbar is title plus avatar only. Secondary actions (export, Pengaturan, logout) live in the avatar menu.
- Metric grids: `repeat(auto-fit, minmax(170px, 1fr))`; two columns on mobile, with hero and alert tiles spanning the full width (`[data-variant="hero"]`, `[data-alert]`).
- Dashboard: two columns on desktop (main panel `1.2fr`, side panel `.8fr`), one column on mobile. The next-action panel comes first in the DOM.
- Cards that list items use `auto-fill` grids (`minmax(290px, 1fr)`), never fixed column counts. The invoice card layout uses `minmax(min(380px, 100%), 1fr)`.
- Fixed or sticky bars must fit 320px, must not cover the primary control, and must be hidden when there is nothing to act on.
- No horizontal page scroll at 320px. Wide tables become stacked cards up to 1279px (the invoice list; see `invoice.module.css` `.list`: card layout up to 1279px, table from 1280px). Beranda overflow at 320px was fixed in 0.22.0 with `min-width: 0` on grid and flex children and wrapping on long rows.

## 7. Components

Reuse before you build. If a pattern appears twice, add it here and to `components/ui/`.

### 7.1 Buttons (`globals.css`, themed by `.app`)

- `.btn .btn-primary`: filled slate (sage in dark). **One per card or form.** Min height 48px and 15px text for the primary inside order cards.
- `.btn .btn-quiet`: outlined neutral, for secondary actions.
- `.btn .btn-secondary`: transparent with a primary-color border, for alternate positive actions.
- `.icon-btn`: 44px round icon button.
- `.textLink`: inline text action, min 44px high and wide.
- Header actions on desktop are outlined pills (`--control` border, 999px radius).
- Disabled buttons use the solid dashed `button.btn:disabled` style, **not opacity**.
- **State-dependent primary:** the primary button is the step that unblocks the order. Example: a ready-for-handover order that is unpaid leads with "Tandai Lunas"; "Tandai Dikirim" / "Tandai Selesai" become quiet until it is paid. Keep button labels stable; change emphasis, not wording.
- **Primary first in order cards:** `.cardActions .btn-primary` has `order: -1`, so the single primary renders first even when the markup puts a quiet button before it. An unpaid ready order therefore leads with "Tandai Lunas" while dispatch/complete stays quiet after it. Keep one primary per card; do not rely on markup order for it.
- Destructive actions are never the primary button, are text or quiet style, sit at the end of the row, and always confirm inline before acting.
- **Invoice row actions (`invoice-row-actions.tsx`):** "Tandai Lunas" is the single primary on an unpaid invoice. Unduh and Edit share a compact row; Hapus is quiet at the end. Desktop table buttons (1280px and up) use `.btn` at 36px high; from 1280 to 1439px the Aksi buttons wrap to two rows, and at 1440px and up they sit in one row. The card layout (up to 1279px) uses 44px. The old `.act` class was removed in 0.22.0.
- **Locked actions:** when an action is blocked (for example Edit and Hapus on a paid invoice), disable the buttons, show a lock icon with the text "Terkunci", put the reason in a `title`, and link the reason to the buttons with visually hidden text and `aria-describedby`.

### 7.2 Status chips

`<span class="status status-safe|status-warning|status-danger|status-neutral">`. 12px, bold, pill, 5px 9px padding. Text states the fact ("Belum dibayar", "Lunas · QRIS", "Rendah"). One chip per fact; do not stack more than two on a card.

### 7.3 `MetricCard` (`ui/metric-card.tsx`)

Props: `label`, `value`, `hint`, `href`, `variant: "neutral" | "hero"`, `alert`, `compact`.

- `hero`: dark tile for the single most important number or date on the page. **At most one per row/section.** On finance it is the revenue figure.
- `neutral`: white tile for supporting numbers.
- `alert`: red tile for money or items needing attention.
- Always include a `hint` that explains the number. Give it an `href` when a detail page exists.

### 7.4 `ActionCard` (`ui/action-card.tsx`)

Title, subtitle, header action, children as action row, optional note. `tone="dark"` is for the single emphasised action on a screen (for example "Siap dijual"): light inputs, sage primary button.

### 7.5 `ListRowCard` (`ui/list-row-card.tsx`)

Title and subtitle on the left, optional middle, trailing value or chip on the right. Use for payments, receivables, movements, refunds. Link the whole row when a detail exists.

### 7.6 Panel

`.panel` plus `.panelHeader` (title 17px, caption 13px muted, optional `.textLink` on the right). All dashboard sections are panels.

### 7.7 Order card

Head row (ID plus payment chip), customer name, items, meta row (place, ready date, dispatch), optional referral and address hints, footer total (17px, right), then `.cardActions`. `.cardActions` is a wrapping flex row. The primary button is full width and renders first (`order: -1`). Quiet buttons pair two per row. The WhatsApp link (`.waRow`, order 98) comes after them and the text-link footer (`.cardFoot`, order 99) comes last. Worst case is three button rows (primary; quiet pair such as dispatch/complete plus Buat Invoice; Kirim WhatsApp) plus the footer. Do not add a fourth button row. "Buat Invoice" is a text link in the footer row (`.cardFoot`, order 99), left-aligned and wrapping; there is no right-aligned destructive link. On desktop, Siap Diserahkan cards span three grid rows with `subgrid` (body, total, actions) so they line up; the flex layout is the fallback (not exercised in review). `.orderHead` has `min-height: 26px` so cards without a badge still align.

### 7.8 Stock card and bar

Name plus chip, 32px value, one muted line, a bar (8px, track `--sunken`, fill `--bar-neutral`, `--wine` when low, 2px threshold marker at 50%), footer with the threshold. Below 900px the stock-edit form sits inside a `<details class="stockMore">` with an outlined pill summary ("Ubah stok"); on desktop it is open. Negative stock shows `formatAvailable()` (0 at the floor) and a `.shortage` line from `formatShortage()` ("Kurang 25 g"). This is display only; `createOrder` can still reserve beyond stock (Medium backlog row).

### 7.9 Finance hero and method bar

Dark hero (`--hero-bg`) with the big figure on the left and a side column of translucent tiles. Method share uses `.methodBar` (segmented, 16px, 3px gaps) plus `.methodLegend` swatches, colored from `--chart-1..3`.

### 7.10 Calendar (`MonthCalendar` in `founder-boards.tsx`)

Seven-column grid, 44px day buttons, 12px radius. States: **closed** (filled primary), **today** (2px inset ring), **pending** (2px dashed), **past/disabled** (muted text, no opacity). Legend below, month navigation with two icon buttons. Always show state with a shape or text, not color alone. Day buttons are 44px; at 320px they measure 39px (accepted exception, section 8.1).

### 7.11 Forms and tables (`invoice.module.css`)

- Fields: label above, input min 44px, 12px radius, `--control` border, canvas background, 15px text. Placeholders are examples, never the label.
- Stepper: pill steps (44px high), current step filled primary, horizontally scrollable on mobile.
- Line groups: bordered fieldset, 18px radius. Summary and totals: canvas background, tabular numbers, bold grand total.
- Messages: `.error` (danger tokens) and `.ok` (safe tokens), inline, 14px bold.
- Tables: wrapped in a bordered rounded container, header on `--sunken`, last column right-aligned, numbers tabular. Up to 900px render rows as cards (invoice list).
- Checkboxes use the `.check` pattern (`invoice.module.css`): the label gets `.check`, and holds a real `<input type="checkbox">` plus an `aria-hidden="true"` `<span class="box">`. The input is stretched over the whole row (at least 44px) at `opacity: 0`, and `.box` draws the 22px control. The `.box` span is required next to the input wherever `.check` is used; without it the checkbox is invisible. Used for "Hapus logo" and the wizard "Perbarui info perusahaan".
- Native date inputs are accepted as-is. The Pengaturan logo uses the `.filePick` pattern (0.22.0): a `.fileBtn` labelled "Pilih berkas" is the visible button, the native file input sits over it (`pointer-events: none` on the button) and takes the click and focus, and `.fileName` shows the chosen file name in muted 13px text. The focus ring is drawn on `.fileBtn` with `:has(input:focus-visible)`.

### 7.12 Alerts and banners

Warning box (`.alertBox`, warn tokens) for non-blocking caveats; danger status banner for store-paused style states with a link to fix it. Alert text must carry its own color token (`--danger-fg` or `--warn-fg`) so it stays readable in dark.

### 7.13 Empty and done states

Muted one-liner ("Tidak ada pesanan di sini.") for empty lists; a green check line ("Semua beres hari ini") when a screen has nothing left to do. Never leave a blank panel.

### 7.14 Icons

Phosphor icons (`@phosphor-icons/react`), 13 to 18px inline, 22 to 24px in nav. Icons support text; they do not replace it. Every icon-only control needs an `aria-label`.

### 7.15 Attention row (Beranda "Perlu perhatian")

A three-column grid row (0.22.0): a 36px icon chip on the left (`.attnIcon`, 12px radius, centred icon, `--chip` background and `--muted` icon by default) that spans two grid rows; the title link (`.attnIcon + a`), which is 44px high and whose `::after` stretches the whole row into a tap target; a muted detail line on row 2; and the status chip or the "Pesan ulang" button in column 3. "Pesan ulang" is a quiet underlined text button (44px, `--wine-text`). At 560px and below the chip stays left and the status or button drops to row 3 under the detail.

- Low stock rows: `.attnIcon.warn` (Package icon, `--warn-bg` / `--warn-fg`).
- Payment rows: `.attnIcon.danger` (Wallet icon, `--danger-bg` / `--danger-fg`).
- The chip is `aria-hidden`. The title text carries the meaning, so the icon and colour never stand alone.
- Do not put an icon inside the title; the chip is the only icon in the row.
- Two-line rows and the Wallet chip are not yet checked on real production data (section 11).

### 7.16 Bulk bar and selection checkbox (Pesanan)

- **Selection checkbox (`.pick`, 0.22.0):** the same pattern as `.check`. A 44px label holds a real input stretched over it, and an `aria-hidden` `.pickBox` (24px, 2px `--control` border, `--wine` fill with a check mark when checked) draws the control. Only ready-for-handover delivery orders that can be bulk-dispatched show it.
- **Bulk bar (`.bulkBar`):** an `ActionCard`-based bar shown only when at least one card is selected. Desktop (901px and up): sticky at the bottom of the list, one compact row (about 66px). Mobile (900px and below): `position: fixed` above the bottom nav (`bottom: calc(var(--nav-h) + 8px + safe area)`), 14px side inset, `--shadow-float`, full-width buttons. The list adds bottom padding of `--bulk-h` + 16px (`.hasBulk`) so the last cards are not covered.
- The mobile bar measures 102px (two 44px targets); see the exceptions in section 8.1.

### 7.17 Route states

- Global `.route-state` (full height, centred, canvas background) and `.route-card` (up to 480px, surface card, card radius) in `globals.css`. Use these for any route-level state; do not add new ones.
- Used by: `app/not-found.tsx` (styled 404 with links); `app/error.tsx` and `app/founder/error.tsx` (`role="alert"`; they receive `retry`, because Next 16.3.5 passes `retry`, not `reset`); `app/global-error.tsx` (inline styles, because it replaces the root layout).
- `app/founder/loading.tsx` is a skeleton streamed while `/founder/*` routes load.
- These were code-reviewed only. Their rendering is an open item (section 11).

### 7.18 Pending state

- Founder mutations run through a shared thunk-based `act` that keeps `isPending`. While a write runs, the pressed button reads "Memproses..." (its label is keyed on the busy action) and the buttons in that control are disabled.
- Used by the order board, Stok, Kalender, store status, packing panel, invoice row actions and the reset tool. The reset tool shows an inline `role="alert"` error when the reset fails.
- Keep the action's wording and change only the pending label. Never leave a double-tappable write button enabled while it runs.

## 8. Interaction and accessibility baseline

- Tap targets at least 44 by 44px (including text links and `<summary>`). Exceptions are listed in section 8.1.
- Every input has a label or `aria-label`. Every button or link has a name.
- Focus is visible; do not remove outlines. One global ring (0.22.0): `:focus-visible` uses `--focus-width` (2px) and `--focus-offset` (2px) from `globals.css`; the sidebar uses `--side-ring`. A control that hides its native input (`.check`, `.pick`, `.filePick`) draws the same ring on its visible part with `:has(input:focus-visible)`. Do not add a second ring style.
- Confirm destructive or stock-affecting actions (`window.confirm` is the current pattern for packing and dispatch; delete uses an inline confirm).
- Optimistic wording: buttons say what they do ("Selesai Packing"), not "OK".
- Copy is Indonesian, short, in the founder's vocabulary (Pesanan, Stok, Keuangan, Kalender, Invoice, Pengaturan, Piutang, Omzet). Times are Asia/Jakarta.

### 8.1 Accepted exceptions (0.22.0)

| Exception | Measured | Why it is accepted |
|---|---|---|
| Desktop invoice table row buttons (1280px and up) | 36px high | Desktop pointer use; the 44px rule applies to the card layout (up to 1279px). Still a Low open item. |
| Kalender day buttons at 320px | 39px wide, 44px high | Seven columns do not fit 44px in a 320px screen; the height stays 44px. Documented in `founder.module.css` (360px rule). |
| Mobile bulk-dispatch bar | 102px tall | It holds two 44px targets and their padding; the list reserves space under it so no card is covered. |

## 9. Information hierarchy per screen type

| Screen type | Order of content |
|---|---|
| Dashboard (Beranda) | Status banner if any, hero tile (next batch), 2 to 3 metric tiles, next-action panel, attention list |
| List (Pesanan, Invoice) | Tabs or filters, search and sort, bulk bar (only when selection exists), cards |
| Inventory (Stok) | Header with summary, cards in a grid, history list |
| Finance (Keuangan) | Hero with side tiles, method share panel, receivables, refunds, payment list |
| Planner (Kalender) | Month calendar plus legend, side column with status and actions |
| Form (Invoice wizard, Pengaturan) | Stepper or sections, fields, summary, navigation row with one primary |
| Auth (Login) | Centered card, 24px title, one 48px primary button, inline error |

## 10. Checklist for a new page or feature

1. Reuse a pattern from section 7; if none fits, design it from tokens and add it to this file.
2. Use only tokens from section 3; no hex, no `opacity` for contrast.
3. One primary action per card; state-dependent when the next step varies.
4. Works at 390px and 1440px, light and dark, no horizontal scroll, bottom nav not covered.
5. All controls at least 44px; text at least 12px; contrast passes in both modes.
6. Loading, empty, error and done states exist.
7. Money, quantity and date formatting use the shared helpers.
8. Run the Playwright audit (`.claude/playwright/audit.js`) and fix every flag on Founder pages. The audit covers home, orders, stock, availability, finance, invoices, invoices/new, the first invoice's edit page (if any) and settings, at 390 and 1440, light and dark, plus login. Run `npm run build` after any CSS edit: a stray brace can pass dev and e2e and still fail the build.
9. Docs persona updates `docs/implementation-status.md`, the changelog and this file if a pattern was added or changed.

## 11. Known open items

The ranked list and owners are in [implementation-status prioritized follow-ups](../implementation-status.md#prioritized-open-follow-ups). This section lists the design-side items as of 0.22.0.

Closed in 0.22.0 (removed from this list): stock history timestamps (`formatDateTime`); the Pengaturan desktop empty strip (two columns at 1000px and up); the `--alert-*` and `--danger-*` overlap (`--danger-*` is canonical); sidebar hover and active colors (now tokens); the lone "Buat Invoice" on paid ready orders (now a footer text link); the native file button for the logo (now `.filePick`); the two-line attention row check (now a three-column grid, still unchecked on real data, see below).

Open:
- Invoice action order differs: on order cards the primary renders first; in the invoice table the primary (Tandai Lunas) renders last.
- Beranda "Batch" panel has an empty lower half at 1440px.
- Kalender day buttons are 39px at 320px (accepted exception, section 8.1).
- `--hover` (`rgba(0,0,0,.05)`) is nearly invisible in dark mode.
- The stretched-link pattern in attention rows (`::after`) may be flagged by the tap-target audit; not checked.
- Route states `app/error.tsx`, `app/founder/error.tsx`, `app/global-error.tsx` and `app/founder/loading.tsx` are code-reviewed only; their rendering has not been viewed.
- The "4. Pratinjau" wizard pill at 390px has not been re-measured since the 2x2 grid at 360px.
- Not viewed by reviewers in 0.22.0: invoice list at 901, 1000 and 1100px; Pengaturan at 390px, 1440px and dark; wizard steps 3 and 4 at 320px; dark theme of the invoice list, Kalender and wizard steps 1, 2 and 4; Finance and Stok at 1440px; storefront screenshots; the flex fallback where `subgrid` is not supported.
- Pengaturan is not in the mobile bottom nav; it is reached from the avatar menu. Confirm that route is intended.
- Native date pickers keep the browser's language and look.
- The invoice list status chip on mobile makes its row slightly taller than needed.
- Class and token names keep the historical `wine` prefix for the primary color; renaming would also touch the storefront.
- Keuangan on mobile looks sparse with Rp0 test data; judge it with real data.
- Invoice edit page PDF content is not rendered or checked.
- Order-card and attention-chip states: the Wallet chip on a real payment row and the two-line attention rows are not checked on real production data (the local e2e database has no orders).
- Negative stock is a display fix only; `createOrder` reserves beyond stock (Medium backlog row).
- S1 to S3, the fixes made after reviewer pass 2, were measured by the engineer and not re-reviewed.

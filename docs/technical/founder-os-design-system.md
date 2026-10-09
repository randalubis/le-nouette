# Founder OS Design System ("Cool Slate")

[← Technical spec hub](../technical-spec.md) · [UI requirements](./ui-requirements.md) · [Changelog](../changelog.md)

**This is the source of truth for how any Founder OS screen looks and behaves.** Read it before building or changing any page, component or feature under `/founder` or `/login`. If something you need is missing, extend this document in the same change (the docs persona checks it).

Scope: the Founder OS back office and the founder login. The public storefront keeps its own wine palette and is **not** covered here.

Provenance: designed in the "Founder OS Redesign" Design canvas (Palette C "Cool Slate"), built in phases 1 to 4 (changelog 0.17.0 to 0.20.0) and refined by the reviewer passes (0.20.1), then by reviewer pass 1 and pass 2 with fixes made after pass 2 and verified without a third pass (0.20.3). Where this file and the code disagree, the code in `app/src/components/founder.module.css` wins, then fix this file.

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
| `--alert-bg` / `--alert-line` / `--alert-fg` | `#fbe1dd` / `#e9b7b0` / `#7e2623` | `#4a2226` / `#7a3a3f` / `#f4b4ae` | Alert tiles and cards |
| `--side-bg`, `--side-fg`, `--side-fg2`, `--side-mute`, `--side-accent` | slate sidebar, sage accent `#b7cbb8` | darker sidebar | Sidebar only |
| `--hero-bg`, `--hero-fg`, `--hero-sub`, `--hero-accent` | `#1f2a2e` / `#fff` / `#c5d0d4` / `#b7cbb8` | hero bg `#263033` | Dark hero tiles |
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
- Hero and metric value: 32px (27px under 560px), tracking -0.04em, weight 650 to 700. Compact hero value 22px. Finance hero value 52px (40px mobile).
- Body 14px, hint and caption 13px, chip and legend 12px. **Never below 12px.**
- Numbers in tables, calendars and totals use `font-variant-numeric: tabular-nums`.
- Money is always `formatRupiah()` (full) or the local `shortMoney` (`Rp250 rb`, `Rp1,5 jt`) from `packing-panel.tsx`; quantities use `formatQuantity()`. Both live in `lib/domain/catalog.ts`. Never hand-format.

## 5. Shape, spacing, elevation

- Radius: cards `--radius-card` (22px), controls `--radius-control` (14px), inner tiles 16px, order cards 18px, pills and chips 999px. Calendar days 12px.
- Card padding: `--pad-card` 22px; panels 24px; 14 to 16px on screens under 560px.
- Gaps: 12 to 14px between tiles, 18px between panels, 8px between buttons, 28px before a section header that follows a panel.
- Borders over shadows. Cards use a 1px `--line` border. Shadow (`--shadow`) is reserved for floating layers (menus, bulk bar).
- Page container: `.content`, max width 1480px, padding 28px 32px (18px 14px on mobile, extra bottom padding for the fixed nav).

## 6. Layout and responsive rules

- **Breakpoints:** 900px (shell switches; invoice list switches to card layout), 560px (single-column and denser cards), 360px (very small tweaks). Pengaturan contact fields go to one column at 600px.
- **Desktop (above 900px):** left sidebar 248px (slate, sage active bar, user card at the bottom), sticky topbar 76px, content grid.
- **Mobile (900px and below):** sidebar hidden, fixed bottom nav of 6 items (active item gets a chip behind the icon), topbar is title plus avatar only. Secondary actions (export, Pengaturan, logout) live in the avatar menu.
- Metric grids: `repeat(auto-fit, minmax(170px, 1fr))`; two columns on mobile, with hero and alert tiles spanning the full width (`[data-variant="hero"]`, `[data-alert]`).
- Dashboard: two columns on desktop (main panel `1.2fr`, side panel `.8fr`), one column on mobile. The next-action panel comes first in the DOM.
- Cards that list items use `auto-fill` grids (`minmax(290px, 1fr)`), never fixed column counts.
- Fixed or sticky bars must fit 320px, must not cover the primary control, and must be hidden when there is nothing to act on.
- No horizontal page scroll at 320px. Wide tables become stacked cards up to 900px (the invoice list; see `invoice.module.css` `.list`, card layout from 900px down, table from 901px up).

## 7. Components

Reuse before you build. If a pattern appears twice, add it here and to `components/ui/`.

### 7.1 Buttons (`globals.css`, themed by `.app`)

- `.btn .btn-primary`: filled slate (sage in dark). **One per card or form.** Min height 46px, 48px and 15px text inside order cards.
- `.btn .btn-quiet`: outlined neutral, for secondary actions.
- `.btn .btn-secondary`: transparent with a primary-color border, for alternate positive actions.
- `.icon-btn`: 44px round icon button.
- `.textLink`: inline text action, min 44px high and wide.
- Header actions on desktop are outlined pills (`--control` border, 999px radius).
- Disabled buttons use the solid dashed `button.btn:disabled` style, **not opacity**.
- **State-dependent primary:** the primary button is the step that unblocks the order. Example: a ready-for-handover order that is unpaid leads with "Tandai Lunas"; "Tandai Dikirim" / "Tandai Selesai" become quiet until it is paid. Keep button labels stable; change emphasis, not wording.
- Destructive actions are never the primary button, are text or quiet style, sit at the end of the row, and always confirm inline before acting.
- **Invoice row actions (`invoice-row-actions.tsx`):** "Tandai Lunas" is the single primary on an unpaid invoice. Unduh and Edit share a compact row; Hapus is quiet at the end. Desktop table buttons (901px and up) are 36px high in one row. Card layout (900px and below) uses 44px.
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

Head row (ID plus payment chip), customer name, items, meta row (place, ready date, dispatch), optional referral and address hints, footer total (17px, right), then `.cardActions`. The primary button spans the full width; quiet buttons share the row two per line; secondary links (WhatsApp, cancel) go last.

### 7.8 Stock card and bar

Name plus chip, 32px value, one muted line, a bar (8px, track `--sunken`, fill `--bar-neutral`, `--wine` when low, 2px threshold marker at 50%), footer with the threshold. Below 900px the stock-edit form sits inside a `<details class="stockMore">` with an outlined pill summary ("Ubah stok"); on desktop it is open.

### 7.9 Finance hero and method bar

Dark hero (`--hero-bg`) with the big figure on the left and a side column of translucent tiles. Method share uses `.methodBar` (segmented, 16px, 3px gaps) plus `.methodLegend` swatches, colored from `--chart-1..3`.

### 7.10 Calendar (`MonthCalendar` in `founder-boards.tsx`)

Seven-column grid, 44px day buttons, 12px radius. States: **closed** (filled primary), **today** (2px inset ring), **pending** (2px dashed), **past/disabled** (muted text, no opacity). Legend below, month navigation with two icon buttons. Always show state with a shape or text, not color alone.

### 7.11 Forms and tables (`invoice.module.css`)

- Fields: label above, input min 44px, 12px radius, `--control` border, canvas background, 15px text. Placeholders are examples, never the label.
- Stepper: pill steps (44px high), current step filled primary, horizontally scrollable on mobile.
- Line groups: bordered fieldset, 18px radius. Summary and totals: canvas background, tabular numbers, bold grand total.
- Messages: `.error` (danger tokens) and `.ok` (safe tokens), inline, 14px bold.
- Tables: wrapped in a bordered rounded container, header on `--sunken`, last column right-aligned, numbers tabular. Up to 900px render rows as cards (invoice list).
- Checkboxes use the `.check` pattern (`invoice.module.css`): the label gets `.check`, and holds a real `<input type="checkbox">` plus an `aria-hidden="true"` `<span class="box">`. The input is stretched over the whole row (at least 44px) at `opacity: 0`, and `.box` draws the 22px control. The `.box` span is required next to the input wherever `.check` is used; without it the checkbox is invisible. Used for "Hapus logo" and the wizard "Perbarui info perusahaan".
- Native date and file inputs are accepted as-is, but style the file button (`::file-selector-button`).

### 7.12 Alerts and banners

Warning box (`.alertBox`, warn tokens) for non-blocking caveats; danger status banner for store-paused style states with a link to fix it. Alert text must carry its own color token (`--alert-fg` or `--warn-fg`) so it stays readable in dark.

### 7.13 Empty and done states

Muted one-liner ("Tidak ada pesanan di sini.") for empty lists; a green check line ("Semua beres hari ini") when a screen has nothing left to do. Never leave a blank panel.

### 7.14 Icons

Phosphor icons (`@phosphor-icons/react`), 13 to 18px inline, 22 to 24px in nav. Icons support text; they do not replace it. Every icon-only control needs an `aria-label`.

## 8. Interaction and accessibility baseline

- Tap targets at least 44 by 44px (including text links and `<summary>`). Exception: desktop invoice table row buttons (901px and up) are 36px high; the 44px rule applies to the card layout (900px and below).
- Every input has a label or `aria-label`. Every button or link has a name.
- Focus is visible; do not remove outlines.
- Confirm destructive or stock-affecting actions (`window.confirm` is the current pattern for packing and dispatch; delete uses an inline confirm).
- Optimistic wording: buttons say what they do ("Selesai Packing"), not "OK".
- Copy is Indonesian, short, in the founder's vocabulary (Pesanan, Stok, Keuangan, Kalender, Invoice, Pengaturan, Piutang, Omzet). Times are Asia/Jakarta.

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

- Timestamps in stock history use the raw id-ID `toLocaleString` format (long); a shorter format would read better.
- Native date and file pickers keep the browser's language and look.
- The invoice list status chip on mobile makes its row slightly taller than needed.
- Class and token names keep the historical `wine` prefix for the primary color; renaming would also touch the storefront.
- Keuangan on mobile looks sparse with Rp0 test data; judge it with real data.
- Pengaturan on desktop leaves an empty strip at the right of the form.
- The "4. Pratinjau" step pill in the invoice wizard is tight at 390px.
- Sidebar hover and active colors are literal `rgba` values; they should become tokens.
- The `--alert-*` and `--danger-*` token families overlap; pick one canonical family.
- Not viewed by the reviewer: dark theme of the invoice list, Pengaturan and Kalender, and wizard desktop steps 1, 2 and 4.
- Invoice edit page PDF content is not rendered or checked.

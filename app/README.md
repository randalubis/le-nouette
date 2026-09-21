# Le Nouette

Finished-state product preview for the Le Nouette customer storefront and Founder OS.

## Included

- Mobile-first Bahasa Indonesia storefront with an ID/EN switch; copy lives in paired TypeScript dictionaries in `src/lib/i18n.ts` (a missing key fails the build)
- Optional device-local "Ingat data saya" record (name and WhatsApp number only) in `src/lib/remembered.ts`
- Product selection, customer details, fulfillment, payment, and confirmation flow
- Founder dashboard with packing batch and action summary
- Mobile Kanban order board
- Inventory, reservations, thresholds, and ready-to-sell overview
- Receivables and payment overview with CSV export affordance
- Responsive light and dark appearance

Business rules live as pure, tested functions in `src/lib/domain/` (scheduling, orders, reservations, packing, payments, stock, availability). Until Supabase is connected, `src/lib/session-store.ts` keeps all data in the browser tab's `sessionStorage`: it survives reloads and storefront → Founder OS navigation, resets when the tab closes, and can be reset from the Founder OS header.

## Run locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Founder OS is available at [http://localhost:3000/founder](http://localhost:3000/founder).

## Verify

```bash
npm test
npm run lint
npm run build
```

## Environment

Copy `.env.example` to `.env.local` when the Supabase project is ready. Do not commit the populated file.

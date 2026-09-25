# Playwright review kit (used by the reviewer persona)

Needs the dev server running with founder credentials, e.g. from `app/`:
`ADMIN_EMAIL=audit@test.local ADMIN_PASSWORD=auditpass ADMIN_SESSION_SECRET=auditsecret npm run dev`

- `node .claude/playwright/audit.js <outDir>` — 390 mobile + 1440 desktop, light + dark, storefront/login/founder pages. Writes `<outDir>/result.json` (load/LCP/CLS, contrast failures, tap targets <44px, <12px text, overflow, console errors) and `<outDir>/shots/*.png`.
- `node .claude/playwright/flow.js <outDir>` — storefront add-to-cart -> details step (never submits an order). Screenshots `*-flow*.png`.
- Env overrides: `PLAYWRIGHT_PATH` (playwright module dir), `CHROME_PATH`.
- Read-only against the app: do not submit orders or press mutating founder buttons (dispatch, payment, stock, calendar). Contrast "hero text over image" and disabled buttons are known false positives.

import { expect, test } from "@playwright/test";
import { MARKER_DATE, assertLocalE2eDb, resetDb } from "./db";
import { ADMIN } from "./playwright.config";

test.beforeAll(resetDb);

test("test process points at the local e2e DB only", () => {
  expect(() => assertLocalE2eDb(process.env.DATABASE_URL)).not.toThrow();
  expect(() => assertLocalE2eDb("postgresql://u:p@db.xvbloiuwedrpcrjjusky.supabase.co:5432/postgres")).toThrow();
  expect(() => assertLocalE2eDb("postgres://localhost:5432/postgres")).toThrow();
});

test("the app server really reads the e2e DB (process env beat .env.local)", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Email").fill(ADMIN.email);
  await page.getByLabel("Kata sandi").fill(ADMIN.password);
  await page.getByRole("button", { name: "Masuk" }).click();
  await expect(page).toHaveURL(/\/founder/);
  const csv = await (await page.request.get("/founder/export/csv?dataset=availability")).text();
  expect(csv).toContain(MARKER_DATE);
});

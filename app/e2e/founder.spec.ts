import { expect, test } from "@playwright/test";
import { resetDb } from "./db";
import { ADMIN } from "./playwright.config";
import { placePickupOrder } from "./helpers";

test.describe.configure({ mode: "serial" });
let orderId = "";
test.beforeAll(async () => { await resetDb(); });

test("unauthenticated /founder redirects to /login", async ({ page }) => {
  await page.goto("/founder");
  await expect(page).toHaveURL(/\/login$/);
  expect((await page.request.get("/founder/export/csv?dataset=orders", { maxRedirects: 0 })).status()).toBe(307);
});

test("wrong password is rejected", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Email").fill(ADMIN.email);
  await page.getByLabel("Kata sandi").fill("nope");
  await page.getByRole("button", { name: "Masuk" }).click();
  await expect(page.getByText("Email atau kata sandi salah.")).toBeVisible();
  await expect(page).toHaveURL(/\/login/);
});

test("login, board, WhatsApp link, mark paid, export, logout", async ({ page }) => {
  orderId = await placePickupOrder(page);

  await page.goto("/login");
  await page.getByLabel("Email").fill(ADMIN.email);
  await page.getByLabel("Kata sandi").fill(ADMIN.password);
  await page.getByRole("button", { name: "Masuk" }).click();
  await expect(page).toHaveURL(/\/founder/);

  await page.goto("/founder/orders");
  const card = page.locator("article").filter({ hasText: orderId });
  await expect(card).toBeVisible();
  await expect(card.getByText("Budi Santoso")).toBeVisible();

  const wa = (await card.getByRole("link", { name: "Kirim WhatsApp" }).getAttribute("href"))!;
  expect(wa.startsWith("https://wa.me/6281234567890?text=")).toBe(true);
  const msg = decodeURIComponent(wa.split("text=")[1]);
  expect(msg).toContain("Halo Budi, ini Le Nouette.");
  expect(msg).toContain(`Pesanan *${orderId}*`);
  expect(msg).toContain("• 1 × Milieu");
  expect(msg).toContain("Pengambilan di Kantor Mandiri.");

  await card.getByRole("button", { name: "Tandai Lunas" }).click();
  await card.getByRole("button", { name: "Transfer" }).click();
  await expect(card.getByText(/Lunas · Transfer/)).toBeVisible();

  // Keuangan: paid but not completed is held, not income
  const metric = (label: string) => page.getByText(label, { exact: true }).locator("xpath=..");
  await page.goto("/founder/finance");
  await expect(metric("Omzet (pesanan selesai)")).toContainText("Rp0");
  const held = metric("Dibayar, belum selesai");
  await expect(held).toBeVisible();
  await expect(held).not.toContainText("Rp0");
  const heldText = (await held.innerText()).match(/Rp[\d.]+/)![0];

  // pack batch (dashboard) then complete -> revenue equals the paid total
  page.once("dialog", (d) => d.accept());
  await page.goto("/founder");
  await page.getByRole("button", { name: /Selesaikan batch/ }).click();
  await expect(page.getByText("Semua batch selesai.")).toBeVisible();
  await page.goto("/founder/orders?tab=READY_FOR_HANDOVER");
  const ready = page.locator("article").filter({ hasText: orderId });
  await ready.getByRole("button", { name: "Tandai Selesai" }).click();
  await expect(ready).toHaveCount(0);
  await page.goto("/founder/finance");
  await expect(metric("Omzet (pesanan selesai)")).toContainText(heldText);
  await expect(metric("Sudah diterima")).toContainText(heldText);

  // export with a range: filtered rows + ranged filename
  const today = new Date(Date.now() + 7 * 3_600_000).toISOString().slice(0, 10);
  const inRange = await page.request.get(`/founder/export/csv?dataset=orders&from=${today}&to=${today}`);
  expect(inRange.status()).toBe(200);
  expect(inRange.headers()["content-disposition"]).toContain(`le-nouette-orders_${today}_sd_${today}.csv`);
  expect(await inRange.text()).toContain(orderId);
  const outRange = await page.request.get("/founder/export/csv?dataset=orders&from=2000-01-01&to=2000-01-02");
  expect(outRange.headers()["content-disposition"]).toContain("le-nouette-orders_2000-01-01_sd_2000-01-02.csv");
  expect(await outRange.text()).not.toContain(orderId);

  // logout
  await page.goto("/founder");
  const menu = page.getByLabel("Menu akun dan unduh data");
  if (await menu.isVisible()) await menu.click(); // mobile: logout lives in the avatar menu
  await page.getByRole("button", { name: "Keluar" }).filter({ visible: true }).click();
  await expect(page).toHaveURL(/\/login/);
  await page.goto("/founder");
  await expect(page).toHaveURL(/\/login$/);
});

test("per-order Selesai Packing then unpaid Tandai Selesai becomes receivable", async ({ page }) => {
  const id = await placePickupOrder(page);
  await page.goto("/login");
  await page.getByLabel("Email").fill(ADMIN.email);
  await page.getByLabel("Kata sandi").fill(ADMIN.password);
  await page.getByRole("button", { name: "Masuk" }).click();
  await expect(page).toHaveURL(/\/founder/);

  page.on("dialog", (d) => d.accept());
  await page.goto("/founder/orders");
  await page.locator("article").filter({ hasText: id }).getByRole("button", { name: "Selesai Packing" }).click();
  await expect(page.locator("article").filter({ hasText: id })).toHaveCount(0);

  await page.goto("/founder/orders?tab=READY_FOR_HANDOVER");
  const ready = page.locator("article").filter({ hasText: id });
  await ready.getByRole("button", { name: "Tandai Selesai" }).click();
  await expect(ready).toHaveCount(0);

  await page.goto("/founder/orders?tab=COMPLETED");
  const done = page.locator("article").filter({ hasText: id });
  await expect(done.getByText("Belum dibayar")).toBeVisible();
  await expect(done.getByRole("button", { name: "Tandai Lunas" })).toBeVisible();
});

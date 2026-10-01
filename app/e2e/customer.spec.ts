import { expect, test } from "@playwright/test";
import { resetDb } from "./db";
import { NAME, WA, placePickupOrder } from "./helpers";

test.describe.configure({ mode: "serial" });
test.beforeAll(resetDb);

test("pickup order end to end, with tracking, hint, WhatsApp and referral once", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText("Tersedia untuk dipesan")).toBeVisible();
  const id = await placePickupOrder(page);
  expect(id).toMatch(/^LN-\d{4}$/);
  await expect(page.getByRole("heading", { name: "Terima kasih, Budi." })).toBeVisible();
  await expect(page.getByText(/tombol Lacak/)).toBeVisible();

  // WhatsApp chat button carries the order id
  const wa = page.getByRole("link", { name: "Chat WhatsApp" });
  const href = (await wa.getAttribute("href"))!;
  expect(href.startsWith("https://wa.me/6281234567890?text=")).toBe(true);
  expect(decodeURIComponent(href.split("text=")[1])).toContain(id);

  // referral dialog appears on the first order; choose Skip
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await dialog.getByRole("button", { name: "Lewati" }).click();
  await expect(dialog).toBeHidden();

  // tracking via Lacak shows the placed order
  await page.getByRole("button", { name: "Lacak pesanan" }).click();
  await expect(page.getByRole("heading", { name: id })).toBeVisible();
  await expect(page.getByText("Sedang disiapkan")).toBeVisible();
  await expect(page.getByText("Belum Dibayar")).toBeVisible();

  // second order after reload: referral dialog does not return
  await page.reload();
  const id2 = await placePickupOrder(page, "Siti Aminah");
  expect(id2).not.toBe(id);
  await expect(page.getByRole("heading", { name: "Terima kasih, Siti." })).toBeVisible();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.getByRole("dialog", { includeHidden: true })).toBeHidden();
});

test("delivery without address shows inline error and does not submit", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Tambah Milieu" }).click();
  await page.getByRole("button", { name: /Lanjutkan/ }).click();
  await page.getByText("Kirim ke alamat saya").click();
  await page.getByLabel("Nama lengkap").fill(NAME);
  await page.getByLabel("Nomor WhatsApp").fill(WA);
  await page.getByRole("button", { name: /Buat Pesanan/ }).click();
  await expect(page.getByText("Isi alamat pengantaran dulu ya.")).toBeVisible();
  await expect(page.getByRole("heading", { name: /Terima kasih/ })).toHaveCount(0);
  await expect(page.getByLabel("Alamat pengiriman")).toBeFocused();
});

test("name and WhatsApp validation errors", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Tambah Milieu" }).click();
  await page.getByRole("button", { name: /Lanjutkan/ }).click();
  await page.getByLabel("Nomor WhatsApp").fill("12345");
  await page.getByRole("button", { name: /Buat Pesanan/ }).click();
  await expect(page.getByText("Isi nama kamu dulu ya.")).toBeVisible();
  await expect(page.getByText(/Nomor WhatsApp belum valid/)).toBeVisible();
  await expect(page.getByRole("heading", { name: /Terima kasih/ })).toHaveCount(0);
});

test("sticky header stays at top after scrolling", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Pilih yang ingin kamu pesan" })).toBeVisible();
  await expect.poll(async () => { await page.evaluate(() => window.scrollTo(0, 600)); return page.evaluate(() => window.scrollY); }).toBeGreaterThan(100);
  const top = await page.locator("header").first().evaluate((el) => el.getBoundingClientRect().top);
  expect(Math.abs(top)).toBeLessThanOrEqual(1);
});

test("step change scrolls to top", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Tambah Milieu" }).click();
  await page.evaluate(() => window.scrollTo(0, 400));
  await page.getByRole("button", { name: /Lanjutkan/ }).click();
  await expect(page.getByLabel("Nama lengkap")).toBeVisible();
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);
});

test("offline during submit never shows success", async ({ page, context }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Tambah Milieu" }).click();
  await page.getByRole("button", { name: /Lanjutkan/ }).click();
  await page.getByLabel("Nama lengkap").fill(NAME);
  await page.getByLabel("Nomor WhatsApp").fill(WA);
  await context.setOffline(true);
  await page.getByRole("button", { name: /Buat Pesanan/ }).click();
  await expect(page.getByText(/Koneksi bermasalah/)).toBeVisible();
  await expect(page.getByRole("heading", { name: /Terima kasih/ })).toHaveCount(0);
  await expect(page.getByText(/^LN-\d+$/)).toHaveCount(0);
  await context.setOffline(false);
});

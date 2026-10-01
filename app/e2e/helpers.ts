import { expect, type Page } from "@playwright/test";

export const NAME = "Budi Santoso";
export const WA = "0812 3456 7890";

/** Shop -> add one Milieu -> details -> fill -> place order. Returns the order id (LN-xxxx). */
export async function placePickupOrder(page: Page, name = NAME) {
  await page.goto("/");
  await page.getByRole("button", { name: "Tambah Milieu" }).click();
  await page.getByRole("button", { name: /Lanjutkan/ }).click();
  await page.getByLabel("Nama lengkap").fill(name);
  await page.getByLabel("Nomor WhatsApp").fill(WA);
  await page.getByRole("button", { name: /Buat Pesanan/ }).click();
  const id = page.locator("strong").filter({ hasText: /^LN-\d+$/ });
  await expect(id).toBeVisible();
  return (await id.textContent())!;
}

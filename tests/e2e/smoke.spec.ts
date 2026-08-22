import { expect, test } from "@playwright/test";

test("serves the exported museum landing page", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { name: "Not everything unfinished is a failure." })).toBeVisible();
  await expect(page.getByRole("link", { name: "Enter the Museum" })).toHaveAttribute("href", "/museum");
});

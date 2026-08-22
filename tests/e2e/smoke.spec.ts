import { expect, test } from "@playwright/test";

test("serves the exported museum landing page", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { name: "Almost Museum" })).toBeVisible();
});

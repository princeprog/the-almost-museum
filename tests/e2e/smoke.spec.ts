import { expect, test } from "@playwright/test";

test("serves the exported museum landing page", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { name: "Not everything unfinished is a failure." })).toBeVisible();
  await expect(page.getByRole("link", { name: "Enter the Museum" })).toHaveAttribute("href", "/museum");
});

test("keeps the landing experience contained and stacked on a narrow viewport", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto("/");

  const frame = page.locator(".landing-page__frame");
  const enterMuseum = page.getByRole("link", { name: "Enter the Museum" });
  const note = page.locator(".landing-page__note");

  await expect(frame).toBeVisible();
  await expect(enterMuseum).toBeVisible();
  await expect(note).toBeVisible();

  const [frameBox, actionBox, noteBox, pageWidth] = await Promise.all([
    frame.boundingBox(),
    enterMuseum.boundingBox(),
    note.boundingBox(),
    page.evaluate(() => ({ scrollWidth: document.documentElement.scrollWidth, viewportWidth: window.innerWidth })),
  ]);

  expect(frameBox).not.toBeNull();
  expect(actionBox).not.toBeNull();
  expect(noteBox).not.toBeNull();
  expect(pageWidth.scrollWidth).toBeLessThanOrEqual(pageWidth.viewportWidth);
  expect(frameBox!.x).toBeGreaterThanOrEqual(0);
  expect(frameBox!.x + frameBox!.width).toBeLessThanOrEqual(pageWidth.viewportWidth);
  expect(actionBox!.x + actionBox!.width).toBeLessThanOrEqual(pageWidth.viewportWidth);
  expect(noteBox!.y).toBeGreaterThan(frameBox!.y + frameBox!.height);
});

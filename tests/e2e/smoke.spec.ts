import { expect, test } from "@playwright/test";

async function openHydratedCapture(page: import("@playwright/test").Page): Promise<void> {
  await page.goto("/exhibit/new");
  await expect(page.locator("main.exhibit-capture")).toHaveAttribute("aria-busy", "false", { timeout: 15_000 });
}

test("serves the exported museum landing page", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { name: "Give unfinished work a place to live." })).toBeVisible();
  await expect(page.getByRole("link", { name: "Enter the Museum" })).toHaveAttribute("href", "/museum");
});

test("rejects malformed paths without interrupting later clean routes", async ({ page, request }) => {
  const malformedResponse = await request.get("/%ZZ", { failOnStatusCode: false });

  expect(malformedResponse.status()).toBe(400);
  await page.goto("/exhibit/new");
  await expect(page.getByRole("textbox", { name: "Working title" })).toBeVisible();
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
  await expect(page.getByRole("link", { name: "New exhibit" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Settings" })).toBeVisible();

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

test("captures an Exhibit through the exported clean routes", async ({ page }) => {
  await openHydratedCapture(page);

  await page.getByRole("textbox", { name: "Working title" }).fill("Harbor wayfinding study");
  await page.getByRole("combobox", { name: "Exhibit type" }).selectOption("experiment");
  await page.getByRole("button", { name: "Continue to evidence" }).click();
  await page.getByRole("button", { name: "Continue to story" }).click();
  await page.getByRole("textbox", { name: "Museum label" }).fill("A quieter route through the harbor");
  await page.getByRole("button", { name: "Save Exhibit" }).click();

  await expect(page).toHaveURL(/\/exhibit\?id=/);
  await expect(page.getByRole("heading", { name: "Exhibit" })).toBeVisible();
});

test("moves focus to the surviving Exhibit heading after a closure replaces its trigger", async ({ page }) => {
  await openHydratedCapture(page);

  await page.getByRole("textbox", { name: "Working title" }).fill("Focus restoration study");
  await page.getByRole("combobox", { name: "Exhibit type" }).selectOption("experiment");
  await page.getByRole("button", { name: "Continue to evidence" }).click();
  await page.getByRole("button", { name: "Continue to story" }).click();
  await page.getByRole("textbox", { name: "Museum label" }).fill("A safe return after closure");
  await page.getByRole("button", { name: "Save Exhibit" }).click();

  await page.getByRole("button", { name: "Move to Archive" }).click();
  await page.getByRole("button", { name: "Archive Exhibit" }).click();

  await expect(page.getByRole("heading", { name: "Focus restoration study" })).toBeFocused();
});

test("keeps the capture form inside a narrow viewport", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await openHydratedCapture(page);

  await expect(page.getByRole("textbox", { name: "Working title" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Continue to evidence" })).toBeVisible();
  await expect(page.locator(".exhibit-capture__step-panel")).toBeVisible();

  const pageWidth = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    viewportWidth: window.innerWidth,
  }));
  expect(pageWidth.scrollWidth).toBeLessThanOrEqual(pageWidth.viewportWidth);
});

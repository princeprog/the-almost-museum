import { expect, test } from "@playwright/test";

test("serves the exported museum landing page", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { name: "Not everything unfinished is a failure." })).toBeVisible();
  await expect(page.getByRole("link", { name: "Enter the Museum" })).toHaveAttribute("href", "/museum");
});

test("ships a manifest, generated icons, offline fallback, and a production service worker", async ({ context, page, request }) => {
  const manifestResponse = await request.get("/manifest.webmanifest");
  expect(manifestResponse.ok()).toBe(true);
  expect(manifestResponse.headers()["content-type"]).toContain("application/manifest+json");
  await expect(manifestResponse.json()).resolves.toMatchObject({
    display: "standalone",
    start_url: "/",
    icons: expect.arrayContaining([
      expect.objectContaining({ src: "/icons/almost-museum-192.png", sizes: "192x192" }),
      expect.objectContaining({ src: "/icons/almost-museum-512.png", sizes: "512x512" }),
    ]),
  });
  const iconResponse = await request.get("/icons/almost-museum-192.png");
  expect(iconResponse.ok()).toBe(true);
  expect(iconResponse.headers()["content-type"]).toContain("image/png");

  await page.goto("/offline");
  await expect(page.getByRole("heading", { name: "You can still visit the Museum." })).toBeVisible();
  await expect.poll(() => page.evaluate(async () => (await navigator.serviceWorker.getRegistration("/"))?.active?.scriptURL.endsWith("/sw.js") ?? false)).toBe(true);

  await context.setOffline(true);
  await page.goto("/a-new-route-while-offline");
  await expect(page.getByRole("heading", { name: "You can still visit the Museum." })).toBeVisible();
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
  await page.goto("/exhibit/new");

  await page.getByRole("textbox", { name: "Working title" }).fill("Harbor wayfinding study");
  await page.getByRole("combobox", { name: "Exhibit type" }).selectOption("experiment");
  await page.getByRole("button", { name: "Continue to evidence" }).click();
  await page.getByRole("button", { name: "Continue to story" }).click();
  await page.getByRole("textbox", { name: "Museum label" }).fill("A quieter route through the harbor");
  await page.getByRole("button", { name: "Save Exhibit" }).click();

  await expect(page).toHaveURL(/\/exhibit\?id=/);
  await expect(page.getByRole("heading", { name: "Exhibit" })).toBeVisible();
});

test("keeps the capture form inside a narrow viewport", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto("/exhibit/new");

  await expect(page.getByRole("textbox", { name: "Working title" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Continue to evidence" })).toBeVisible();
  await expect(page.locator(".exhibit-capture__step-panel")).toBeVisible();

  const pageWidth = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    viewportWidth: window.innerWidth,
  }));
  expect(pageWidth.scrollWidth).toBeLessThanOrEqual(pageWidth.viewportWidth);
});

import { expect, test } from "@playwright/test";

test("preserves online query-addressed Exhibit routes after service-worker activation", async ({ page }) => {
  await page.goto("/exhibit/new");
  await expect.poll(() => page.evaluate(async () => (await navigator.serviceWorker.getRegistration("/"))?.active?.scriptURL.endsWith("/sw.js") ?? false)).toBe(true);
  await page.reload();
  await expect.poll(() => page.evaluate(() => navigator.serviceWorker.controller?.scriptURL.endsWith("/sw.js") ?? false)).toBe(true);
  const main = page.getByRole("main");
  await expect(main).toHaveAttribute("aria-busy", "false", { timeout: 15_000 });
  await expect(main).toHaveCSS("transform", "none");

  await page.getByRole("textbox", { name: "Working title" }).fill("Worker query route study");
  const typeSelect = page.getByRole("combobox", { name: "Exhibit type" });
  await typeSelect.click();
  await page.getByRole("option", { name: "Experiment" }).focus();
  await page.keyboard.press("Enter");
  await expect(typeSelect).toContainText("Experiment");
  await page.getByRole("button", { name: "Continue to evidence" }).click();
  await page.getByRole("button", { name: "Continue to story" }).click();
  await page.getByRole("textbox", { name: "Museum label" }).fill("A query-addressed record behind the active worker");
  await page.getByRole("button", { name: "Save Exhibit" }).click();

  await expect(page).toHaveURL(/\/exhibit\?id=/);
  await expect(page.getByRole("heading", { name: "Worker query route study" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "You can still visit the Museum." })).toHaveCount(0);
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
  await page.reload();
  await expect.poll(() => page.evaluate(() => navigator.serviceWorker.controller?.scriptURL.endsWith("/sw.js") ?? false)).toBe(true);

  await context.setOffline(true);
  await page.goto("/a-new-route-while-offline");
  await expect(page.getByRole("heading", { name: "You can still visit the Museum." })).toBeVisible();
});

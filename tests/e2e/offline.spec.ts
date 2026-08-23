import { expect, test } from "@playwright/test";

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

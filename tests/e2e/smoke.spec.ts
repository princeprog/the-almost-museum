import { expect, test } from "@playwright/test";

async function openHydratedCapture(page: import("@playwright/test").Page): Promise<void> {
  await page.goto("/exhibit/new");
  await expect(page.locator("main.exhibit-capture")).toHaveAttribute("aria-busy", "false", { timeout: 15_000 });
}

test("serves the exported museum landing page", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { name: "Give unfinished work a place to live." })).toBeVisible();
  await expect(page.getByRole("link", { name: "Enter the Museum" }).first()).toHaveAttribute("href", "/museum");
});

test("rejects malformed paths without interrupting later clean routes", async ({ page, request }) => {
  const malformedResponse = await request.get("/%ZZ", { failOnStatusCode: false });

  expect(malformedResponse.status()).toBe(400);
  await page.goto("/exhibit/new");
  await expect(page.getByRole("textbox", { name: "Working title" })).toBeVisible();
});

const landingViewports = [
  { height: 812, name: "phone", tracksScroll: true, width: 375 },
  { height: 1024, name: "tablet", tracksScroll: true, width: 768 },
  { height: 900, name: "desktop", tracksScroll: false, width: 1440 },
  { height: 1080, name: "ultrawide", tracksScroll: false, width: 1920 },
] as const;

for (const viewport of landingViewports) {
  test(`keeps all four landing chapters responsive on ${viewport.name}`, async ({ page }) => {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await page.goto("/");

    const sections = page.locator(".landing-screen");
    const enterMuseum = page.getByRole("link", { name: "Enter the Museum" }).first();
    const viewExhibits = page.getByRole("link", { name: "View all exhibits" });

    await expect(sections).toHaveCount(4);
    await expect(page.getByRole("navigation", { name: "Primary navigation" })).toBeVisible();
    await expect(page.getByRole("link", { name: "New exhibit" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Settings" })).toBeVisible();
    await expect(enterMuseum).toBeVisible();
    await viewExhibits.scrollIntoViewIfNeeded();
    await expect(viewExhibits).toBeVisible();

    const landingImages = page.locator("main.landing-page img");
    for (let index = 0; index < await landingImages.count(); index += 1) {
      await landingImages.nth(index).scrollIntoViewIfNeeded();
      await expect(landingImages.nth(index)).toHaveJSProperty("complete", true);
    }

    const layout = await page.evaluate(() => ({
      imageWidths: Array.from(document.querySelectorAll("main.landing-page img")).map((image) => ({
        clientWidth: image.getBoundingClientRect().width,
        naturalWidth: (image as HTMLImageElement).naturalWidth,
      })),
      sectionHeights: Array.from(document.querySelectorAll(".landing-screen")).map(
        (section) => section.getBoundingClientRect().height,
      ),
      scrollWidth: document.documentElement.scrollWidth,
      viewportWidth: window.innerWidth,
    }));

    expect(layout.scrollWidth).toBeLessThanOrEqual(layout.viewportWidth);
    expect(layout.imageWidths.every((image) => image.clientWidth > 0 && image.naturalWidth > 0)).toBe(true);
    for (const height of layout.sectionHeights) {
      expect(height).toBeGreaterThanOrEqual(viewport.height - 1);
    }

    for (const testId of ["exhibit-track", "workflow-track", "value-track"]) {
      const track = page.getByTestId(testId);
      const dimensions = await track.evaluate((element) => ({
        clientWidth: element.clientWidth,
        scrollWidth: element.scrollWidth,
      }));

      if (viewport.tracksScroll) {
        expect(dimensions.scrollWidth).toBeGreaterThan(dimensions.clientWidth);
      } else {
        expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.clientWidth + 1);
      }
    }
  });
}

test("keeps landing navigation, skip focus, and CTA destinations functional", async ({ page }) => {
  await page.goto("/");

  const ctas = page.getByRole("link", { name: /Enter the Museum|View all exhibits|View more exhibits/ });
  const hrefs = await ctas.evaluateAll((links) => links.map((link) => link.getAttribute("href")));
  expect(hrefs).not.toHaveLength(0);
  expect(hrefs.every((href) => href === "/museum")).toBe(true);

  const skipLink = page.getByRole("link", { name: "Skip to content" });
  await skipLink.focus();
  await expect(skipLink).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.locator("#app-root")).toBeFocused();
});

test("disables landing scroll snapping for reduced motion", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");

  const motion = await page.evaluate(() => ({
    scrollBehavior: getComputedStyle(document.documentElement).scrollBehavior,
    scrollSnapType: getComputedStyle(document.documentElement).scrollSnapType,
  }));

  expect(motion.scrollBehavior).toBe("auto");
  expect(motion.scrollSnapType).toBe("none");
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

import { expect, test } from "@playwright/test";

async function openHydratedCapture(page: import("@playwright/test").Page): Promise<void> {
  await page.goto("/exhibit/new");
  const main = page.getByRole("main");
  await expect(main).toHaveAttribute("aria-busy", "false", { timeout: 15_000 });
  await expect(main).toHaveCSS("transform", "none");
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

async function chooseCaptureType(page: import("@playwright/test").Page, label: string): Promise<void> {
  const trigger = page.getByRole("combobox", { name: "Exhibit type" });
  await trigger.click();
  await page.getByRole("option", { name: label }).focus();
  await page.keyboard.press("Enter");
  await expect(trigger).toContainText(label);
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

for (const viewport of [
  { height: 812, name: "phone", width: 375 },
  { height: 1024, name: "tablet", width: 768 },
  { height: 900, name: "desktop", width: 1440 },
  { height: 1080, name: "ultrawide", width: 1920 },
] as const) {
  test(`keeps the shadcn Museum collection responsive on ${viewport.name}`, async ({ page }) => {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await page.goto("/museum");

    const emptyCollection = page.getByRole("region", { name: "Your collection is empty." });
    await expect(emptyCollection).toHaveAttribute("data-slot", "empty");
    await expect(page.getByRole("link", { name: "Create Exhibit" })).toBeVisible();

    await page.getByRole("button", { name: "Install Harbor Queue demo" }).click();

    const filters = page.getByRole("region", { name: "Filter collection" });
    const exhibits = page.getByRole("list", { name: "Exhibits" });
    await expect(filters).toHaveAttribute("data-slot", "card");
    await expect(exhibits).toHaveAttribute("data-view", "grid");
    await expect(exhibits.getByRole("article")).toHaveCount(1);

    const layout = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      viewportWidth: window.innerWidth,
    }));
    expect(layout.scrollWidth).toBeLessThanOrEqual(layout.viewportWidth);
  });
}

for (const viewport of landingViewports) {
  test(`keeps application routes contained on ${viewport.name}`, async ({ page }) => {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });

    for (const route of ["/museum", "/exhibit/new", "/exhibit", "/settings", "/offline"]) {
      await page.goto(route);
      const main = page.getByRole("main");
      await expect(main).toBeVisible();
      if (route === "/exhibit/new") await expect(main).toHaveAttribute("aria-busy", "false", { timeout: 15_000 });

      const layout = await page.evaluate(() => ({
        controls: Array.from(document.querySelectorAll('[data-slot="button"], [data-slot="input"], [data-slot="select-trigger"], a[class*="group/button"]'))
          .filter((element) => {
            const style = getComputedStyle(element);
            return style.display !== "none" && style.visibility !== "hidden";
          })
          .map((element) => ({
            height: element.getBoundingClientRect().height,
            label: element.getAttribute("aria-label") ?? element.textContent?.trim() ?? element.getAttribute("type") ?? element.tagName,
          })),
        scrollWidth: document.documentElement.scrollWidth,
        viewportWidth: window.innerWidth,
      }));

      expect(layout.scrollWidth).toBeLessThanOrEqual(layout.viewportWidth);
      if (viewport.width === 375) {
        const undersizedControls = layout.controls.filter(({ height }) => height > 0 && height < 44);
        expect(undersizedControls, JSON.stringify(undersizedControls)).toEqual([]);
      }
    }
  });
}

test("keeps the shared navigation pinned while the page scrolls", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");

  const header = page.locator(".site-header");
  await expect(header).toBeVisible();

  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight / 2));

  const headerBox = await header.boundingBox();
  expect(headerBox).not.toBeNull();
  expect(headerBox!.y).toBeGreaterThanOrEqual(0);
  expect(headerBox!.y).toBeLessThanOrEqual(1);
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
  await chooseCaptureType(page, "Experiment");
  await page.getByRole("button", { name: "Continue to evidence" }).click();
  await page.getByRole("button", { name: "Continue to story" }).click();
  await page.getByRole("textbox", { name: "Museum label" }).fill("A quieter route through the harbor");
  await page.getByRole("button", { name: "Save Exhibit" }).click();

  await expect(page).toHaveURL(/\/exhibit\?id=/);
  await expect(page.getByRole("heading", { name: "Harbor wayfinding study" })).toBeVisible();
});

test("moves focus to the surviving Exhibit heading after a closure replaces its trigger", async ({ page }) => {
  await openHydratedCapture(page);

  await page.getByRole("textbox", { name: "Working title" }).fill("Focus restoration study");
  await chooseCaptureType(page, "Experiment");
  await page.getByRole("button", { name: "Continue to evidence" }).click();
  await page.getByRole("button", { name: "Continue to story" }).click();
  await page.getByRole("textbox", { name: "Museum label" }).fill("A safe return after closure");
  await page.getByRole("button", { name: "Save Exhibit" }).click();

  await page.getByRole("button", { name: "Move to Archive" }).click();
  await page.getByRole("button", { name: "Archive Exhibit" }).click();

  await expect(page.getByRole("heading", { name: "Focus restoration study" })).toBeFocused();
});

for (const viewport of [
  { controlHeight: 44, height: 812, name: "phone", width: 375 },
  { controlHeight: 40, height: 900, name: "desktop", width: 1440 },
] as const) {
  test(`keeps the capture form responsive on ${viewport.name}`, async ({ page }) => {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await openHydratedCapture(page);

    await expect(page.getByRole("textbox", { name: "Working title" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Continue to evidence" })).toBeVisible();
    await expect(page.locator('[data-slot="card"] form')).toBeVisible();

    const pageLayout = await page.evaluate(() => {
      const headingStyles = getComputedStyle(document.querySelector("h1")!);
      return {
        bodyFont: getComputedStyle(document.body).fontFamily,
        controlFonts: Array.from(document.querySelectorAll('[data-slot="input"], [data-slot="select-trigger"]')).map(
          (control) => getComputedStyle(control).fontFamily,
        ),
        controlHeights: Array.from(document.querySelectorAll('[data-slot="input"], [data-slot="select-trigger"]')).map(
          (control) => control.getBoundingClientRect().height,
        ),
        headingFontSize: Number.parseFloat(headingStyles.fontSize),
        headingMarginBottom: Number.parseFloat(headingStyles.marginBottom),
        labelFonts: Array.from(document.querySelectorAll('[data-slot="field-label"]')).map(
          (label) => getComputedStyle(label).fontFamily,
        ),
        nativeSelectCount: document.querySelectorAll('[data-slot="native-select"]').length,
        selectTriggerCount: document.querySelectorAll('[data-slot="select-trigger"]').length,
        scrollWidth: document.documentElement.scrollWidth,
        viewportWidth: window.innerWidth,
      };
    });
    expect(pageLayout.scrollWidth).toBeLessThanOrEqual(pageLayout.viewportWidth);
    expect(pageLayout.nativeSelectCount).toBe(0);
    expect(pageLayout.selectTriggerCount).toBe(2);
    expect(pageLayout.controlHeights.every((height) => height === viewport.controlHeight)).toBe(true);
    expect(pageLayout.controlFonts.every((font) => font === pageLayout.bodyFont)).toBe(true);
    expect(pageLayout.labelFonts.every((font) => font === pageLayout.bodyFont)).toBe(true);

    if (viewport.name === "desktop") {
      expect(pageLayout.headingFontSize).toBeLessThanOrEqual(40);
      expect(pageLayout.headingMarginBottom).toBe(0);
    } else {
      await page.getByRole("button", { name: "Cancel capture" }).click();
      const keepBox = await page.getByRole("button", { name: "Keep capturing" }).boundingBox();
      const leaveBox = await page.getByRole("button", { name: "Leave without saving" }).boundingBox();
      expect(keepBox).not.toBeNull();
      expect(leaveBox).not.toBeNull();
      expect(leaveBox!.y).toBeLessThan(keepBox!.y);
    }
  });
}

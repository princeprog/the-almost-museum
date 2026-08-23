import { expect, test, type Page } from "@playwright/test";

// Playwright provisions a new browser context and IndexedDB namespace per test.
// An explicit empty storage state also keeps local UI preferences out of parallel runs.
test.use({ storageState: { cookies: [], origins: [] } });

type ExhibitInput = {
  label?: string;
  tags?: string;
  title: string;
  type?: "project" | "experiment" | "idea";
  withArtifacts?: boolean;
};

async function openHydratedCapture(page: Page): Promise<void> {
  await page.goto("/exhibit/new");
  await expect(page.locator("main.exhibit-capture")).toHaveAttribute("aria-busy", "false", { timeout: 15_000 });
}

async function captureExhibit(page: Page, {
  label = "A small record of work in progress",
  tags = "Harbor, Research",
  title,
  type = "project",
  withArtifacts = false,
}: ExhibitInput): Promise<string> {
  await openHydratedCapture(page);
  await page.getByRole("textbox", { name: "Working title" }).fill(title);
  await page.getByRole("combobox", { name: "Exhibit type" }).selectOption(type);
  await page.getByRole("textbox", { name: "Tags" }).fill(tags);
  await page.getByRole("button", { name: "Continue to evidence" }).click();

  if (withArtifacts) {
    await page.getByRole("textbox", { name: "Link label" }).fill("Reference sketch");
    await page.getByRole("textbox", { name: "Link address" }).fill("https://example.test/sketch");
    await page.getByRole("button", { name: "Add link" }).click();
    await expect(page.getByRole("list", { name: "Evidence waiting to be saved" })).toContainText("Reference sketch");
    await page.getByRole("textbox", { name: "Note label" }).fill("Curator note");
    await page.getByRole("textbox", { name: "Note", exact: true }).fill("Keep the small decision visible.");
    await page.getByRole("button", { name: "Add note" }).click();
    await expect(page.getByRole("list", { name: "Evidence waiting to be saved" })).toContainText("Curator note");
  }

  await page.getByRole("button", { name: "Continue to story" }).click();
  await page.getByRole("textbox", { name: "Museum label" }).fill(label);
  await page.getByRole("button", { name: "Save Exhibit" }).click();
  await expect(page.getByRole("heading", { name: title })).toBeVisible({ timeout: 15_000 });

  const id = new URL(page.url()).searchParams.get("id");
  expect(id).not.toBeNull();
  return id!;
}

async function confirmClosure(
  page: Page,
  trigger: "Move to Archive" | "Complete" | "Release" | "Revive",
  title: string,
  confirm: string,
): Promise<void> {
  await page.getByRole("button", { name: trigger, exact: true }).click();
  const dialog = page.getByRole("dialog", { name: title });
  await expect(dialog).toBeVisible();
  if (trigger === "Release") {
    await dialog.getByRole("checkbox", { name: "I understand this Exhibit will be released from the active collection." }).check();
  }
  await dialog.getByRole("button", { name: confirm, exact: true }).click();
}

test("onboards an empty museum and installs the Harbor Queue demo only when requested", async ({ page }) => {
  await page.goto("/museum");
  await expect(page.getByRole("heading", { name: "Your collection is empty." })).toBeVisible();
  await expect(page.getByRole("link", { name: "Create Exhibit" })).toHaveAttribute("href", "/exhibit/new");

  await page.getByRole("button", { name: "Install Harbor Queue demo" }).click();
  await expect(page.getByRole("heading", { name: "Lobby" })).toBeVisible();
  await expect(page.getByRole("link", { name: "The Harbor Queue Redesign" })).toBeVisible();

  await page.reload();
  await expect(page.getByRole("link", { name: "The Harbor Queue Redesign" })).toBeVisible();
});

test("captures, edits, and maintains Exhibit artifacts after reopening the collection", async ({ page }) => {
  const id = await captureExhibit(page, {
    title: "Harbor wayfinding study",
    label: "A quieter route through the harbor",
    tags: "Harbor, Wayfinding",
    type: "experiment",
    withArtifacts: true,
  });

  await expect(page.getByRole("heading", { name: "Harbor wayfinding study" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Reference sketch" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Curator note" })).toBeVisible();

  await page.getByRole("button", { name: "Edit Exhibit" }).click();
  await page.getByRole("textbox", { name: "Working title" }).fill("Harbor wayfinding study, revised");
  await page.getByRole("textbox", { name: "Tags" }).fill("Harbor, Revised");
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page.getByText("Exhibit details saved.", { exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Harbor wayfinding study, revised" })).toBeVisible();

  await page.getByRole("button", { name: "Remove Curator note" }).click();
  await expect(page.getByText("Attachment removed from this Exhibit.", { exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Curator note" })).toHaveCount(0);

  await page.reload();
  await expect(page.getByRole("heading", { name: "Harbor wayfinding study, revised" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Reference sketch" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Curator note" })).toHaveCount(0);
  await expect(page.getByRole("list", { name: "Exhibit tags" })).toContainText("Revised");
  await expect(page.getByRole("list", { name: "Exhibit tags" })).not.toContainText("Wayfinding");
  await page.goto("/museum");
  await expect(page.getByRole("link", { name: "Harbor wayfinding study, revised" })).toHaveAttribute("href", `/exhibit?id=${id}`);
});

test("persists a local file artifact through a Chromium browser reopen", async ({ browserName, page }) => {
  test.skip(browserName === "webkit", "Playwright WebKit on Windows does not settle Dexie Blob write transactions.");
  await captureExhibit(page, { title: "Local artifact fixture" });
  await page.getByLabel("Image, PDF, or audio").setInputFiles({
    name: "harbor.png",
    mimeType: "image/png",
    buffer: Buffer.from("not-a-rendered-image-but-a-valid-local-artifact"),
  });
  await expect(page.getByRole("heading", { name: "harbor.png" })).toBeVisible();
  await page.reload();
  await expect(page.getByRole("heading", { name: "harbor.png" })).toBeVisible();
});

test("filters and searches the gallery across rooms, type, status, and tags", async ({ page }) => {
  await captureExhibit(page, { title: "Harbor signal experiment", tags: "Harbor, Signals", type: "experiment" });
  await captureExhibit(page, { title: "Quiet archive draft", tags: "Archive, Notes", type: "project" });
  await page.getByRole("button", { name: "Move to Archive", exact: true }).click();
  await page.getByRole("dialog", { name: "Move to Archive?" }).getByRole("button", { name: "Archive Exhibit" }).click();
  await expect(page.getByText("Project / Archived")).toBeVisible();

  await page.goto("/museum");
  await page.getByRole("button", { name: "Workshop", exact: true }).click();
  await page.getByRole("searchbox", { name: "Search collection" }).fill("signal");
  await expect(page.getByRole("list", { name: "Exhibits" })).toContainText("Harbor signal experiment");
  await expect(page.getByRole("list", { name: "Exhibits" })).not.toContainText("Quiet archive draft");
  await page.getByRole("combobox", { name: "Exhibit type" }).selectOption("experiment");
  await page.getByRole("combobox", { name: "Tag" }).selectOption("Signals");
  await expect(page.getByRole("status", { name: "Gallery result count" })).toHaveText("1 exhibit in Workshop");

  await page.getByRole("button", { name: "Archive", exact: true }).click();
  await page.getByRole("searchbox", { name: "Search collection" }).fill("Quiet");
  await page.getByRole("combobox", { name: "Exhibit type" }).selectOption("all");
  await page.getByRole("combobox", { name: "Tag" }).selectOption("all");
  await page.getByRole("combobox", { name: "Status" }).selectOption("archived");
  await expect(page.getByRole("list", { name: "Exhibits" })).toContainText("Quiet archive draft");
  await page.getByRole("searchbox", { name: "Search collection" }).fill("missing");
  await expect(page.getByRole("heading", { name: "Nothing is hidden here." })).toBeVisible();
  await expect(page.getByRole("button", { name: "Archive", exact: true })).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByRole("searchbox", { name: "Search collection" })).toHaveValue("missing");
  await expect(page.getByRole("combobox", { name: "Exhibit type" })).toHaveValue("all");
  await expect(page.getByRole("combobox", { name: "Status" })).toHaveValue("archived");
  await expect(page.getByRole("combobox", { name: "Tag" })).toHaveValue("all");
  await expect(page.getByRole("link", { name: "Quiet archive draft" })).toHaveCount(0);
  await expect(page.getByRole("status", { name: "Gallery result count" })).toHaveText("0 exhibits in Archive");
  await page.getByRole("button", { name: "Clear filters" }).click();
  await expect(page.getByRole("button", { name: "Lobby", exact: true })).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByRole("searchbox", { name: "Search collection" })).toHaveValue("");
  await expect(page.getByRole("combobox", { name: "Exhibit type" })).toHaveValue("all");
  await expect(page.getByRole("combobox", { name: "Status" })).toHaveValue("all");
  await expect(page.getByRole("combobox", { name: "Tag" })).toHaveValue("all");
  await expect(page.getByRole("link", { name: "Quiet archive draft" })).toBeVisible();
  await expect(page.getByRole("status", { name: "Gallery result count" })).toHaveText("2 exhibits in Lobby");
});

test("records archive, complete, release, and revive closure ceremonies", async ({ page }) => {
  const archiveId = await captureExhibit(page, { title: "Archive ceremony" });
  await confirmClosure(page, "Move to Archive", "Move to Archive?", "Archive Exhibit");
  await expect(page.getByText("Project / Archived")).toBeVisible();
  await confirmClosure(page, "Revive", "Revive this Exhibit?", "Revive Exhibit");
  await expect(page.getByText("Project / Revived")).toBeVisible();

  const completeId = await captureExhibit(page, { title: "Completion ceremony" });
  await confirmClosure(page, "Complete", "Complete this Exhibit?", "Complete Exhibit");
  await expect(page.getByText("Project / Completed")).toBeVisible();
  await confirmClosure(page, "Revive", "Revive this Exhibit?", "Revive Exhibit");
  await expect(page.getByText("Project / Revived")).toBeVisible();

  const releaseId = await captureExhibit(page, { title: "Release ceremony" });
  await confirmClosure(page, "Release", "Release this Exhibit?", "Release Exhibit");
  await expect(page.getByText("Project / Released")).toBeVisible();
  await confirmClosure(page, "Revive", "Revive this Exhibit?", "Revive Exhibit");
  await expect(page.getByText("Project / Revived")).toBeVisible();

  for (const id of [archiveId, completeId, releaseId]) {
    await page.goto(`/exhibit?id=${id}`);
    await expect(page.getByRole("button", { name: "Move to Archive", exact: true })).toBeVisible();
  }
});

test("transforms an Exhibit into both an existing and a newly captured Exhibit", async ({ page }) => {
  const targetId = await captureExhibit(page, { title: "Existing successor", label: "A connected next attempt" });
  const sourceId = await captureExhibit(page, { title: "Existing transformation source" });
  await page.getByRole("button", { name: "Transform", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Transform this Exhibit?" });
  await dialog.getByRole("combobox", { name: "Existing Exhibit" }).selectOption(targetId);
  await dialog.getByRole("button", { name: "Transform Exhibit" }).click();
  await expect(page.getByText("Project / Transformed")).toBeVisible();
  await expect(page.getByRole("status")).toHaveText("This Exhibit has been transformed and linked.");

  await captureExhibit(page, { title: "New transformation source" });
  await page.getByRole("button", { name: "Transform", exact: true }).click();
  const newDialog = page.getByRole("dialog", { name: "Transform this Exhibit?" });
  await newDialog.getByRole("radio", { name: "Create a new Exhibit" }).check();
  await newDialog.getByRole("textbox", { name: "New Exhibit title" }).fill("New successor");
  await newDialog.getByRole("textbox", { name: "New Exhibit label" }).fill("A new record made from the first one");
  await newDialog.getByRole("button", { name: "Transform Exhibit" }).click();
  await expect(page.getByText("Project / Transformed")).toBeVisible();

  await page.goto("/museum");
  await page.getByRole("button", { name: "Hall of Second Chances", exact: true }).click();
  await expect(page.getByRole("link", { name: "Existing transformation source" })).toHaveAttribute("href", `/exhibit?id=${sourceId}`);
  await expect(page.getByRole("link", { name: "New transformation source" })).toBeVisible();
  await page.getByRole("button", { name: "Workshop", exact: true }).click();
  await expect(page.getByRole("link", { name: "New successor" })).toBeVisible();
});

test("exports, previews, restores, and rejects backups without overwriting the current collection", async ({ page }) => {
  await captureExhibit(page, { title: "Backup fixture", withArtifacts: true });
  await page.goto("/settings");
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export collection" }).click();
  const download = await downloadPromise;
  const backup = await download.createReadStream();
  const chunks: Buffer[] = [];
  for await (const chunk of backup!) chunks.push(Buffer.from(chunk));
  const backupJson = Buffer.concat(chunks);
  expect(JSON.parse(backupJson.toString())).toMatchObject({ format: "almost-museum", version: 1 });

  await page.getByRole("button", { name: "Erase all local data" }).click();
  await page.getByRole("dialog", { name: "Erase all local museum data?" }).getByRole("button", { name: "Erase all data" }).click();
  await expect(page.getByText("All local museum records have been erased. Restore a backup to recover them.", { exact: true })).toBeVisible();
  await page.goto("/museum");
  await expect(page.getByRole("heading", { name: "Your collection is empty." })).toBeVisible();

  await page.goto("/settings");
  await page.getByLabel("Choose backup file").setInputFiles({ name: "almost-museum-backup.json", mimeType: "application/json", buffer: backupJson });
  await expect(page.getByRole("region", { name: "Backup preview" })).toContainText("Ready to restore 1 Exhibit, 2 artifacts");
  await page.getByRole("button", { name: "Restore collection" }).click();
  await page.getByRole("dialog", { name: "Replace this collection?" }).getByRole("button", { name: "Replace collection" }).click();
  await expect(page.getByRole("status")).toHaveText("Collection restored from backup.");
  await page.getByLabel("Choose backup file").setInputFiles({ name: "not-a-backup.json", mimeType: "application/json", buffer: Buffer.from('{"format":"elsewhere"}') });
  await expect(page.getByText("Choose a valid version 1 Almost Museum JSON backup.", { exact: true })).toBeVisible();
  await page.goto("/museum");
  await page.getByRole("link", { name: "Backup fixture" }).click();
  await expect(page.getByRole("link", { name: "Reference sketch" })).toHaveAttribute("href", "https://example.test/sketch");
  await expect(page.getByRole("heading", { name: "Curator note" })).toBeVisible();
  await expect(page.getByText("Keep the small decision visible.")).toBeVisible();
});

test("keeps gallery, capture, detail, and settings layouts inside a narrow viewport", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto("/museum");
  await page.getByRole("button", { name: "Install Harbor Queue demo" }).click();
  const detailHref = await page.getByRole("link", { name: "The Harbor Queue Redesign" }).getAttribute("href");

  for (const route of ["/museum", "/exhibit/new", detailHref!, "/settings"]) {
    await page.goto(route);
    await expect(page.locator("main")).toBeVisible();
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  }
});

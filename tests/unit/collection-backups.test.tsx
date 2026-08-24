import Dexie from "dexie";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";

import { CollectionBackups } from "@/components/collection-backups";
import { exportCollectionBackup } from "@/lib/backups/collection-backup";
import { ExhibitRepository } from "@/lib/persistence";

const databaseNames = new Set<string>();
const repositories = new Set<ExhibitRepository>();

function createRepository(name: string): ExhibitRepository {
  databaseNames.add(name);
  let id = 0;
  const repository = new ExhibitRepository({
    databaseName: name,
    createId: () => `backup-ui-${++id}`,
    now: () => new Date("2026-08-23T08:00:00.000Z"),
  });
  repositories.add(repository);
  return repository;
}

afterEach(async () => {
  for (const repository of repositories) repository.close();
  repositories.clear();
  for (const name of databaseNames) await Dexie.delete(name);
  databaseNames.clear();
});

describe("CollectionBackups", () => {
  it("keeps backup controls beneath the section heading", () => {
    const repository = createRepository("almost-museum-backup-ui-headings");

    render(<CollectionBackups repository={repository} />);

    expect(screen.getByRole("heading", { name: "Back up your museum", level: 2 })).toBeVisible();
    expect(screen.getByRole("heading", { name: "Export", level: 3 })).toBeVisible();
    expect(screen.getByRole("heading", { name: "Restore", level: 3 })).toBeVisible();
    expect(document.querySelectorAll("[data-slot='card']")).toHaveLength(2);
    expect(screen.getByLabelText("Choose backup file")).toHaveAttribute("data-slot", "input");
  });

  it("exports the repository collection as a downloadable version-one JSON file", async () => {
    const user = userEvent.setup();
    const repository = createRepository("almost-museum-backup-ui-export");
    await repository.createExhibit({
      title: "Harbor Queue",
      type: "project",
      status: "active",
      museumLabel: "A calmer route through the harbor",
    });
    const downloads: Array<{ filename: string; json: string }> = [];

    render(<CollectionBackups repository={repository} onDownload={(json, filename) => downloads.push({ json, filename })} />);
    await user.click(screen.getByRole("button", { name: "Export collection" }));

    await waitFor(() => expect(downloads).toHaveLength(1));
    expect(downloads[0].filename).toMatch(/^almost-museum-backup-\d{4}-\d{2}-\d{2}\.json$/);
    expect(JSON.parse(downloads[0].json)).toMatchObject({ format: "almost-museum", version: 1, exhibits: [{ title: "Harbor Queue" }] });
    expect(screen.getByRole("status")).toHaveTextContent("Collection backup downloaded.");
  });

  it("previews an uploaded backup and only restores it after confirmation", async () => {
    const user = userEvent.setup();
    const source = createRepository("almost-museum-backup-ui-source");
    const imported = await source.createExhibit({
      title: "Imported Harbor Queue",
      type: "project",
      status: "active",
      museumLabel: "A route worth keeping",
    });
    const backup = await exportCollectionBackup(source, new Date("2026-08-23T09:00:00.000Z"));
    const target = createRepository("almost-museum-backup-ui-target");
    await target.createExhibit({
      title: "Local work",
      type: "idea",
      status: "unfinished",
      museumLabel: "This is replaced only after confirmation",
    });

    render(<CollectionBackups repository={target} readBackupFile={async () => backup} />);
    await user.upload(screen.getByLabelText("Choose backup file"), new File(["unused"], "museum.json", { type: "application/json" }));

    expect(await screen.findByText("Ready to restore 1 Exhibit, 0 artifacts, and 1 history event.")).toBeVisible();
    expect((await target.getSnapshot()).exhibits[0].title).toBe("Local work");
    await user.click(screen.getByRole("button", { name: "Restore collection" }));
    expect(screen.getByRole("alertdialog", { name: "Replace this collection?" })).toBeVisible();
    await user.click(screen.getByRole("button", { name: "Replace collection" }));

    await waitFor(async () => expect((await target.getSnapshot()).exhibits[0]).toMatchObject({ id: imported.id, title: "Imported Harbor Queue" }));
    expect(screen.getByRole("status")).toHaveTextContent("Collection restored from backup.");
  });
});

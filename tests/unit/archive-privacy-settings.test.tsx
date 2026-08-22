import Dexie from "dexie";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ArchivePrivacySettings } from "@/components/archive-privacy-settings";
import { ExhibitRepository } from "@/lib/persistence";

const databaseNames = new Set<string>();
const repositories = new Set<ExhibitRepository>();

function createRepository(name: string): ExhibitRepository {
  databaseNames.add(name);
  let id = 0;
  const repository = new ExhibitRepository({
    databaseName: name,
    createId: () => `privacy-${++id}`,
    now: () => new Date("2026-08-23T10:00:00.000Z"),
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

describe("ArchivePrivacySettings", () => {
  it("shows browser storage estimates and requests persistent storage without touching the collection", async () => {
    const user = userEvent.setup();
    const repository = createRepository("almost-museum-privacy-storage");
    await repository.createExhibit({
      title: "Harbor Queue",
      type: "project",
      status: "active",
      museumLabel: "A calmer queue",
    });
    const persist = vi.fn().mockResolvedValue(true);

    render(<ArchivePrivacySettings repository={repository} storage={{
      estimate: vi.fn().mockResolvedValue({ quota: 2_048, usage: 1_536 }),
      persisted: vi.fn().mockResolvedValue(false),
      persist,
    }} />);

    expect(await screen.findByText("Estimated local storage: 1.5 KiB used of 2 KiB.")).toBeVisible();
    expect(screen.getByText("Persistent storage is not enabled.")).toBeVisible();
    await user.click(screen.getByRole("button", { name: "Request persistent storage" }));

    await waitFor(() => expect(persist).toHaveBeenCalledOnce());
    expect(screen.getByRole("status")).toHaveTextContent("Persistent storage is enabled.");
    await expect(repository.getSnapshot()).resolves.toMatchObject({ exhibits: [{ title: "Harbor Queue" }] });
  });

  it("does not erase until separately confirmed, then leaves an explicit backup recovery state", async () => {
    const user = userEvent.setup();
    const repository = createRepository("almost-museum-privacy-erase");
    await repository.createExhibit({
      title: "Keep this until confirmation",
      type: "project",
      status: "active",
      museumLabel: "Only erase after a clear choice",
    });

    render(<ArchivePrivacySettings repository={repository} storage={{}} />);
    await user.click(screen.getByRole("button", { name: "Erase all local data" }));

    expect(screen.getByRole("dialog", { name: "Erase all local museum data?" })).toBeVisible();
    await expect(repository.getSnapshot()).resolves.toMatchObject({ exhibits: [{ title: "Keep this until confirmation" }] });
    await user.click(screen.getByRole("button", { name: "Erase all data" }));

    await waitFor(async () => expect(await repository.getSnapshot()).toEqual({ exhibits: [], artifacts: [], history: [] }));
    expect(screen.getByRole("status")).toHaveTextContent("All local museum records have been erased. Restore a backup to recover them.");
  });
});

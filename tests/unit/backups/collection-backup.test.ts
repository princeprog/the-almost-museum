import Dexie from "dexie";
import { afterEach, describe, expect, it } from "vitest";

import {
  BackupValidationError,
  exportCollectionBackup,
  previewCollectionBackup,
  restoreCollectionBackup,
} from "@/lib/backups/collection-backup";
import { ExhibitRepository, type MuseumSnapshot } from "@/lib/persistence";

const databaseNames = new Set<string>();
const repositories = new Set<ExhibitRepository>();

function createRepository(name: string): ExhibitRepository {
  databaseNames.add(name);
  let id = 0;
  const repository = new ExhibitRepository({
    databaseName: name,
    createId: () => `backup-${++id}`,
    now: () => new Date("2026-08-23T06:00:00.000Z"),
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

describe("portable collection backups", () => {
  const timestamp = "2026-08-23T06:00:00.000Z";
  const exhibit: MuseumSnapshot["exhibits"][number] = {
    id: "harbor-queue",
    title: "Harbor Queue",
    type: "project",
    status: "active",
    museumLabel: "A calmer route through the harbor",
    tags: [],
    relatedExhibitIds: [],
    createdAt: timestamp,
    updatedAt: timestamp,
    closedAt: null,
  };

  function backupJson(snapshot: Partial<MuseumSnapshot>): string {
    return JSON.stringify({
      format: "almost-museum",
      version: 1,
      exportedAt: timestamp,
      exhibits: [exhibit],
      artifacts: [],
      history: [],
      ...snapshot,
    });
  }

  it("round-trips file bytes and metadata through the portable JSON envelope", async () => {
    const exhibit: MuseumSnapshot["exhibits"][number] = {
      id: "harbor-queue",
      title: "Harbor Queue",
      type: "project",
      status: "active",
      museumLabel: "A calmer route through the harbor",
      tags: [],
      relatedExhibitIds: [],
      createdAt: "2026-08-23T06:00:00.000Z",
      updatedAt: "2026-08-23T06:00:00.000Z",
      closedAt: null,
    };
    const source = {
      getSnapshot: async (): Promise<MuseumSnapshot> => ({
        exhibits: [exhibit],
        artifacts: [{
          id: "queue-sketch",
          exhibitId: exhibit.id,
          kind: "image",
          label: "Queue sketch",
          fileName: "queue.png",
          mimeType: "image/png",
          byteSize: 4,
          blob: new Blob([new Uint8Array([0, 1, 2, 255])], { type: "image/png" }),
          createdAt: "2026-08-23T06:00:00.000Z",
        }],
        history: [{
          id: "harbor-created",
          exhibitId: exhibit.id,
          type: "created",
          occurredAt: "2026-08-23T06:00:00.000Z",
          summary: "Created Exhibit.",
          details: { status: "active", type: "project" },
        }],
      }),
    } satisfies Pick<ExhibitRepository, "getSnapshot">;

    const backup = await exportCollectionBackup(source, new Date("2026-08-23T07:00:00.000Z"));
    const preview = await previewCollectionBackup(backup);

    expect(JSON.parse(backup)).toMatchObject({
      format: "almost-museum",
      version: 1,
      exportedAt: "2026-08-23T07:00:00.000Z",
      artifacts: [{ blob: { type: "image/png" }, fileName: "queue.png", mimeType: "image/png", byteSize: 4 }],
    });
    expect(preview).toMatchObject({ exhibits: 1, artifacts: 1, history: 1 });
    expect(preview.snapshot.artifacts[0]).toMatchObject({
      label: "Queue sketch",
      fileName: "queue.png",
      mimeType: "image/png",
      byteSize: 4,
    });
    expect(preview.snapshot.artifacts[0].blob?.type).toBe("image/png");
    expect(Array.from(new Uint8Array(await preview.snapshot.artifacts[0].blob!.arrayBuffer()))).toEqual([0, 1, 2, 255]);
  });

  it("replaces all three persisted collections after a validated restore", async () => {
    const source = createRepository("almost-museum-backup-source");
    const exhibit = await source.createExhibit({
      title: "Harbor Queue",
      type: "project",
      status: "active",
      museumLabel: "A calmer route through the harbor",
    });
    const backup = await exportCollectionBackup(source, new Date("2026-08-23T07:00:00.000Z"));
    const preview = await previewCollectionBackup(backup);
    const target = createRepository("almost-museum-backup-target");
    const local = await target.createExhibit({
      title: "Local work to replace",
      type: "idea",
      status: "unfinished",
      museumLabel: "Not part of the imported collection",
    });
    await target.addArtifact(local.id, { kind: "link", label: "Old reference", url: "https://example.com/old" });

    await restoreCollectionBackup(target, preview);

    const restored = await target.getSnapshot();
    expect(restored.exhibits).toHaveLength(1);
    expect(restored.exhibits[0]).toMatchObject({ id: exhibit.id, title: "Harbor Queue" });
    expect(restored.artifacts).toEqual([]);
    expect(restored.history).toHaveLength(1);
    expect(restored.history[0]).toMatchObject({ exhibitId: exhibit.id, type: "created" });
  });

  it("rejects malformed and newer backups before the existing collection is changed", async () => {
    const repository = createRepository("almost-museum-backup-rejection");
    await repository.createExhibit({
      title: "Keep this local work",
      type: "idea",
      status: "unfinished",
      museumLabel: "It must survive a rejected restore",
    });
    const before = await repository.getSnapshot();

    await expect(previewCollectionBackup("not json")).rejects.toThrow("valid Almost Museum JSON backup");
    await expect(previewCollectionBackup(JSON.stringify({
      format: "almost-museum",
      version: 2,
      exportedAt: "2026-08-23T07:00:00.000Z",
      exhibits: [],
      artifacts: [],
      history: [],
    }))).rejects.toThrow("newer than this Museum can restore");

    await expect(repository.getSnapshot()).resolves.toEqual(before);
  });

  it.each([
    ["artifact", {
      exhibits: [],
      artifacts: [{
        id: "orphan-artifact",
        exhibitId: "missing-exhibit",
        kind: "note" as const,
        label: "Detached note",
        note: "This artifact has no Exhibit.",
        createdAt: timestamp,
      }],
    }],
    ["history event", {
      exhibits: [],
      history: [{
        id: "orphan-history",
        exhibitId: "missing-exhibit",
        type: "created" as const,
        occurredAt: timestamp,
        summary: "Created Exhibit.",
        details: {},
      }],
    }],
  ])("rejects a backup with an orphan %s", async (_recordType, snapshot) => {
    await expect(previewCollectionBackup(backupJson(snapshot))).rejects.toBeInstanceOf(BackupValidationError);
  });

  it("rejects a backup whose Exhibit links to an unknown related Exhibit", async () => {
    await expect(previewCollectionBackup(backupJson({
      exhibits: [{ ...exhibit, relatedExhibitIds: ["missing-exhibit"] }],
    }))).rejects.toBeInstanceOf(BackupValidationError);
  });

  it.each([
    ["Exhibit", { exhibits: [exhibit, { ...exhibit, title: "Duplicate Exhibit" }] }],
    ["artifact", {
      artifacts: [
        { id: "duplicate", exhibitId: exhibit.id, kind: "note" as const, label: "First", note: "First note", createdAt: timestamp },
        { id: "duplicate", exhibitId: exhibit.id, kind: "note" as const, label: "Second", note: "Second note", createdAt: timestamp },
      ],
    }],
    ["history event", {
      history: [
        { id: "duplicate", exhibitId: exhibit.id, type: "created" as const, occurredAt: timestamp, summary: "First", details: {} },
        { id: "duplicate", exhibitId: exhibit.id, type: "edited" as const, occurredAt: timestamp, summary: "Second", details: {} },
      ],
    }],
  ])("rejects a backup with duplicate %s IDs", async (_recordType, snapshot) => {
    await expect(previewCollectionBackup(backupJson(snapshot))).rejects.toBeInstanceOf(BackupValidationError);
  });

  it("validates the whole restore snapshot before clearing existing repository records", async () => {
    const repository = createRepository("almost-museum-backup-atomic-validation");
    const local = await repository.createExhibit({
      title: "Keep this local work",
      type: "idea",
      status: "unfinished",
      museumLabel: "It must survive validation failure",
    });
    await repository.addArtifact(local.id, { kind: "link", label: "Local reference", url: "https://example.com/local" });
    const before = await repository.getSnapshot();

    await expect(repository.restoreSnapshot({
      exhibits: [],
      artifacts: [{ id: "broken", exhibitId: local.id, kind: "image", label: "Broken file", createdAt: before.exhibits[0].createdAt }] as never,
      history: [],
    })).rejects.toThrow("Image artifacts must use an image/* MIME type.");

    await expect(repository.getSnapshot()).resolves.toEqual(before);
  });

  it("rejects an inconsistent restore snapshot without changing existing repository records", async () => {
    const repository = createRepository("almost-museum-backup-integrity-validation");
    await repository.createExhibit({
      title: "Keep this local work",
      type: "idea",
      status: "unfinished",
      museumLabel: "It must survive integrity failure",
    });
    const before = await repository.getSnapshot();

    await expect(repository.restoreSnapshot({
      exhibits: [],
      artifacts: [{
        id: "orphan-artifact",
        exhibitId: "missing-exhibit",
        kind: "note",
        label: "Detached note",
        note: "This artifact has no Exhibit.",
        createdAt: timestamp,
      }],
      history: [],
    })).rejects.toThrow();

    await expect(repository.getSnapshot()).resolves.toEqual(before);
  });

  it("rolls back all collection clears when a restore write fails inside the transaction", async () => {
    const repository = createRepository("almost-museum-backup-atomic-transaction");
    await repository.createExhibit({
      title: "Keep this local work",
      type: "idea",
      status: "unfinished",
      museumLabel: "It must survive a transaction failure",
    });
    const before = await repository.getSnapshot();
    const replacement = {
      id: "replacement",
      title: "Replacement exhibit",
      type: "project" as const,
      status: "active" as const,
      museumLabel: "A complete replacement",
      tags: [],
      relatedExhibitIds: [],
      createdAt: "2026-08-23T10:00:00.000Z",
      updatedAt: "2026-08-23T10:00:00.000Z",
      closedAt: null,
    };
    const duplicateEvent = {
      id: "duplicate-event",
      exhibitId: replacement.id,
      type: "created" as const,
      occurredAt: replacement.createdAt,
      summary: "Created Exhibit.",
      details: {},
    };

    await expect(repository.restoreSnapshot({
      exhibits: [replacement],
      artifacts: [],
      history: [duplicateEvent, duplicateEvent],
    })).rejects.toThrow();

    await expect(repository.getSnapshot()).resolves.toEqual(before);
  });
});

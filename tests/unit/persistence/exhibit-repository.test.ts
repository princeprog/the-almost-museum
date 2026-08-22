// @vitest-environment node

import Dexie from "dexie";
import { afterEach, describe, expect, it } from "vitest";

import { ARTIFACT_FILE_SIZE_LIMIT } from "@/lib/artifacts/file-validation";
import { ExhibitRepository } from "@/lib/persistence";

const databaseNames = new Set<string>();
const repositories = new Set<ExhibitRepository>();

function createRepository(
  name: string,
  ids: string[],
  now: string | string[] = "2026-08-23T02:00:00.000Z",
): ExhibitRepository {
  databaseNames.add(name);
  let idIndex = 0;
  let timeIndex = 0;

  const repository = new ExhibitRepository({
    databaseName: name,
    createId: () => ids[idIndex++] ?? `generated-${idIndex}`,
    now: () => new Date(Array.isArray(now) ? now[timeIndex++] ?? now.at(-1) : now),
  });
  repositories.add(repository);
  return repository;
}

afterEach(async () => {
  for (const repository of repositories) {
    repository.close();
  }
  repositories.clear();
  for (const name of databaseNames) {
    await Dexie.delete(name);
  }
  databaseNames.clear();
});

describe("ExhibitRepository", () => {
  it("creates a normalized Exhibit and its history event atomically", async () => {
    const repository = createRepository("almost-museum-create", ["exhibit-1", "history-1"]);

    const exhibit = await repository.createExhibit({
      title: "  Harbor   Queue Redesign ",
      type: "project",
      status: "unfinished",
      museumLabel: "  A clearer   way through the harbor ",
      tags: [" Product Design ", "product design"],
    });

    expect(exhibit).toEqual({
      id: "exhibit-1",
      title: "Harbor Queue Redesign",
      type: "project",
      status: "unfinished",
      museumLabel: "A clearer way through the harbor",
      tags: ["Product Design"],
      relatedExhibitIds: [],
      createdAt: "2026-08-23T02:00:00.000Z",
      updatedAt: "2026-08-23T02:00:00.000Z",
      closedAt: null,
    });
    await expect(repository.listExhibits()).resolves.toEqual([exhibit]);
    await expect(repository.getHistory("exhibit-1")).resolves.toEqual([
      expect.objectContaining({
        id: "history-1",
        exhibitId: "exhibit-1",
        type: "created",
        occurredAt: "2026-08-23T02:00:00.000Z",
      }),
    ]);
  });

  it("captures an Exhibit with written artifacts and all history in one transaction", async () => {
    const repository = createRepository("almost-museum-capture-atomic", [
      "exhibit-1",
      "history-created",
      "artifact-link",
      "history-link",
      "artifact-note",
      "history-note",
    ]);

    const exhibit = await repository.captureExhibit({
      title: "Harbor wayfinding study",
      type: "experiment",
      status: "unfinished",
      museumLabel: "A quieter route through the harbor",
    }, [
      { kind: "link", label: "Reference sketch", url: "https://example.com/sketch" },
      { kind: "note", label: "A small reminder", note: "The queue needed calmer handoffs." },
    ]);

    await expect(repository.listArtifacts(exhibit.id)).resolves.toEqual([
      expect.objectContaining({ id: "artifact-link", kind: "link", url: "https://example.com/sketch" }),
      expect.objectContaining({ id: "artifact-note", kind: "note", note: "The queue needed calmer handoffs." }),
    ]);
    await expect(repository.getHistory(exhibit.id)).resolves.toEqual([
      expect.objectContaining({ id: "history-created", type: "created" }),
      expect.objectContaining({ id: "history-link", type: "artifact-added", details: { artifactId: "artifact-link", kind: "link" } }),
      expect.objectContaining({ id: "history-note", type: "artifact-added", details: { artifactId: "artifact-note", kind: "note" } }),
    ]);
  });

  it("rolls back a failed capture so retrying creates one complete Exhibit without a partial duplicate", async () => {
    const repository = createRepository("almost-museum-capture-retry", [
      "existing-exhibit",
      "duplicate-history",
      "failed-exhibit",
      "duplicate-history",
      "failed-artifact",
      "failed-artifact-history",
      "retry-exhibit",
      "retry-history",
      "retry-artifact",
      "retry-artifact-history",
    ]);
    await repository.createExhibit({
      title: "Existing Exhibit",
      type: "draft",
      status: "unfinished",
      museumLabel: "Already here",
    });
    const captureInput = {
      title: "Harbor wayfinding study",
      type: "experiment" as const,
      status: "unfinished" as const,
      museumLabel: "A quieter route through the harbor",
    };
    const evidence = [{ kind: "note" as const, label: "A small reminder", note: "The queue needed calmer handoffs." }];

    await expect(repository.captureExhibit(captureInput, evidence)).rejects.toThrow();
    await expect(repository.listExhibits()).resolves.toEqual([
      expect.objectContaining({ id: "existing-exhibit", title: "Existing Exhibit" }),
    ]);
    await expect(repository.getSnapshot()).resolves.toMatchObject({
      artifacts: [],
      history: [expect.objectContaining({ exhibitId: "existing-exhibit" })],
    });

    const retried = await repository.captureExhibit(captureInput, evidence);

    await expect(repository.listExhibits()).resolves.toEqual([
      expect.objectContaining({ id: "existing-exhibit" }),
      expect.objectContaining({ id: "retry-exhibit", title: "Harbor wayfinding study" }),
    ]);
    await expect(repository.listArtifacts(retried.id)).resolves.toHaveLength(1);
    await expect(repository.getHistory(retried.id)).resolves.toHaveLength(2);
  });

  it("gets and updates an Exhibit while appending an edited event", async () => {
    const repository = createRepository("almost-museum-update", [
      "exhibit-1",
      "history-created",
      "history-edited",
    ]);
    await repository.createExhibit({
      title: "Harbor Queue",
      type: "project",
      status: "active",
      museumLabel: "First label",
    });

    const updated = await repository.updateExhibit(" exhibit-1 ", {
      title: "  Harbor   Queue Redesign ",
      museumLabel: "  A calmer crossing ",
      tags: [" UX ", "ux", " Maritime "],
    });

    expect(updated).toMatchObject({
      title: "Harbor Queue Redesign",
      museumLabel: "A calmer crossing",
      tags: ["UX", "Maritime"],
      updatedAt: "2026-08-23T02:00:00.000Z",
    });
    await expect(repository.getExhibit("exhibit-1")).resolves.toEqual(updated);
    await expect(repository.getHistory("exhibit-1")).resolves.toEqual([
      expect.objectContaining({ type: "created" }),
      expect.objectContaining({
        id: "history-edited",
        type: "edited",
        details: { fields: ["museumLabel", "tags", "title"] },
      }),
    ]);
  });

  it("stores file artifacts without changing Blob data and records artifact removal", async () => {
    const repository = createRepository(
      "almost-museum-artifacts",
      ["exhibit-1", "history-created", "artifact-1", "history-added", "history-removed"],
      [
        "2026-08-23T02:00:00.000Z",
        "2026-08-23T02:01:00.000Z",
        "2026-08-23T02:02:00.000Z",
      ],
    );
    await repository.createExhibit({
      title: "Harbor Queue",
      type: "project",
      status: "unfinished",
      museumLabel: "A navigation study",
    });
    const blob = new Blob([new Uint8Array([1, 2, 3, 4])], { type: "image/png" });

    const artifact = await repository.addArtifact("exhibit-1", {
      kind: "image",
      label: "  First   sketch ",
      fileName: "queue.png",
      mimeType: "image/png",
      byteSize: 4,
      blob,
    });

    expect(artifact).toMatchObject({
      id: "artifact-1",
      exhibitId: "exhibit-1",
      label: "First sketch",
      kind: "image",
      byteSize: 4,
    });
    const [stored] = await repository.listArtifacts("exhibit-1");
    expect(stored.blob).toBeInstanceOf(Blob);
    await expect(stored.blob?.arrayBuffer()).resolves.toEqual(await blob.arrayBuffer());

    await repository.removeArtifact("artifact-1");

    await expect(repository.listArtifacts("exhibit-1")).resolves.toEqual([]);
    await expect(repository.getHistory("exhibit-1")).resolves.toEqual([
      expect.objectContaining({ type: "created" }),
      expect.objectContaining({
        id: "history-added",
        type: "artifact-added",
        details: { artifactId: "artifact-1", kind: "image" },
      }),
      expect.objectContaining({
        id: "history-removed",
        type: "artifact-removed",
        details: { artifactId: "artifact-1", kind: "image" },
      }),
    ]);
  });

  it("rejects an oversize local file before it can be persisted", async () => {
    const repository = createRepository(
      "almost-museum-oversize-artifact",
      ["exhibit-1", "history-created"],
    );
    await repository.createExhibit({
      title: "Harbor Queue",
      type: "project",
      status: "unfinished",
      museumLabel: "A navigation study",
    });

    await expect(repository.addArtifact("exhibit-1", {
      kind: "image",
      label: "Oversize sketch",
      fileName: "oversize.png",
      mimeType: "image/png",
      byteSize: ARTIFACT_FILE_SIZE_LIMIT + 1,
      blob: new Blob([new Uint8Array(ARTIFACT_FILE_SIZE_LIMIT + 1)], { type: "image/png" }),
    })).rejects.toThrow("Artifact files must be no larger than 25 MiB.");

    await expect(repository.listArtifacts("exhibit-1")).resolves.toEqual([]);
  });

  it("rejects a file whose MIME type does not match its kind through addArtifact", async () => {
    const repository = createRepository("almost-museum-artifact-mime", ["exhibit-1", "history-created"]);
    await repository.createExhibit({
      title: "Harbor Queue",
      type: "project",
      status: "unfinished",
      museumLabel: "A navigation study",
    });

    await expect(repository.addArtifact("exhibit-1", {
      kind: "image",
      label: "Mislabeled document",
      fileName: "label.pdf",
      mimeType: "application/pdf",
      byteSize: 24,
      blob: new Blob(["museum label"], { type: "application/pdf" }),
    })).rejects.toThrow("Image artifacts must use an image/* MIME type.");

    await expect(repository.listArtifacts("exhibit-1")).resolves.toEqual([]);
  });

  it("rejects a file whose MIME type does not match its kind before capture writes anything", async () => {
    const repository = createRepository("almost-museum-capture-artifact-mime", []);

    await expect(repository.captureExhibit({
      title: "Harbor Queue",
      type: "project",
      status: "unfinished",
      museumLabel: "A navigation study",
    }, [{
      kind: "audio",
      label: "Mislabeled image",
      fileName: "sketch.png",
      mimeType: "image/png",
      byteSize: 24,
      blob: new Blob(["sketch"], { type: "image/png" }),
    }])).rejects.toThrow("Audio artifacts must use an audio/* MIME type.");

    await expect(repository.getSnapshot()).resolves.toEqual({ exhibits: [], artifacts: [], history: [] });
  });

  it("applies closure transitions with pure domain rules and appends status history", async () => {
    const repository = createRepository("almost-museum-status", [
      "exhibit-1",
      "history-created",
      "history-status",
    ]);
    await repository.createExhibit({
      title: "Harbor Queue",
      type: "project",
      status: "active",
      museumLabel: "A navigation study",
    });

    const closed = await repository.transitionExhibit("exhibit-1", {
      action: "archive",
      occurredAt: "2026-08-24T10:30:00+08:00",
    });

    expect(closed).toMatchObject({
      status: "archived",
      updatedAt: "2026-08-24T02:30:00.000Z",
      closedAt: "2026-08-24T02:30:00.000Z",
    });
    await expect(repository.getHistory("exhibit-1")).resolves.toContainEqual(
      expect.objectContaining({
        id: "history-status",
        type: "status-changed",
        details: { action: "archive", from: "active", to: "archived" },
      }),
    );
  });

  it("transforms an Exhibit only when the related target exists", async () => {
    const repository = createRepository("almost-museum-transform", [
      "source",
      "history-source",
      "target",
      "history-target",
      "history-transform",
    ]);
    await repository.createExhibit({
      title: "Source",
      type: "idea",
      status: "unfinished",
      museumLabel: "The first shape",
    });
    await repository.createExhibit({
      title: "Target",
      type: "project",
      status: "active",
      museumLabel: "The next shape",
    });

    await expect(
      repository.transformExhibit("source", "missing", "2026-08-24T00:00:00.000Z"),
    ).rejects.toThrow('Related Exhibit "missing" was not found');
    await expect(repository.getExhibit("source")).resolves.toMatchObject({
      status: "unfinished",
      relatedExhibitIds: [],
    });

    const transformed = await repository.transformExhibit(
      "source",
      " target ",
      "2026-08-24T00:00:00.000Z",
    );

    expect(transformed).toMatchObject({
      status: "transformed",
      relatedExhibitIds: ["target"],
      closedAt: "2026-08-24T00:00:00.000Z",
    });
    await expect(repository.getHistory("source")).resolves.toContainEqual(
      expect.objectContaining({
        id: "history-transform",
        type: "transformed",
        details: { action: "transform", from: "unfinished", relatedExhibitId: "target", to: "transformed" },
      }),
    );
    await expect(repository.getExhibit("target")).resolves.toMatchObject({
      relatedExhibitIds: ["source"],
    });
  });

  it("creates a related Exhibit and transforms the source with reciprocal links in one ceremony", async () => {
    const repository = createRepository("almost-museum-transform-new", [
      "source",
      "history-source",
      "target",
      "history-target",
      "history-transform",
      "history-target-linked",
    ]);
    await repository.createExhibit({
      title: "First Harbor Route",
      type: "idea",
      status: "unfinished",
      museumLabel: "The path before it found a form",
    });

    const transformed = await repository.transformExhibitToNew("source", {
      title: "Second Harbor Route",
      type: "project",
      museumLabel: "The route ready to be built",
    }, "2026-08-24T00:00:00.000Z");

    expect(transformed).toMatchObject({
      status: "transformed",
      relatedExhibitIds: ["target"],
      closedAt: "2026-08-24T00:00:00.000Z",
    });
    await expect(repository.getExhibit("target")).resolves.toMatchObject({
      title: "Second Harbor Route",
      status: "unfinished",
      relatedExhibitIds: ["source"],
    });
    await expect(repository.getHistory("source")).resolves.toContainEqual(
      expect.objectContaining({
        id: "history-transform",
        type: "transformed",
        details: { action: "transform", from: "unfinished", relatedExhibitId: "target", to: "transformed" },
      }),
    );
    await expect(repository.getHistory("target")).resolves.toContainEqual(
      expect.objectContaining({
        id: "history-target-linked",
        type: "edited",
        details: { fields: ["relatedExhibitIds"] },
      }),
    );
  });

  it("rejects transforming an Exhibit into itself without changing its record", async () => {
    const repository = createRepository("almost-museum-transform-self", ["source", "history-source"]);
    await repository.createExhibit({
      title: "Source",
      type: "idea",
      status: "unfinished",
      museumLabel: "The first shape",
    });

    await expect(repository.transformExhibit("source", "source", "2026-08-24T00:00:00.000Z"))
      .rejects.toThrow("An Exhibit cannot transform into itself");
    await expect(repository.getExhibit("source")).resolves.toMatchObject({
      status: "unfinished",
      relatedExhibitIds: [],
      closedAt: null,
    });
  });

  it("persists exhibits, artifacts, and history across a database reopen", async () => {
    const first = createRepository("almost-museum-reopen", [
      "exhibit-1",
      "history-created",
      "artifact-1",
      "history-added",
    ]);
    await first.createExhibit({
      title: "Persistent Exhibit",
      type: "experiment",
      status: "unfinished",
      museumLabel: "Still here",
    });
    await first.addArtifact("exhibit-1", {
      kind: "note",
      label: "Observation",
      note: "  Keep this thought.  ",
    });
    first.close();

    const reopened = createRepository("almost-museum-reopen", []);

    await expect(reopened.getExhibit("exhibit-1")).resolves.toMatchObject({ title: "Persistent Exhibit" });
    await expect(reopened.listArtifacts("exhibit-1")).resolves.toEqual([
      expect.objectContaining({ id: "artifact-1", note: "Keep this thought." }),
    ]);
    await expect(reopened.getHistory("exhibit-1")).resolves.toHaveLength(2);
  });

  it("rolls back an Exhibit update when its history write fails", async () => {
    const repository = createRepository("almost-museum-rollback", [
      "exhibit-1",
      "duplicate-history-id",
      "duplicate-history-id",
    ]);
    const original = await repository.createExhibit({
      title: "Original title",
      type: "draft",
      status: "unfinished",
      museumLabel: "Original label",
    });

    await expect(repository.updateExhibit("exhibit-1", { title: "Must roll back" })).rejects.toThrow();

    await expect(repository.getExhibit("exhibit-1")).resolves.toEqual(original);
    await expect(repository.getHistory("exhibit-1")).resolves.toHaveLength(1);
  });

  it("rolls back Exhibit creation when its history write fails", async () => {
    const repository = createRepository("almost-museum-create-rollback", [
      "exhibit-1",
      "duplicate-history-id",
      "exhibit-2",
      "duplicate-history-id",
    ]);
    await repository.createExhibit({
      title: "Existing Exhibit",
      type: "draft",
      status: "unfinished",
      museumLabel: "Existing label",
    });

    await expect(repository.createExhibit({
      title: "Rolled-back Exhibit",
      type: "idea",
      status: "active",
      museumLabel: "Must not survive",
    })).rejects.toThrow();

    await expect(repository.getExhibit("exhibit-2")).resolves.toBeUndefined();
    await expect(repository.listExhibits()).resolves.toHaveLength(1);
  });

  it("rolls back artifact removal when its history write fails", async () => {
    const repository = createRepository("almost-museum-artifact-rollback", [
      "exhibit-1",
      "history-created",
      "artifact-1",
      "duplicate-history-id",
      "duplicate-history-id",
    ]);
    await repository.createExhibit({
      title: "Artifact Exhibit",
      type: "experiment",
      status: "unfinished",
      museumLabel: "Evidence stays intact",
    });
    await repository.addArtifact("exhibit-1", {
      kind: "note",
      label: "Evidence",
      note: "Keep this when deletion fails.",
    });

    await expect(repository.removeArtifact("artifact-1")).rejects.toThrow();

    await expect(repository.listArtifacts("exhibit-1")).resolves.toEqual([
      expect.objectContaining({ id: "artifact-1" }),
    ]);
    await expect(repository.getHistory("exhibit-1")).resolves.toHaveLength(2);
  });

  it("rolls back status and transform relationship writes when history cannot append", async () => {
    const statusRepository = createRepository("almost-museum-status-rollback", [
      "exhibit-1",
      "duplicate-history-id",
      "duplicate-history-id",
    ]);
    await statusRepository.createExhibit({
      title: "Status Exhibit",
      type: "project",
      status: "active",
      museumLabel: "Keep active",
    });

    await expect(statusRepository.transitionExhibit("exhibit-1", {
      action: "archive",
      occurredAt: "2026-08-24T00:00:00.000Z",
    })).rejects.toThrow();
    await expect(statusRepository.getExhibit("exhibit-1")).resolves.toMatchObject({
      status: "active",
      closedAt: null,
    });

    const transformRepository = createRepository("almost-museum-transform-rollback", [
      "source",
      "duplicate-source-history",
      "target",
      "target-history",
      "duplicate-source-history",
    ]);
    await transformRepository.createExhibit({
      title: "Source",
      type: "idea",
      status: "unfinished",
      museumLabel: "Keep the first shape",
    });
    await transformRepository.createExhibit({
      title: "Target",
      type: "project",
      status: "active",
      museumLabel: "A possible next shape",
    });

    await expect(transformRepository.transformExhibit(
      "source",
      "target",
      "2026-08-24T00:00:00.000Z",
    )).rejects.toThrow();
    await expect(transformRepository.getExhibit("source")).resolves.toMatchObject({
      status: "unfinished",
      relatedExhibitIds: [],
      closedAt: null,
    });
  });

  it("reports missing records without creating recovery writes", async () => {
    const repository = createRepository("almost-museum-missing", []);

    await expect(repository.updateExhibit("missing", { title: "No record" })).rejects.toThrow(
      'Exhibit "missing" was not found',
    );
    await expect(repository.removeArtifact("missing-artifact")).rejects.toThrow(
      'Artifact "missing-artifact" was not found',
    );
    await expect(repository.getSnapshot()).resolves.toEqual({ exhibits: [], artifacts: [], history: [] });
  });

  it("erases all three collections in one clear-all operation", async () => {
    const repository = createRepository("almost-museum-erase", [
      "exhibit-1",
      "history-created",
      "artifact-1",
      "history-added",
    ]);
    await repository.createExhibit({
      title: "Temporary Exhibit",
      type: "message",
      status: "unfinished",
      museumLabel: "For now",
    });
    await repository.addArtifact("exhibit-1", {
      kind: "link",
      label: "Reference",
      url: "https://example.com/reference",
    });

    await repository.eraseAll();

    await expect(repository.getSnapshot()).resolves.toEqual({ exhibits: [], artifacts: [], history: [] });
  });
});

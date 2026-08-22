import {
  artifactSchema,
  backupEnvelopeV1Schema,
  createExhibitInputSchema,
  exhibitSchema,
  exhibitTypeSchema,
  historyEventSchema,
  statusTransitionSchema,
  updateExhibitInputSchema,
  type ArtifactKind,
  type ClosureAction,
  type Exhibit,
  type ExhibitStatus,
  type ExhibitType,
  type HistoryEvent,
} from "@/lib/domain";
import { describe, expect, it } from "vitest";

const exhibit: Exhibit = {
  id: "exhibit-1",
  title: "Harbor Queue Redesign",
  type: "project",
  status: "active",
  museumLabel: "A clearer way through the harbor",
  whyStarted: "Operators needed calmer handoffs.",
  whyStopped: "The pilot window closed.",
  whatItTaughtMe: "Visible queues reduce coordination cost.",
  tags: ["Product Design", "Harbor"],
  relatedExhibitIds: [],
  createdAt: "2026-08-23T01:00:00.000Z",
  updatedAt: "2026-08-23T01:00:00.000Z",
  closedAt: null,
};

describe("canonical Exhibit domain contracts", () => {
  it("keeps the approved union members available to consumers", () => {
    const exhibitTypes: ExhibitType[] = ["project", "draft", "idea", "experiment", "message"];
    const exhibitStatuses: ExhibitStatus[] = [
      "unfinished",
      "active",
      "revived",
      "archived",
      "completed",
      "transformed",
      "released",
    ];
    const artifactKinds: ArtifactKind[] = ["image", "pdf", "audio", "link", "note"];
    const closureActions: ClosureAction[] = ["revive", "archive", "complete", "transform", "release"];

    expect(exhibitTypes).toHaveLength(5);
    expect(exhibitStatuses).toHaveLength(7);
    expect(artifactKinds).toHaveLength(5);
    expect(closureActions).toHaveLength(5);
  });

  it("accepts draft as an Exhibit type and reserves active for Exhibit status", () => {
    expect(exhibitTypeSchema.parse("draft")).toBe("draft");
    expect(() => exhibitTypeSchema.parse("active")).toThrow();
  });

  it("normalizes canonical Exhibit fields at the validation boundary", () => {
    const parsed = exhibitSchema.parse({
      ...exhibit,
      id: "  Exhibit-1  ",
      title: "  Harbor   Queue Redesign  ",
      tags: ["  Product   Design ", "product design", " HARBOR ", ""],
      relatedExhibitIds: [" target-1 ", "target-1"],
      createdAt: "2026-08-23T09:00:00+08:00",
    });

    expect(parsed).toMatchObject({
      id: "Exhibit-1",
      title: "Harbor Queue Redesign",
      tags: ["Product Design", "HARBOR"],
      relatedExhibitIds: ["target-1"],
      createdAt: "2026-08-23T01:00:00.000Z",
    });
  });

  it("rejects malformed canonical Exhibit records", () => {
    expect(() => exhibitSchema.parse({ ...exhibit, id: "   " })).toThrow();
    expect(() => exhibitSchema.parse({ ...exhibit, createdAt: "not-a-date" })).toThrow();
    expect(() => exhibitSchema.parse({ ...exhibit, status: "deleted" })).toThrow();
  });

  it("validates and normalizes create input without accepting persistence fields", () => {
    const parsed = createExhibitInputSchema.parse({
      title: "  A   small idea ",
      type: "idea",
      status: "unfinished",
      museumLabel: "  First   sketch ",
      tags: [" Sketch ", "sketch"],
      relatedExhibitIds: [" related-1 "],
    });

    expect(parsed).toEqual({
      title: "A small idea",
      type: "idea",
      status: "unfinished",
      museumLabel: "First sketch",
      tags: ["Sketch"],
      relatedExhibitIds: ["related-1"],
    });
    expect(() => createExhibitInputSchema.parse({ ...parsed, id: "not-allowed" })).toThrow();
  });

  it("requires update input to contain at least one editable field", () => {
    expect(updateExhibitInputSchema.parse({ tags: [" New ", "new"] })).toEqual({ tags: ["New"] });
    expect(() => updateExhibitInputSchema.parse({})).toThrow();
    expect(() => updateExhibitInputSchema.parse({ status: "archived" })).toThrow();
  });

  it("validates each Artifact kind and rejects incompatible payloads", () => {
    const common = {
      id: "artifact-1",
      exhibitId: "exhibit-1",
      label: "  First sketch ",
      createdAt: "2026-08-23T01:00:00.000Z",
    };

    expect(artifactSchema.parse({ ...common, kind: "link", url: "https://example.com/sketch" })).toMatchObject({
      label: "First sketch",
      kind: "link",
    });
    expect(artifactSchema.parse({ ...common, kind: "note", note: "  Keep the rough edges.  " })).toMatchObject({
      note: "Keep the rough edges.",
      kind: "note",
    });
    expect(() => artifactSchema.parse({ ...common, kind: "link", note: "not a URL" })).toThrow();
    expect(() => artifactSchema.parse({ ...common, kind: "image", fileName: "sketch.png", byteSize: -1 })).toThrow();
  });

  it("preserves paragraph breaks and intentional whitespace in reflective fields and notes", () => {
    const whyStarted = "  First paragraph.\n\n  Second paragraph.  ";
    const parsedExhibit = createExhibitInputSchema.parse({
      title: "A small idea",
      type: "idea",
      status: "unfinished",
      museumLabel: "First sketch",
      whyStarted,
    });
    const parsedNote = artifactSchema.parse({
      id: "artifact-1",
      exhibitId: "exhibit-1",
      kind: "note",
      label: "Working notes",
      note: "  Keep the rough edges.\n\n    Revisit the ending.  ",
      createdAt: "2026-08-23T01:00:00.000Z",
    });

    expect(parsedExhibit.whyStarted).toBe("First paragraph.\n\n  Second paragraph.");
    expect(parsedNote).toMatchObject({
      kind: "note",
      note: "Keep the rough edges.\n\n    Revisit the ending.",
    });
  });

  it("validates HistoryEvent records while retaining structured details", () => {
    const event: HistoryEvent = historyEventSchema.parse({
      id: " event-1 ",
      exhibitId: " exhibit-1 ",
      type: "edited",
      occurredAt: "2026-08-23T09:30:00+08:00",
      summary: "  Refined   the museum label. ",
      details: { fields: ["museumLabel"] },
    });

    expect(event).toEqual({
      id: "event-1",
      exhibitId: "exhibit-1",
      type: "edited",
      occurredAt: "2026-08-23T01:30:00.000Z",
      summary: "Refined the museum label.",
      details: { fields: ["museumLabel"] },
    });
  });

  it("accepts only the version-one Almost Museum backup envelope", () => {
    const history = historyEventSchema.parse({
      id: "event-1",
      exhibitId: "exhibit-1",
      type: "created",
      occurredAt: exhibit.createdAt,
      summary: "Exhibit entered the collection.",
      details: {},
    });
    const backup = {
      format: "almost-museum",
      version: 1,
      exportedAt: "2026-08-23T10:00:00+08:00",
      exhibits: [exhibit],
      artifacts: [],
      history: [history],
    };

    expect(backupEnvelopeV1Schema.parse(backup).exportedAt).toBe("2026-08-23T02:00:00.000Z");
    expect(() => backupEnvelopeV1Schema.parse({ ...backup, version: 2 })).toThrow();
    expect(() => backupEnvelopeV1Schema.parse({ ...backup, format: "another-app" })).toThrow();
  });

  it("validates normalized status transition commands", () => {
    expect(statusTransitionSchema.parse({
      exhibitId: " exhibit-1 ",
      action: "transform",
      occurredAt: "2026-08-23T10:00:00+08:00",
      relatedExhibitId: " target-1 ",
    })).toEqual({
      exhibitId: "exhibit-1",
      action: "transform",
      occurredAt: "2026-08-23T02:00:00.000Z",
      relatedExhibitId: "target-1",
    });
    expect(() => statusTransitionSchema.parse({
      exhibitId: "exhibit-1",
      action: "transform",
      occurredAt: exhibit.createdAt,
    })).toThrow();
  });
});

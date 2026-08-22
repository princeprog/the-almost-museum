import {
  applyClosureAction,
  canApplyClosureAction,
  createHistoryEvent,
  getExhibitRooms,
  type ClosureAction,
  type Exhibit,
  type ExhibitStatus,
} from "@/lib/domain";
import { describe, expect, it } from "vitest";

function buildExhibit(status: ExhibitStatus, closedAt: string | null = null): Exhibit {
  return {
    id: "exhibit-1",
    title: "Harbor Queue Redesign",
    type: "project",
    status,
    museumLabel: "A clearer way through the harbor",
    tags: ["Product Design"],
    relatedExhibitIds: [],
    createdAt: "2026-08-23T01:00:00.000Z",
    updatedAt: "2026-08-23T01:00:00.000Z",
    closedAt,
  };
}

describe("room membership", () => {
  it.each([
    ["unfinished", ["workshop"]],
    ["active", ["workshop"]],
    ["revived", ["workshop", "hall-of-second-chances"]],
    ["archived", ["archive"]],
    ["completed", ["archive"]],
    ["released", ["archive"]],
    ["transformed", ["hall-of-second-chances"]],
  ] satisfies Array<[ExhibitStatus, string[]]>)('maps "%s" to its curated rooms', (status, expected) => {
    expect(getExhibitRooms(buildExhibit(status))).toEqual(expected);
  });
});

describe("closure eligibility", () => {
  const eligibleActions: Record<ExhibitStatus, ClosureAction[]> = {
    unfinished: ["archive", "complete", "transform", "release"],
    active: ["archive", "complete", "transform", "release"],
    revived: ["archive", "complete", "transform", "release"],
    archived: ["revive", "release"],
    completed: ["revive", "release"],
    transformed: ["revive", "release"],
    released: ["revive"],
  };

  it.each(Object.entries(eligibleActions) as Array<[ExhibitStatus, ClosureAction[]]>)
    ("allows only the approved actions from %s", (status, allowed) => {
      const allActions: ClosureAction[] = ["revive", "archive", "complete", "transform", "release"];
      expect(allActions.filter((action) => canApplyClosureAction(buildExhibit(status), action))).toEqual(allowed);
    });
});

describe("closure transitions", () => {
  const occurredAt = "2026-08-23T10:00:00+08:00";

  it.each([
    ["archive", "archived"],
    ["complete", "completed"],
    ["release", "released"],
  ] satisfies Array<[ClosureAction, ExhibitStatus]>)
    ("applies %s and records its normalized closure timestamp", (action, expectedStatus) => {
      const result = applyClosureAction(buildExhibit("active"), {
        action,
        occurredAt,
        confirmed: action === "release",
      });

      expect(result).toMatchObject({
        status: expectedStatus,
        updatedAt: "2026-08-23T02:00:00.000Z",
        closedAt: "2026-08-23T02:00:00.000Z",
      });
    });

  it("revives a closed Exhibit and clears closedAt", () => {
    const result = applyClosureAction(buildExhibit("archived", "2026-08-22T00:00:00.000Z"), {
      action: "revive",
      occurredAt,
    });

    expect(result).toMatchObject({
      status: "revived",
      updatedAt: "2026-08-23T02:00:00.000Z",
      closedAt: null,
    });
  });

  it("transforms an Exhibit and links the normalized target exactly once", () => {
    const result = applyClosureAction(buildExhibit("unfinished"), {
      action: "transform",
      occurredAt,
      relatedExhibitId: " target-1 ",
    });

    expect(result).toMatchObject({
      status: "transformed",
      relatedExhibitIds: ["target-1"],
      closedAt: "2026-08-23T02:00:00.000Z",
    });
  });

  it("rejects invalid, unconfirmed, and incomplete transitions without mutating the Exhibit", () => {
    const exhibit = buildExhibit("archived", "2026-08-22T00:00:00.000Z");

    expect(() => applyClosureAction(exhibit, { action: "complete", occurredAt })).toThrow(
      'Cannot apply "complete" to an Exhibit with status "archived"',
    );
    expect(() => applyClosureAction(exhibit, { action: "release", occurredAt })).toThrow(
      "Release requires confirmation",
    );
    expect(() => applyClosureAction(buildExhibit("active"), { action: "transform", occurredAt })).toThrow(
      "Transform requires a related Exhibit ID",
    );
    expect(exhibit).toEqual(buildExhibit("archived", "2026-08-22T00:00:00.000Z"));
  });
});

describe("history event creation", () => {
  it("creates a normalized immutable history record from supplied identity and time", () => {
    const details = { from: "active", to: "archived" };
    const event = createHistoryEvent({
      id: " event-1 ",
      exhibitId: " exhibit-1 ",
      type: "status-changed",
      occurredAt: "2026-08-23T10:00:00+08:00",
      summary: "  Moved   to Archive. ",
      details,
    });

    details.to = "released";
    expect(event).toEqual({
      id: "event-1",
      exhibitId: "exhibit-1",
      type: "status-changed",
      occurredAt: "2026-08-23T02:00:00.000Z",
      summary: "Moved to Archive.",
      details: { from: "active", to: "archived" },
    });
    expect(Object.isFrozen(event)).toBe(true);
    expect(Object.isFrozen(event.details)).toBe(true);
  });
});

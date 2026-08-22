import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { AlmostTimeline } from "@/components/almost-timeline";
import type { HistoryEvent } from "@/lib/domain";

const events: HistoryEvent[] = [
  {
    id: "closed",
    exhibitId: "exhibit-1",
    type: "status-changed",
    occurredAt: "2026-08-23T13:00:00.000Z",
    summary: "Changed Exhibit status.",
    details: { action: "archive", from: "active", to: "archived" },
  },
  {
    id: "transformed",
    exhibitId: "exhibit-1",
    type: "transformed",
    occurredAt: "2026-08-23T12:00:00.000Z",
    summary: "Transformed into a related Exhibit.",
    details: { from: "active", to: "transformed", relatedExhibitId: "exhibit-2" },
  },
  {
    id: "artifact",
    exhibitId: "exhibit-1",
    type: "artifact-added",
    occurredAt: "2026-08-23T11:00:00.000Z",
    summary: "Added an artifact.",
    details: { artifactId: "artifact-1", kind: "link" },
  },
  {
    id: "edited",
    exhibitId: "exhibit-1",
    type: "edited",
    occurredAt: "2026-08-23T10:00:00.000Z",
    summary: "Updated Exhibit details.",
    details: { fields: ["museumLabel", "tags"] },
  },
  {
    id: "created",
    exhibitId: "exhibit-1",
    type: "created",
    occurredAt: "2026-08-23T09:00:00.000Z",
    summary: "Created Exhibit.",
    details: { status: "active", type: "project" },
  },
];

describe("AlmostTimeline", () => {
  it("presents creation, edits, artifacts, transformations, and closure events in chronological museum language", () => {
    render(<AlmostTimeline history={events} />);

    expect(screen.getByRole("heading", { name: "The Almost timeline" })).toBeVisible();
    expect(screen.getByText("This Exhibit entered the collection as an active Project.")).toBeVisible();
    expect(screen.getByText("Catalog details were revised: Museum label and tags.")).toBeVisible();
    expect(screen.getByText("A link artifact was added to the collection.")).toBeVisible();
    expect(screen.getByText("This Exhibit was transformed into a related Exhibit.")).toBeVisible();
    expect(screen.getByText("Related Exhibit: exhibit-2.")).toBeVisible();
    expect(screen.getByText("This Exhibit was archived.")).toBeVisible();
    expect(screen.getByText("From active to archived.")).toBeVisible();

    const entries = screen.getAllByRole("listitem");
    expect(entries.map((entry) => entry.textContent)).toEqual(expect.arrayContaining([
      expect.stringContaining("This Exhibit entered the collection"),
      expect.stringContaining("Catalog details were revised"),
      expect.stringContaining("A link artifact was added"),
      expect.stringContaining("This Exhibit was transformed"),
      expect.stringContaining("This Exhibit was archived"),
    ]));
    expect(entries[0]).toHaveTextContent("This Exhibit entered the collection");
    expect(entries[4]).toHaveTextContent("This Exhibit was archived");
  });

  it("gives the exhibit a clear loading, empty, and unavailable timeline state", () => {
    const { rerender } = render(<AlmostTimeline isLoading />);
    expect(screen.getByRole("status")).toHaveTextContent("Opening the timeline…");

    rerender(<AlmostTimeline history={[]} />);
    expect(screen.getByText("This Exhibit has not recorded an event yet.")).toBeVisible();

    rerender(<AlmostTimeline error />);
    expect(screen.getByRole("heading", { name: "The timeline is unavailable" })).toBeVisible();
    expect(screen.getByText("The rest of this Exhibit is still here; try opening it again for its record.")).toBeVisible();
  });
});

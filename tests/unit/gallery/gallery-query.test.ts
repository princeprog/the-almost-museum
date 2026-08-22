import { describe, expect, it } from "vitest";

import type { Exhibit } from "@/lib/domain";
import { filterAndSortExhibits } from "@/lib/gallery";

const exhibits: Exhibit[] = [
  {
    id: "unfinished-harbor",
    title: "Harbor Queue Redesign",
    type: "project",
    status: "unfinished",
    museumLabel: "A quieter route through the harbor",
    tags: ["Harbor", "Service Design"],
    relatedExhibitIds: [],
    createdAt: "2026-08-20T10:00:00.000Z",
    updatedAt: "2026-08-20T10:00:00.000Z",
    closedAt: null,
  },
  {
    id: "revived-notes",
    title: "Unsent field notes",
    type: "message",
    status: "revived",
    museumLabel: "A letter worth returning to",
    tags: ["Writing", "Harbor"],
    relatedExhibitIds: [],
    createdAt: "2026-08-21T10:00:00.000Z",
    updatedAt: "2026-08-22T10:00:00.000Z",
    closedAt: null,
  },
  {
    id: "archived-map",
    title: "Old wayfinding map",
    type: "draft",
    status: "archived",
    museumLabel: "A map that made room for another route",
    tags: ["Mapping"],
    relatedExhibitIds: [],
    createdAt: "2026-08-19T10:00:00.000Z",
    updatedAt: "2026-08-23T10:00:00.000Z",
    closedAt: "2026-08-23T10:00:00.000Z",
  },
];

describe("filterAndSortExhibits", () => {
  it("keeps only matching room, status, tag, and search records before sorting newest first", () => {
    expect(filterAndSortExhibits(exhibits, {
      room: "workshop",
      type: "all",
      status: "revived",
      tag: "harbor",
      query: "letter",
      sort: "updated-desc",
    })).toEqual([exhibits[1]]);
  });

  it("orders a Lobby search by title when requested", () => {
    expect(filterAndSortExhibits(exhibits, {
      room: "lobby",
      type: "all",
      status: "all",
      tag: "all",
      query: "",
      sort: "title-asc",
    }).map(({ title }) => title)).toEqual([
      "Harbor Queue Redesign",
      "Old wayfinding map",
      "Unsent field notes",
    ]);
  });
});

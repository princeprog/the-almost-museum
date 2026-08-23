import { normalizeId, normalizeTags, normalizeTimestamp } from "@/lib/domain";
import { describe, expect, it } from "vitest";

describe("domain normalization", () => {
  it("trims IDs without changing their case", () => {
    expect(normalizeId("  Exhibit-A1  ")).toBe("Exhibit-A1");
    expect(() => normalizeId("   ")).toThrow("ID must not be empty");
  });

  it("normalizes tags and removes case-insensitive duplicates in first-seen order", () => {
    expect(normalizeTags(["  Product   Design ", "product design", " HARBOR ", "", "harbor"])).toEqual([
      "Product Design",
      "HARBOR",
    ]);
  });

  it("normalizes valid timestamps to UTC ISO strings and rejects invalid values", () => {
    expect(normalizeTimestamp("2026-08-23T10:30:00+08:00")).toBe("2026-08-23T02:30:00.000Z");
    expect(normalizeTimestamp(new Date("2026-08-23T02:30:00.000Z"))).toBe("2026-08-23T02:30:00.000Z");
    expect(() => normalizeTimestamp("tomorrow-ish")).toThrow("Invalid timestamp");
  });
});

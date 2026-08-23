import { describe, expect, it } from "vitest";

import { getStorageQuotaWarning } from "@/lib/artifacts/storage-quota";

describe("getStorageQuotaWarning", () => {
  it("warns when adding a file would use at least 80 percent of the browser quota", () => {
    expect(getStorageQuotaWarning({ quota: 1_000, usage: 700 }, 100)).toBe(
      "Your collection is approaching this browser's local storage limit.",
    );
  });

  it("warns when a file is larger than the remaining browser storage estimate", () => {
    expect(getStorageQuotaWarning({ quota: 1_000, usage: 950 }, 100)).toBe(
      "This file may not fit in this browser's local collection.",
    );
  });

  it("stays quiet when storage cannot be estimated or has ample room", () => {
    expect(getStorageQuotaWarning({}, 100)).toBeUndefined();
    expect(getStorageQuotaWarning({ quota: 1_000, usage: 100 }, 100)).toBeUndefined();
  });
});

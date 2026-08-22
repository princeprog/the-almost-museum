import { describe, expect, it, vi } from "vitest";

import {
  getStorageStatus,
  requestPersistentStorage,
  type BrowserStorage,
} from "@/lib/browser/storage-status";

describe("browser storage status", () => {
  it("reports a readable quota estimate and a non-persistent recovery warning", async () => {
    const storage: BrowserStorage = {
      estimate: vi.fn().mockResolvedValue({ quota: 2_048, usage: 1_536 }),
      persisted: vi.fn().mockResolvedValue(false),
    };

    await expect(getStorageStatus(storage)).resolves.toEqual({
      estimate: "1.5 KiB used of 2 KiB",
      persistence: "not-persistent",
    });
  });

  it("marks persistent storage as unavailable when the browser does not support the request", async () => {
    await expect(getStorageStatus({ estimate: vi.fn().mockResolvedValue({}) })).resolves.toEqual({
      estimate: undefined,
      persistence: "unavailable",
    });
  });

  it("returns whether the browser granted the persistence request without writing collection data", async () => {
    const persist = vi.fn().mockResolvedValue(true);

    await expect(requestPersistentStorage({ persist })).resolves.toBe(true);
    expect(persist).toHaveBeenCalledOnce();
  });
});

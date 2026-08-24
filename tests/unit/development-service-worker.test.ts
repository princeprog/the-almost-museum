import { describe, expect, it, vi } from "vitest";

import { GET } from "@/app/sw.js/route";

describe("development service worker reset", () => {
  it("unregisters a stale worker, clears its caches, and reloads controlled pages", async () => {
    const response = GET();
    const source = await response.text();
    const listeners = new Map<string, (event: { waitUntil: (task: Promise<unknown>) => void }) => void>();
    const skipWaiting = vi.fn().mockResolvedValue(undefined);
    const unregister = vi.fn().mockResolvedValue(true);
    const navigate = vi.fn().mockResolvedValue(undefined);
    const deleteCache = vi.fn().mockResolvedValue(true);
    const client = { navigate, url: "http://localhost:3000/settings" };
    const worker = {
      addEventListener: vi.fn((type: string, listener: (event: { waitUntil: (task: Promise<unknown>) => void }) => void) => {
        listeners.set(type, listener);
      }),
      clients: { matchAll: vi.fn().mockResolvedValue([client]) },
      registration: { unregister },
      skipWaiting,
    };
    const cacheStorage = {
      delete: deleteCache,
      keys: vi.fn().mockResolvedValue(["old-shell", "old-assets"]),
    };

    new Function("self", "caches", source)(worker, cacheStorage);

    let installTask: Promise<unknown> = Promise.resolve();
    listeners.get("install")?.({ waitUntil: (task) => { installTask = task; } });
    await installTask;

    let activateTask: Promise<unknown> = Promise.resolve();
    listeners.get("activate")?.({ waitUntil: (task) => { activateTask = task; } });
    await activateTask;

    expect(response.headers.get("cache-control")).toBe("no-store, max-age=0");
    expect(skipWaiting).toHaveBeenCalledOnce();
    expect(unregister).toHaveBeenCalledOnce();
    expect(deleteCache).toHaveBeenCalledTimes(2);
    expect(navigate).toHaveBeenCalledWith("http://localhost:3000/settings");
  });
});

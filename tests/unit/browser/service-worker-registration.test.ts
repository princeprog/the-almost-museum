import { describe, expect, it, vi } from "vitest";

import {
  registerMuseumServiceWorker,
  shouldRegisterMuseumServiceWorker,
} from "@/lib/browser/service-worker-registration";

describe("service-worker registration", () => {
  it("only enables registration for production browsers with service-worker support", () => {
    expect(shouldRegisterMuseumServiceWorker("development", { serviceWorker: {} })).toBe(false);
    expect(shouldRegisterMuseumServiceWorker("production", {})).toBe(false);
    expect(shouldRegisterMuseumServiceWorker("production", { serviceWorker: {} })).toBe(true);
  });

  it("reports a waiting worker and registers at the application root", async () => {
    const onUpdate = vi.fn();
    const register = vi.fn().mockResolvedValue({ waiting: {} });

    await registerMuseumServiceWorker({ controller: {}, register }, onUpdate);

    expect(register).toHaveBeenCalledWith("/sw.js", { scope: "/" });
    expect(onUpdate).toHaveBeenCalledOnce();
  });

  it("does not announce an update for an initial worker installation", async () => {
    const onUpdate = vi.fn();
    const register = vi.fn().mockResolvedValue({ waiting: null });

    await registerMuseumServiceWorker({ controller: null, register }, onUpdate);

    expect(onUpdate).not.toHaveBeenCalled();
  });
});

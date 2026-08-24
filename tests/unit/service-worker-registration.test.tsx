import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ServiceWorkerRegistration } from "@/components/service-worker-registration";

const originalServiceWorker = Object.getOwnPropertyDescriptor(navigator, "serviceWorker");

afterEach(() => {
  vi.unstubAllEnvs();
  if (originalServiceWorker) {
    Object.defineProperty(navigator, "serviceWorker", originalServiceWorker);
  } else {
    Reflect.deleteProperty(navigator, "serviceWorker");
  }
});

describe("ServiceWorkerRegistration", () => {
  it("clears retained production workers when the app runs locally", async () => {
    const unregister = vi.fn().mockResolvedValue(true);
    const getRegistrations = vi.fn().mockResolvedValue([{ unregister }]);

    Object.defineProperty(navigator, "serviceWorker", {
      configurable: true,
      value: { controller: null, getRegistrations },
    });

    render(<ServiceWorkerRegistration />);

    await waitFor(() => expect(unregister).toHaveBeenCalledOnce());
  });

  it("presents a waiting production update through a shadcn alert", async () => {
    vi.stubEnv("NODE_ENV", "production");
    const register = vi.fn().mockResolvedValue({ waiting: {} });

    Object.defineProperty(navigator, "serviceWorker", {
      configurable: true,
      value: { controller: {}, register },
    });

    render(<ServiceWorkerRegistration />);

    expect(await screen.findByRole("status")).toHaveAttribute("data-slot", "alert");
    expect(screen.getByRole("button", { name: "Refresh to update" })).toBeVisible();
  });
});

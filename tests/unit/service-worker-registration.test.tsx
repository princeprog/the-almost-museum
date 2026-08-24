import { render, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ServiceWorkerRegistration } from "@/components/service-worker-registration";

const originalServiceWorker = Object.getOwnPropertyDescriptor(navigator, "serviceWorker");

afterEach(() => {
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
});

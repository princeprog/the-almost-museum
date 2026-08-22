export interface MuseumServiceWorkerRegistration {
  addEventListener?: (type: "updatefound", listener: () => void) => void;
  installing?: {
    addEventListener: (type: "statechange", listener: () => void) => void;
    state: string;
  } | null;
  waiting?: unknown;
}

export interface MuseumServiceWorkerContainer {
  controller: unknown;
  register: (scriptURL: string, options: { scope: string }) => Promise<MuseumServiceWorkerRegistration>;
}

export interface MuseumServiceWorkerNavigator {
  serviceWorker?: unknown;
}

/** Prevents local development from retaining an app cache or registering a production worker. */
export function shouldRegisterMuseumServiceWorker(environment: string, browser: MuseumServiceWorkerNavigator): boolean {
  return environment === "production" && browser.serviceWorker !== undefined;
}

/** Registers the exported worker and lets the application announce a waiting update. */
export async function registerMuseumServiceWorker(
  serviceWorker: MuseumServiceWorkerContainer,
  onUpdate: () => void,
): Promise<void> {
  const registration = await serviceWorker.register("/sw.js", { scope: "/" });

  if (registration.waiting !== null && registration.waiting !== undefined) onUpdate();

  registration.addEventListener?.("updatefound", () => {
    const installing = registration.installing;
    if (installing === null || installing === undefined) return;

    installing.addEventListener("statechange", () => {
      if (installing.state === "installed" && serviceWorker.controller !== null) onUpdate();
    });
  });
}

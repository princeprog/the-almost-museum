"use client";

import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  registerMuseumServiceWorker,
  shouldRegisterMuseumServiceWorker,
} from "@/lib/browser/service-worker-registration";

/** Registers the worker only in production and gives people control over adopting a new shell. */
export function ServiceWorkerRegistration() {
  const [isUpdateAvailable, setUpdateAvailable] = useState(false);

  useEffect(() => {
    if (!shouldRegisterMuseumServiceWorker(process.env.NODE_ENV, navigator)) return;

    void registerMuseumServiceWorker(navigator.serviceWorker, () => setUpdateAvailable(true));
  }, []);

  if (!isUpdateAvailable) return null;

  return (
    <aside aria-live="polite" className="service-worker-update" role="status">
      <p>A new version of Almost Museum is ready.</p>
      <Button onClick={() => window.location.reload()} variant="secondary">
        Refresh to update
      </Button>
    </aside>
  );
}

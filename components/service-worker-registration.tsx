"use client";

import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Alert, AlertAction, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  registerMuseumServiceWorker,
  shouldRegisterMuseumServiceWorker,
  unregisterMuseumServiceWorkers,
} from "@/lib/browser/service-worker-registration";

/** Registers the worker only in production and gives people control over adopting a new shell. */
export function ServiceWorkerRegistration() {
  const [isUpdateAvailable, setUpdateAvailable] = useState(false);

  useEffect(() => {
    if (navigator.serviceWorker === undefined) return;
    if (process.env.NODE_ENV !== "production") {
      void unregisterMuseumServiceWorkers(navigator.serviceWorker);
      return;
    }
    if (!shouldRegisterMuseumServiceWorker(process.env.NODE_ENV, navigator)) return;

    void registerMuseumServiceWorker(navigator.serviceWorker, () => setUpdateAvailable(true));
  }, []);

  if (!isUpdateAvailable) return null;

  return (
    <Alert aria-live="polite" className="fixed right-4 bottom-4 z-50 max-w-sm shadow-lg" role="status">
      <AlertTitle>Update ready</AlertTitle>
      <AlertDescription>A new version of Almost Museum is ready.</AlertDescription>
      <AlertAction>
      <Button className="min-h-11 sm:min-h-8" onClick={() => window.location.reload()} variant="secondary">
        Refresh to update
      </Button>
      </AlertAction>
    </Alert>
  );
}

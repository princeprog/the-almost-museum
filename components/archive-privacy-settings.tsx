"use client";

import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  getStorageStatus,
  requestPersistentStorage,
  type BrowserStorage,
  type StorageStatus,
} from "@/lib/browser/storage-status";
import { ExhibitRepository } from "@/lib/persistence";

function getBrowserStorage(): BrowserStorage | undefined {
  if (typeof navigator === "undefined") return undefined;
  return navigator.storage;
}

export interface ArchivePrivacySettingsProps {
  repository?: Pick<ExhibitRepository, "close" | "eraseAll">;
  storage?: BrowserStorage;
}

/** Reports browser storage capabilities and confines destructive collection actions to the canonical repository. */
export function ArchivePrivacySettings({ repository: suppliedRepository, storage: suppliedStorage }: Readonly<ArchivePrivacySettingsProps>) {
  const [repository] = useState(() => suppliedRepository ?? new ExhibitRepository());
  const [storage] = useState(() => suppliedStorage ?? getBrowserStorage());
  const [storageStatus, setStorageStatus] = useState<StorageStatus>();
  const [isEraseDialogOpen, setEraseDialogOpen] = useState(false);
  const [isErasing, setErasing] = useState(false);
  const [isRequestingPersistence, setRequestingPersistence] = useState(false);
  const [message, setMessage] = useState<string>();
  const [error, setError] = useState<string>();

  useEffect(() => () => {
    if (suppliedRepository === undefined) repository.close();
  }, [repository, suppliedRepository]);

  useEffect(() => {
    let isCurrent = true;
    void getStorageStatus(storage).then((status) => {
      if (isCurrent) setStorageStatus(status);
    });
    return () => {
      isCurrent = false;
    };
  }, [storage]);

  const handleRequestPersistence = async () => {
    setRequestingPersistence(true);
    setError(undefined);
    setMessage(undefined);
    try {
      const wasGranted = await requestPersistentStorage(storage ?? {});
      setStorageStatus((current) => ({
        estimate: current?.estimate,
        persistence: wasGranted ? "persistent" : "not-persistent",
      }));
      setMessage(wasGranted
        ? "Persistent storage is enabled."
        : "Persistent storage was not granted. Keep an exported backup for recovery.");
    } catch {
      setError("Persistent storage could not be requested. Keep an exported backup for recovery.");
    } finally {
      setRequestingPersistence(false);
    }
  };

  const handleErase = async () => {
    setErasing(true);
    setError(undefined);
    try {
      await repository.eraseAll();
      setEraseDialogOpen(false);
      setMessage("All local museum records have been erased. Restore a backup to recover them.");
    } catch {
      setEraseDialogOpen(false);
      setError("Local museum records could not be erased. Your collection may still be available in this browser.");
    } finally {
      setErasing(false);
    }
  };

  const persistence = storageStatus?.persistence;
  const isPersistenceRequestAvailable = storage?.persist !== undefined;

  return (
    <section aria-labelledby="archive-privacy-title" className="archive-privacy-settings">
      <header>
        <p className="museum-eyebrow">Local collection</p>
        <h2 id="archive-privacy-title">Storage &amp; privacy</h2>
        <p>Your Exhibits and attachments stay in this browser unless you export a backup. The Almost Museum does not send your collection to a server.</p>
      </header>

      <section aria-labelledby="storage-status-title" className="archive-privacy-settings__section">
        <div>
          <h3 id="storage-status-title">Storage on this device</h3>
          <p>{storageStatus?.estimate === undefined
            ? "This browser did not provide a storage estimate."
            : `Estimated local storage: ${storageStatus.estimate}.`}</p>
          <p>{persistence === "persistent"
            ? "Persistent storage is enabled."
            : persistence === "not-persistent"
              ? "Persistent storage is not enabled."
              : "This browser cannot report persistent-storage status."}</p>
        </div>
        {isPersistenceRequestAvailable && persistence !== "persistent" ? (
          <Button disabled={isRequestingPersistence} onClick={() => void handleRequestPersistence()} variant="secondary">
            {isRequestingPersistence ? "Requesting persistent storage…" : "Request persistent storage"}
          </Button>
        ) : null}
      </section>

      <section aria-labelledby="erase-collection-title" className="archive-privacy-settings__danger">
        <div>
          <p className="museum-eyebrow">Erase from this browser</p>
          <h3 id="erase-collection-title">Erase all local data</h3>
          <p>This permanently deletes every Exhibit, attachment, and timeline event saved in this browser. It cannot be undone here. Export a backup first if you may want to recover this collection.</p>
        </div>
        <Button disabled={isErasing} onClick={() => setEraseDialogOpen(true)} variant="destructive">Erase all local data</Button>
      </section>

      {message !== undefined ? <p role="status">{message}</p> : null}
      {error !== undefined ? <p role="alert">{error}</p> : null}

      <AlertDialog onOpenChange={setEraseDialogOpen} open={isEraseDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Erase all local museum data?</AlertDialogTitle>
            <AlertDialogDescription>This removes every Exhibit, stored attachment, and timeline event from this browser. Only an exported backup can restore the collection.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isErasing}>Cancel</AlertDialogCancel>
            <AlertDialogAction disabled={isErasing} onClick={() => void handleErase()} variant="destructive">
            {isErasing ? "Erasing local data…" : "Erase all data"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}

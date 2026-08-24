"use client";

import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
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
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
    <section aria-labelledby="archive-privacy-title" className="grid gap-4">
      <header className="grid gap-1">
        <p className="museum-eyebrow">Local collection</p>
        <h2 className="text-xl font-medium" id="archive-privacy-title">Storage &amp; privacy</h2>
        <p className="text-sm text-muted-foreground">Your Exhibits and attachments stay in this browser unless you export a backup. The Almost Museum does not send your collection to a server.</p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle><h3 id="storage-status-title">Storage on this device</h3></CardTitle>
          <CardDescription>Review what this browser can report about your local museum storage.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-2">
          <p>{storageStatus?.estimate === undefined
            ? "This browser did not provide a storage estimate."
            : `Estimated local storage: ${storageStatus.estimate}.`}</p>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={persistence === "persistent" ? "default" : "secondary"}>
              {persistence === "persistent" ? "Persistent" : "Standard storage"}
            </Badge>
            <p className="text-muted-foreground">{persistence === "persistent"
            ? "Persistent storage is enabled."
            : persistence === "not-persistent"
              ? "Persistent storage is not enabled."
              : "This browser cannot report persistent-storage status."}</p>
          </div>
        </CardContent>
        {isPersistenceRequestAvailable && persistence !== "persistent" ? (
          <CardFooter>
            <Button className="min-h-11 w-full sm:min-h-8 sm:w-auto" disabled={isRequestingPersistence} onClick={() => void handleRequestPersistence()} variant="secondary">
              {isRequestingPersistence ? "Requesting persistent storage…" : "Request persistent storage"}
            </Button>
          </CardFooter>
        ) : null}
      </Card>

      <Card>
        <CardHeader>
          <p className="museum-eyebrow">Erase from this browser</p>
          <CardTitle><h3 id="erase-collection-title">Erase all local data</h3></CardTitle>
          <CardDescription>This permanently deletes every Exhibit, attachment, and timeline event saved in this browser. It cannot be undone here. Export a backup first if you may want to recover this collection.</CardDescription>
        </CardHeader>
        <CardFooter>
          <Button className="min-h-11 w-full sm:min-h-8 sm:w-auto" disabled={isErasing} onClick={() => setEraseDialogOpen(true)} variant="destructive">Erase all local data</Button>
        </CardFooter>
      </Card>

      {message !== undefined ? <Alert role="status"><AlertDescription>{message}</AlertDescription></Alert> : null}
      {error !== undefined ? <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert> : null}

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

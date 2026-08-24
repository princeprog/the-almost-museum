"use client";

import { useEffect, useState, type ChangeEvent } from "react";

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
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  BackupValidationError,
  exportCollectionBackup,
  previewCollectionBackup,
  restoreCollectionBackup,
  type CollectionBackupPreview,
} from "@/lib/backups/collection-backup";
import { ExhibitRepository } from "@/lib/persistence";

function defaultDownload(json: string, filename: string): void {
  const url = URL.createObjectURL(new Blob([json], { type: "application/json" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function readFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("The backup file could not be read."));
    reader.onload = () => resolve(typeof reader.result === "string" ? reader.result : "");
    reader.readAsText(file);
  });
}

function backupFilename(date: Date): string {
  return `almost-museum-backup-${date.toISOString().slice(0, 10)}.json`;
}

function countLabel(count: number, singular: string): string {
  return `${count} ${count === 1 ? singular : `${singular}s`}`;
}

export interface CollectionBackupsProps {
  onDownload?: (json: string, filename: string) => void;
  readBackupFile?: (file: File) => Promise<string>;
  repository?: ExhibitRepository;
}

/** Exports and restores the canonical repository collection without direct IndexedDB access. */
export function CollectionBackups({
  onDownload = defaultDownload,
  readBackupFile = readFile,
  repository: suppliedRepository,
}: Readonly<CollectionBackupsProps>) {
  const [repository] = useState(() => suppliedRepository ?? new ExhibitRepository());
  const [preview, setPreview] = useState<CollectionBackupPreview>();
  const [isRestoreDialogOpen, setRestoreDialogOpen] = useState(false);
  const [isWorking, setWorking] = useState(false);
  const [message, setMessage] = useState<string>();
  const [error, setError] = useState<string>();

  useEffect(() => () => {
    if (suppliedRepository === undefined) repository.close();
  }, [repository, suppliedRepository]);

  const handleExport = async () => {
    setWorking(true);
    setError(undefined);
    try {
      const json = await exportCollectionBackup(repository);
      onDownload(json, backupFilename(new Date()));
      setMessage("Collection backup downloaded.");
    } catch {
      setError("The collection backup could not be created.");
    } finally {
      setWorking(false);
    }
  };

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file === undefined) return;

    setWorking(true);
    setPreview(undefined);
    setMessage(undefined);
    setError(undefined);
    try {
      setPreview(await previewCollectionBackup(await readBackupFile(file)));
    } catch (reason) {
      setError(reason instanceof BackupValidationError ? reason.message : "The backup file could not be read.");
    } finally {
      setWorking(false);
      event.target.value = "";
    }
  };

  const handleRestore = async () => {
    if (preview === undefined) return;

    setWorking(true);
    setError(undefined);
    try {
      await restoreCollectionBackup(repository, preview);
      setPreview(undefined);
      setRestoreDialogOpen(false);
      setMessage("Collection restored from backup.");
    } catch {
      setError("The collection could not be restored. Your current collection is unchanged.");
      setRestoreDialogOpen(false);
    } finally {
      setWorking(false);
    }
  };

  return (
    <section aria-labelledby="collection-backups-title" className="grid gap-4">
      <header className="grid gap-1">
        <p className="museum-eyebrow">Portable collection</p>
        <h2 className="text-xl font-medium" id="collection-backups-title">Back up your museum</h2>
        <p className="text-sm text-muted-foreground">Exports include your Exhibits, timeline, and stored attachments. Restoring replaces this browser’s current collection only after you confirm the preview.</p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle><h3 id="export-collection-title">Export</h3></CardTitle>
          <CardDescription>Keep a JSON copy before clearing browser data or moving to another browser.</CardDescription>
        </CardHeader>
        <CardFooter>
          <Button className="min-h-11 w-full sm:min-h-8 sm:w-auto" disabled={isWorking} onClick={() => void handleExport()}>Export collection</Button>
        </CardFooter>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle><h3 id="restore-collection-title">Restore</h3></CardTitle>
          <CardDescription>Choose an Almost Museum version 1 JSON backup to inspect it before replacing this collection.</CardDescription>
        </CardHeader>
        <CardContent>
          <Field>
            <FieldLabel htmlFor="backup-file">Choose backup file</FieldLabel>
            <Input accept="application/json,.json" className="min-h-11 sm:min-h-8" disabled={isWorking} id="backup-file" onChange={(event) => void handleFileChange(event)} type="file" />
            <FieldDescription>The backup is validated and previewed before anything is replaced.</FieldDescription>
          </Field>
        </CardContent>
      </Card>

      {preview !== undefined ? (
        <Alert aria-label="Backup preview">
          <AlertDescription className="grid gap-3">
            <p>Ready to restore {countLabel(preview.exhibits, "Exhibit")}, {countLabel(preview.artifacts, "artifact")}, and {countLabel(preview.history, "history event")}.</p>
            <p>This will replace the current collection. Export it first if you may need it later.</p>
            <Button className="min-h-11 w-full sm:w-fit" disabled={isWorking} onClick={() => setRestoreDialogOpen(true)} variant="destructive">Restore collection</Button>
          </AlertDescription>
        </Alert>
      ) : null}
      {message !== undefined ? <Alert role="status"><AlertDescription>{message}</AlertDescription></Alert> : null}
      {error !== undefined ? <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert> : null}

      <AlertDialog onOpenChange={setRestoreDialogOpen} open={isRestoreDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Replace this collection?</AlertDialogTitle>
            <AlertDialogDescription>The backup preview has passed validation. Replacing the collection cannot be undone from this browser.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isWorking}>Cancel</AlertDialogCancel>
            <AlertDialogAction disabled={isWorking} onClick={() => void handleRestore()} variant="destructive">Replace collection</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}

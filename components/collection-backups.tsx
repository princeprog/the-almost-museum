"use client";

import { useEffect, useState, type ChangeEvent } from "react";

import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
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
    <section aria-labelledby="collection-backups-title" className="collection-backups">
      <header>
        <p className="museum-eyebrow">Portable collection</p>
        <h2 id="collection-backups-title">Back up your museum</h2>
        <p>Exports include your Exhibits, timeline, and stored attachments. Restoring replaces this browser’s current collection only after you confirm the preview.</p>
      </header>

      <section aria-labelledby="export-collection-title" className="collection-backups__section">
        <div>
          <h3 id="export-collection-title">Export</h3>
          <p>Keep a JSON copy before clearing browser data or moving to another browser.</p>
        </div>
        <Button disabled={isWorking} onClick={() => void handleExport()}>Export collection</Button>
      </section>

      <section aria-labelledby="restore-collection-title" className="collection-backups__section">
        <div>
          <h3 id="restore-collection-title">Restore</h3>
          <p>Choose an Almost Museum version 1 JSON backup to inspect it before replacing this collection.</p>
        </div>
        <label className="museum-field" htmlFor="backup-file">
          <span className="museum-field__label">Choose backup file</span>
          <input accept="application/json,.json" className="museum-input" disabled={isWorking} id="backup-file" onChange={(event) => void handleFileChange(event)} type="file" />
        </label>
      </section>

      {preview !== undefined ? (
        <section aria-label="Backup preview" className="collection-backups__preview">
          <p>Ready to restore {countLabel(preview.exhibits, "Exhibit")}, {countLabel(preview.artifacts, "artifact")}, and {countLabel(preview.history, "history event")}.</p>
          <p>This will replace the current collection. Export it first if you may need it later.</p>
          <Button disabled={isWorking} onClick={() => setRestoreDialogOpen(true)} variant="danger">Restore collection</Button>
        </section>
      ) : null}
      {message !== undefined ? <p role="status">{message}</p> : null}
      {error !== undefined ? <p role="alert">{error}</p> : null}

      <Dialog
        description="The backup preview has passed validation. Replacing the collection cannot be undone from this browser."
        isOpen={isRestoreDialogOpen}
        onOpenChange={setRestoreDialogOpen}
        title="Replace this collection?"
      >
        <div className="collection-backups__dialog-actions">
          <Button disabled={isWorking} onClick={() => setRestoreDialogOpen(false)} variant="secondary">Cancel</Button>
          <Button disabled={isWorking} onClick={() => void handleRestore()} variant="danger">Replace collection</Button>
        </div>
      </Dialog>
    </section>
  );
}

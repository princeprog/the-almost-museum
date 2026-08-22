export interface StorageEstimate {
  quota?: number;
  usage?: number;
}

export interface BrowserStorage {
  estimate?: () => Promise<StorageEstimate>;
  persisted?: () => Promise<boolean>;
  persist?: () => Promise<boolean>;
}

export type StoragePersistence = "persistent" | "not-persistent" | "unavailable";

export interface StorageStatus {
  estimate?: string;
  persistence: StoragePersistence;
}

function formatBytes(bytes: number): string {
  if (bytes < 1_024) return `${bytes} B`;

  const kibibytes = bytes / 1_024;
  return `${Number(kibibytes.toFixed(kibibytes < 10 ? 1 : 0))} KiB`;
}

function formatEstimate(estimate: StorageEstimate | undefined): string | undefined {
  if (estimate?.quota === undefined || estimate.usage === undefined) return undefined;
  if (!Number.isFinite(estimate.quota) || !Number.isFinite(estimate.usage)) return undefined;

  return `${formatBytes(estimate.usage)} used of ${formatBytes(estimate.quota)}`;
}

/** Reads browser-provided storage metadata only; it never opens or mutates the museum repository. */
export async function getStorageStatus(storage: BrowserStorage | undefined): Promise<StorageStatus> {
  const estimate = storage?.estimate === undefined
    ? undefined
    : await storage.estimate().catch(() => undefined);
  const persistence = storage?.persisted === undefined
    ? "unavailable"
    : await storage.persisted()
      .then((isPersistent): StoragePersistence => isPersistent ? "persistent" : "not-persistent")
      .catch((): StoragePersistence => "unavailable");

  return { estimate: formatEstimate(estimate), persistence };
}

/** Requests browser persistence only; collection data stays untouched. */
export async function requestPersistentStorage(storage: Pick<BrowserStorage, "persist">): Promise<boolean> {
  if (storage.persist === undefined) return false;
  return storage.persist();
}

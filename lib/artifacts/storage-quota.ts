const QUOTA_WARNING_RATIO = 0.8;

interface StorageEstimate {
  quota?: number;
  usage?: number;
}

/** Returns a calm heads-up before a local file could exhaust browser storage. */
export function getStorageQuotaWarning(estimate: StorageEstimate, additionalBytes: number): string | undefined {
  if (estimate.quota === undefined || estimate.usage === undefined) return undefined;

  if (additionalBytes > estimate.quota - estimate.usage) {
    return "This file may not fit in this browser's local collection.";
  }

  if (estimate.usage + additionalBytes >= estimate.quota * QUOTA_WARNING_RATIO) {
    return "Your collection is approaching this browser's local storage limit.";
  }

  return undefined;
}

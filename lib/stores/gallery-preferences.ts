import { useStore } from "zustand";
import { createStore, type StoreApi } from "zustand/vanilla";
import { z } from "zod";

import type { GallerySort } from "@/lib/gallery";

export type GalleryView = "grid" | "list";

interface GalleryPreferences {
  sort: GallerySort;
  view: GalleryView;
}

interface GalleryPreferenceState extends GalleryPreferences {
  hasHydrated: boolean;
  hydrate: () => void;
  setSort: (sort: GallerySort) => void;
  setView: (view: GalleryView) => void;
}

type StorageProvider = () => Pick<Storage, "getItem" | "setItem"> | undefined;

export const galleryPreferenceStorageKey = "almost-museum.gallery.preferences";

const defaultPreferences: GalleryPreferences = {
  sort: "updated-desc",
  view: "grid",
};

const galleryPreferencesSchema = z.object({
  sort: z.enum(["updated-desc", "created-desc", "title-asc"]),
  view: z.enum(["grid", "list"]),
}).strict();

function getBrowserStorage(): Storage | undefined {
  return typeof window === "undefined" ? undefined : window.localStorage;
}

function persistPreferences(storageProvider: StorageProvider, preferences: GalleryPreferences): void {
  try {
    storageProvider()?.setItem(galleryPreferenceStorageKey, JSON.stringify(preferences));
  } catch {
    // Gallery preferences are optional and must never block the private collection.
  }
}

/** Holds only local gallery presentation preferences; collection data stays in the repository. */
export function createGalleryPreferenceStore(
  storageProvider: StorageProvider = getBrowserStorage,
): StoreApi<GalleryPreferenceState> {
  return createStore<GalleryPreferenceState>((set, get) => ({
    ...defaultPreferences,
    hasHydrated: false,
    hydrate: () => {
      let preferences = defaultPreferences;
      let shouldRepairStorage = false;

      try {
        const storage = storageProvider();
        const stored = storage?.getItem(galleryPreferenceStorageKey);
        if (storage !== undefined && stored === null) {
          shouldRepairStorage = true;
        } else if (stored !== null && stored !== undefined) {
          const parsed = galleryPreferencesSchema.safeParse(JSON.parse(stored) as unknown);
          if (parsed.success) preferences = parsed.data;
          else shouldRepairStorage = true;
        }
      } catch {
        shouldRepairStorage = true;
      }

      set({ ...preferences, hasHydrated: true });
      if (shouldRepairStorage) persistPreferences(storageProvider, preferences);
    },
    setSort: (sort) => {
      const preferences = { sort, view: get().view };
      set({ sort });
      persistPreferences(storageProvider, preferences);
    },
    setView: (view) => {
      const preferences = { sort: get().sort, view };
      set({ view });
      persistPreferences(storageProvider, preferences);
    },
  }));
}

export const galleryPreferenceStore = createGalleryPreferenceStore();

export function useGalleryPreferenceStore<T>(selector: (state: GalleryPreferenceState) => T): T {
  return useStore(galleryPreferenceStore, selector);
}

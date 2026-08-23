import { describe, expect, it } from "vitest";

import {
  createGalleryPreferenceStore,
  galleryPreferenceStorageKey,
} from "@/lib/stores/gallery-preferences";

function createMemoryStorage(initialValue?: string): Storage {
  const values = new Map<string, string>();
  if (initialValue !== undefined) values.set(galleryPreferenceStorageKey, initialValue);

  return {
    get length() {
      return values.size;
    },
    clear: () => values.clear(),
    getItem: (key) => values.get(key) ?? null,
    key: (index) => [...values.keys()][index] ?? null,
    removeItem: (key) => values.delete(key),
    setItem: (key, value) => values.set(key, value),
  };
}

describe("gallery preference store", () => {
  it("hydrates valid gallery preferences and persists later view changes", () => {
    const storage = createMemoryStorage(JSON.stringify({ sort: "title-asc", view: "list" }));
    const store = createGalleryPreferenceStore(() => storage);

    store.getState().hydrate();

    expect(store.getState()).toMatchObject({ hasHydrated: true, sort: "title-asc", view: "list" });

    store.getState().setView("grid");

    expect(JSON.parse(storage.getItem(galleryPreferenceStorageKey)!)).toEqual({
      sort: "title-asc",
      view: "grid",
    });
  });

  it("recovers malformed preferences to defaults without accessing unavailable browser storage", () => {
    const malformedStorage = createMemoryStorage("{not-json");
    const malformedStore = createGalleryPreferenceStore(() => malformedStorage);
    const serverStore = createGalleryPreferenceStore(() => undefined);

    expect(() => malformedStore.getState().hydrate()).not.toThrow();
    expect(malformedStore.getState()).toMatchObject({
      hasHydrated: true,
      sort: "updated-desc",
      view: "grid",
    });
    expect(JSON.parse(malformedStorage.getItem(galleryPreferenceStorageKey)!)).toEqual({
      sort: "updated-desc",
      view: "grid",
    });

    expect(() => serverStore.getState().hydrate()).not.toThrow();
    expect(serverStore.getState().hasHydrated).toBe(true);
  });

  it("initializes browser storage with the default preferences on first hydration", () => {
    const storage = createMemoryStorage();
    const store = createGalleryPreferenceStore(() => storage);

    store.getState().hydrate();

    expect(JSON.parse(storage.getItem(galleryPreferenceStorageKey)!)).toEqual({
      sort: "updated-desc",
      view: "grid",
    });
  });
});

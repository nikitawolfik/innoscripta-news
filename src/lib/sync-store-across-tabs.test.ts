import { afterEach, describe, expect, it, vi } from "vitest";

import { syncStoreAcrossTabs } from "~/lib/sync-store-across-tabs";

const STORAGE_KEY = "news:preferences";

function createStore() {
  return { persist: { rehydrate: vi.fn() } };
}

function fireStorageEvent(key: string | null) {
  window.dispatchEvent(new StorageEvent("storage", { key }));
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("syncStoreAcrossTabs", () => {
  it("rehydrates when the watched key changes", () => {
    const store = createStore();
    const unsubscribe = syncStoreAcrossTabs(STORAGE_KEY, store);

    fireStorageEvent(STORAGE_KEY);

    expect(store.persist.rehydrate).toHaveBeenCalledTimes(1);
    unsubscribe();
  });

  it("ignores other keys", () => {
    const store = createStore();
    const unsubscribe = syncStoreAcrossTabs(STORAGE_KEY, store);

    fireStorageEvent("news:theme");

    expect(store.persist.rehydrate).not.toHaveBeenCalled();
    unsubscribe();
  });

  it("rehydrates when storage is cleared wholesale", () => {
    const store = createStore();
    const unsubscribe = syncStoreAcrossTabs(STORAGE_KEY, store);

    // localStorage.clear() dispatches a storage event with a null key.
    fireStorageEvent(null);

    expect(store.persist.rehydrate).toHaveBeenCalledTimes(1);
    unsubscribe();
  });

  it("stops listening once unsubscribed", () => {
    const store = createStore();
    const unsubscribe = syncStoreAcrossTabs(STORAGE_KEY, store);

    unsubscribe();
    fireStorageEvent(STORAGE_KEY);

    expect(store.persist.rehydrate).not.toHaveBeenCalled();
  });
});

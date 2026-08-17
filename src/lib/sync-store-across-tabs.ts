type PersistedStore = {
  persist: {
    rehydrate: () => void | Promise<void>;
  };
};

/**
 * Keeps a persisted zustand store in step across browser tabs.
 *
 * `persist` writes to localStorage but never listens for changes, so a second
 * tab keeps showing stale state until it reloads. The `storage` event fires
 * only in *other* tabs, which is exactly the signal needed: the tab that made
 * the change already has it in memory.
 *
 * Returns an unsubscribe function.
 */
export function syncStoreAcrossTabs(
  storageKey: string,
  store: PersistedStore,
): () => void {
  function handleStorageChange(event: StorageEvent) {
    // A null key means the whole store was cleared, which also concerns us.
    if (event.key !== null && event.key !== storageKey) {
      return;
    }

    void store.persist.rehydrate();
  }

  window.addEventListener("storage", handleStorageChange);

  return () => window.removeEventListener("storage", handleStorageChange);
}

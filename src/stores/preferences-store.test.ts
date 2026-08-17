import { beforeEach, describe, expect, it } from "vitest";

import {
  PREFERENCES_STORAGE_KEY,
  usePreferencesStore,
} from "~/stores/preferences-store";
import { DEFAULT_FILTERS } from "~/types/filters";

beforeEach(() => {
  localStorage.clear();
  usePreferencesStore.setState({ filters: DEFAULT_FILTERS });
});

describe("preferences store", () => {
  it("starts from the shared defaults", () => {
    expect(usePreferencesStore.getState().filters).toEqual(DEFAULT_FILTERS);
  });

  it("merges a patch instead of replacing the filter set", () => {
    usePreferencesStore.getState().setFilters({ sources: ["guardian"] });
    usePreferencesStore.getState().setFilters({ categories: ["science"] });

    expect(usePreferencesStore.getState().filters).toEqual({
      ...DEFAULT_FILTERS,
      sources: ["guardian"],
      categories: ["science"],
    });
  });

  it("writes through to localStorage on every change", () => {
    usePreferencesStore.getState().setFilters({ categories: ["technology"] });

    const stored = localStorage.getItem(PREFERENCES_STORAGE_KEY);

    expect(stored).not.toBeNull();
    expect(JSON.parse(stored ?? "{}").state.filters.categories).toEqual([
      "technology",
    ]);
  });

  it("fills in fields missing from a stored older shape", async () => {
    // A build that predates a filter would have persisted without it; merging
    // onto the defaults keeps the store a complete Filters rather than a
    // partial one that crashes downstream.
    localStorage.setItem(
      PREFERENCES_STORAGE_KEY,
      JSON.stringify({ state: { filters: { q: "solar" } }, version: 1 }),
    );

    await usePreferencesStore.persist.rehydrate();

    expect(usePreferencesStore.getState().filters).toEqual({
      ...DEFAULT_FILTERS,
      q: "solar",
    });
  });
});

import { create } from "zustand";
import { persist } from "zustand/middleware";

import {
  DEFAULT_FILTERS,
  type Filters,
  type SetFilters,
} from "~/types/filters";

export const PREFERENCES_STORAGE_KEY = "news:preferences";

interface State {
  filters: Filters;
}

interface Actions {
  setFilters: SetFilters;
}

type Store = State & Actions;

/**
 * The `/feed` half of the filter contract. Edits persist immediately — there is
 * no draft or save step, because the feed under the bar is the preview.
 */
export const usePreferencesStore = create<Store>()(
  persist(
    (set) => ({
      filters: DEFAULT_FILTERS,
      setFilters: (patch) =>
        set((state) => ({ filters: { ...state.filters, ...patch } })),
    }),
    {
      name: PREFERENCES_STORAGE_KEY,
      version: 1,
      // Only the data persists; actions are recreated on load.
      partialize: (state) => ({ filters: state.filters }),
      // A stored shape from an older build may be missing fields added since,
      // so merge onto the defaults rather than trusting what was read.
      merge: (persistedState, currentState) => ({
        ...currentState,
        filters: {
          ...DEFAULT_FILTERS,
          ...(persistedState as Partial<State>)?.filters,
        },
      }),
    },
  ),
);

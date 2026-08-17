import { usePreferencesStore } from "~/stores/preferences-store";
import type { Filters, SetFilters } from "~/types/filters";

/**
 * Preference-backed filter adapter for `/feed`. Same tuple as `useUrlFilters`,
 * so `<FilterBar>` cannot tell which one it was handed — the URL stays clean
 * here because a personal feed is not a shareable view.
 */
export function usePreferenceFilters(): [Filters, SetFilters] {
  const filters = usePreferencesStore((state) => state.filters);
  const setFilters = usePreferencesStore((state) => state.setFilters);

  return [filters, setFilters];
}

import type { SourceId } from "~/types/source";

export type Filters = {
  q: string;
  from: string | null;
  to: string | null;
  sources: SourceId[];
  categories: string[];
  authors: string[];
};

/**
 * The contract both filter adapters implement: `/` backs it with URL search
 * params, `/feed` with the persisted preferences store. FilterBar only ever
 * sees this tuple, which is why the two routes share one component.
 */
export type SetFiltersOptions = {
  /**
   * Replace the current history entry instead of adding one. Set by controls
   * that fire repeatedly while a reader is still deciding — the search box —
   * so Back undoes an action rather than a keystroke. Adapters not backed by
   * history ignore it.
   */
  replace?: boolean;
};

export type SetFilters = (
  patch: Partial<Filters>,
  options?: SetFiltersOptions,
) => void;

export const DEFAULT_FILTERS: Filters = {
  q: "",
  from: null,
  to: null,
  sources: [],
  categories: [],
  authors: [],
};

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
export type SetFilters = (patch: Partial<Filters>) => void;

export const DEFAULT_FILTERS: Filters = {
  q: "",
  from: null,
  to: null,
  sources: [],
  categories: [],
  authors: [],
};

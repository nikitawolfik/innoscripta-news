import type { SourceId } from "~/types/source";

export type Filters = {
  q: string;
  from: string | null;
  to: string | null;
  sources: SourceId[];
  categories: string[];
  authors: string[];
};

export const DEFAULT_FILTERS: Filters = {
  q: "",
  from: null,
  to: null,
  sources: [],
  categories: [],
  authors: [],
};

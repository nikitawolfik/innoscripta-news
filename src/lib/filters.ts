import { format, isValid, parseISO } from "date-fns";

import { CATEGORY_OPTIONS } from "~/lib/categories";
import type { Filters } from "~/types/filters";
import { isSourceId } from "~/types/source";

const LIST_SEPARATOR = ",";
const DATE_PARAM_FORMAT = "yyyy-MM-dd";

/**
 * Invalid values fall back to defaults rather than throwing: a URL is user
 * input (hand-edited, truncated by a chat app, stale after a deploy), so a bad
 * param means "ignore this filter", never a crash.
 */
export function parseFilters(searchParams: URLSearchParams): Filters {
  return {
    q: searchParams.get("q")?.trim() ?? "",
    from: parseDateParam(searchParams.get("from")),
    to: parseDateParam(searchParams.get("to")),
    sources: parseListParam(searchParams.get("sources")).filter(isSourceId),
    categories: parseListParam(searchParams.get("categories")).filter(
      isKnownCategory,
    ),
    authors: searchParams
      .getAll("author")
      .map((author) => author.trim())
      .filter(Boolean),
  };
}

/** Empty values are omitted so shared URLs stay clean. */
export function serializeFilters(filters: Filters): URLSearchParams {
  const searchParams = new URLSearchParams();

  if (filters.q.trim()) {
    searchParams.set("q", filters.q.trim());
  }

  if (filters.from) {
    searchParams.set("from", filters.from);
  }

  if (filters.to) {
    searchParams.set("to", filters.to);
  }

  if (filters.sources.length > 0) {
    searchParams.set("sources", filters.sources.join(LIST_SEPARATOR));
  }

  if (filters.categories.length > 0) {
    searchParams.set("categories", filters.categories.join(LIST_SEPARATOR));
  }

  // Author display names can contain commas ("Smith, Jr."), so they use one
  // repeated param each instead of a comma-joined list.
  for (const author of filters.authors) {
    searchParams.append("author", author);
  }

  return searchParams;
}

/** How many filter groups are active — shown on the mobile sheet trigger. */
export function countActiveFilterGroups(filters: Filters): number {
  const groups = [
    Boolean(filters.q.trim()),
    Boolean(filters.from ?? filters.to),
    filters.sources.length > 0,
    filters.categories.length > 0,
    filters.authors.length > 0,
  ];

  return groups.filter(Boolean).length;
}

export function toDateParam(date: Date): string {
  return format(date, DATE_PARAM_FORMAT);
}

function parseDateParam(value: string | null): string | null {
  if (!value) {
    return null;
  }

  const parsedDate = parseISO(value);

  return isValid(parsedDate) ? toDateParam(parsedDate) : null;
}

function parseListParam(value: string | null): string[] {
  if (!value) {
    return [];
  }

  return value
    .split(LIST_SEPARATOR)
    .map((item) => item.trim())
    .filter(Boolean);
}

function isKnownCategory(value: string): boolean {
  return CATEGORY_OPTIONS.some((option) => option.id === value);
}

import { differenceInCalendarDays, parseISO } from "date-fns";

import { SourceUnavailableError } from "~/api/errors";
import { readSourceJson } from "~/api/read-source-response";
import {
  newsApiArticleSchema,
  newsApiSearchResponseSchema,
  type NewsApiArticle,
} from "~/api/sources/newsapi.schema";
import type {
  SearchResult,
  SourceCapabilities,
  SourceClient,
} from "~/api/types";
import { mapCategoriesForSource } from "~/lib/categories";
import type { Article } from "~/types/article";
import type { Filters } from "~/types/filters";

const SOURCE_ID = "newsapi" as const;
const SOURCE_LABEL = "NewsAPI";
const PAGE_SIZE = 20;

/**
 * Developer-plan ceilings, both verified against the live API and both of
 * which surface as errors mid-use rather than up front:
 *
 * - result 101 onwards returns 426 `maximumResultsReached`, so `hasMore` has to
 *   cap here or an infinite scroll dies partway down
 * - articles older than roughly a month return 426 `parameterInvalid`
 *   ("results too far in the past"); 23 days back works, 38 does not
 */
const MAX_RESULTS = 100;
const MAX_HISTORY_DAYS = 30;

const CAPABILITIES: SourceCapabilities = {
  keyword: true,
  dateRange: true,
  category: true,
  author: false,
  body: false,
  fetchById: false,
};

export const newsApiClient: SourceClient = {
  id: SOURCE_ID,
  label: SOURCE_LABEL,
  capabilities: CAPABILITIES,
  unsupportedReason: newsApiUnsupportedReason,
  search: searchNewsApi,
  fetchById: null,
};

export function newsApiUnsupportedReason(filters: Filters): string | null {
  if (filters.authors.length > 0) {
    return "NewsAPI cannot filter by author";
  }

  const hasKeyword = Boolean(filters.q.trim());
  const hasCategory = filters.categories.length > 0;
  const hasDateRange = Boolean(filters.from ?? filters.to);

  // `/everything` rejects a request with no q/sources/domains, and
  // `/top-headlines` rejects one with no category/country/sources/q. With
  // neither filter set there is no query NewsAPI will accept.
  if (!hasKeyword && !hasCategory) {
    return "NewsAPI needs a keyword or category";
  }

  if (filters.categories.length > 1) {
    return "NewsAPI can only filter by one category at a time";
  }

  // A category forces `/top-headlines`, the only endpoint that takes one — and
  // it ignores from/to entirely. Returning date-unfiltered articles as though
  // the range applied would be silently wrong, so decline instead.
  if (hasCategory && hasDateRange) {
    return "NewsAPI cannot combine a category with a date range";
  }

  if (isBeyondPlanWindow(filters.from)) {
    return `NewsAPI's free plan only reaches back ${MAX_HISTORY_DAYS} days`;
  }

  return null;
}

function isBeyondPlanWindow(from: string | null): boolean {
  if (!from) {
    return false;
  }

  return (
    differenceInCalendarDays(new Date(), parseISO(from)) > MAX_HISTORY_DAYS
  );
}

async function searchNewsApi(
  filters: Filters,
  page: number,
): Promise<SearchResult> {
  const endpoint = selectNewsApiEndpoint(filters);
  const searchParams = buildNewsApiSearchParams(filters, page, endpoint);
  const response = await fetch(
    `/api/newsapi/${endpoint}?${searchParams.toString()}`,
  );
  const payload = await readSourceJson(response, SOURCE_ID);
  const parsed = newsApiSearchResponseSchema.safeParse(payload);

  if (!parsed.success) {
    throw new SourceUnavailableError(
      SOURCE_ID,
      "NewsAPI search response failed validation",
    );
  }

  const requestedCategory =
    mapCategoriesForSource(filters.categories, SOURCE_ID)[0] ?? null;
  const articles: Article[] = [];
  let droppedInvalidCount = 0;

  for (const result of parsed.data.articles) {
    const article = normalizeNewsApiArticle(result, requestedCategory);

    if (article) {
      articles.push(article);
    } else {
      droppedInvalidCount += 1;
    }
  }

  return {
    articles,
    page,
    // Capped at the plan ceiling, not totalResults. NewsAPI happily reports
    // tens of thousands of hits and then 426s at result 101, which would
    // otherwise kill the scroll partway down with an "unavailable" source.
    hasMore: page * PAGE_SIZE < Math.min(parsed.data.totalResults, MAX_RESULTS),
    droppedInvalidCount,
  };
}

/**
 * A category is only available on `/top-headlines`, so its presence decides the
 * endpoint — including alongside a keyword, which that endpoint accepts. The
 * previous rule sent keyword-plus-category to `/everything`, where the category
 * has no parameter and was silently dropped.
 *
 * `unsupportedReason` guarantees at least one of the two is set, so
 * `/everything` always carries the `q` it requires.
 */
export function selectNewsApiEndpoint(
  filters: Filters,
): "top-headlines" | "everything" {
  return filters.categories.length > 0 ? "top-headlines" : "everything";
}

export function buildNewsApiSearchParams(
  filters: Filters,
  page: number,
  endpoint = selectNewsApiEndpoint(filters),
): URLSearchParams {
  const searchParams = new URLSearchParams({
    page: String(page),
    pageSize: String(PAGE_SIZE),
  });

  if (endpoint === "top-headlines") {
    const category = mapCategoriesForSource(filters.categories, SOURCE_ID)[0];

    if (category) {
      searchParams.set("category", category);
    }

    if (filters.q.trim()) {
      searchParams.set("q", filters.q.trim());
    }

    // from/to are deliberately omitted: /top-headlines ignores them, and
    // unsupportedReason has already excluded that combination.
    return searchParams;
  }

  searchParams.set("sortBy", "publishedAt");

  if (filters.q.trim()) {
    searchParams.set("q", filters.q.trim());
  }

  if (filters.from) {
    searchParams.set("from", filters.from);
  }

  if (filters.to) {
    searchParams.set("to", filters.to);
  }

  return searchParams;
}

export function normalizeNewsApiArticle(
  value: unknown,
  category: string | null = null,
): Article | null {
  const parsed = newsApiArticleSchema.safeParse(value);

  if (!parsed.success) {
    return null;
  }

  return mapNewsApiArticle(parsed.data, category);
}

function mapNewsApiArticle(
  article: NewsApiArticle,
  category: string | null,
): Article {
  return {
    id: article.url,
    source: SOURCE_ID,
    sourceLabel: SOURCE_LABEL,
    title: article.title,
    description: article.description ?? null,
    body: null,
    author: article.author ?? null,
    category,
    imageUrl: article.urlToImage ?? null,
    url: article.url,
    publishedAt: article.publishedAt,
  };
}

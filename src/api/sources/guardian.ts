import { format, parseISO } from "date-fns";

import { SourceUnavailableError } from "~/api/errors";
import { readSourceJson } from "~/api/read-source-response";
import {
  guardianContentSchema,
  guardianSearchResponseSchema,
  guardianSingleResponseSchema,
  guardianTagsResponseSchema,
  type GuardianContent,
} from "~/api/sources/guardian.schema";
import type {
  SearchResult,
  SourceCapabilities,
  SourceClient,
} from "~/api/types";
import { mapCategoriesForSource } from "~/lib/categories";
import type { Article } from "~/types/article";
import type { Filters } from "~/types/filters";

const SOURCE_ID = "guardian" as const;
const SOURCE_LABEL = "The Guardian";
const PAGE_SIZE = 20;
const SHOW_FIELDS = "trailText,thumbnail,byline,body";
const CONTRIBUTOR_TAG_PREFIX = "profile/";

/**
 * Guardian treats `,` as AND and `|` as OR in `section` and `tag` filters.
 * Joining two sections with a comma asks for articles filed under both at once,
 * which matches nothing — `section=technology,sport` returns 0 results while
 * `section=technology|sport` returns the sum of the two.
 */
const FILTER_OR_SEPARATOR = "|";

const CAPABILITIES: SourceCapabilities = {
  keyword: true,
  dateRange: true,
  category: true,
  author: true,
  body: true,
  fetchById: true,
};

export const guardianClient: SourceClient = {
  id: SOURCE_ID,
  label: SOURCE_LABEL,
  capabilities: CAPABILITIES,
  unsupportedReason: () => null,
  search: searchGuardian,
  fetchById: fetchGuardianById,
};

async function searchGuardian(
  filters: Filters,
  page: number,
): Promise<SearchResult> {
  const authorTags = await resolveContributorTags(filters.authors);

  // Authors were requested but none resolve to a Guardian contributor. Running
  // the search unfiltered would return articles by everyone else, so report an
  // empty page instead of the wrong articles.
  if (filters.authors.length > 0 && authorTags.length === 0) {
    return { articles: [], page, hasMore: false, droppedInvalidCount: 0 };
  }

  const searchParams = buildSearchParams(filters, page, authorTags);
  const response = await fetch(`/api/guardian/search?${searchParams}`);
  const payload = await readJson(response);
  const parsed = guardianSearchResponseSchema.safeParse(payload);

  if (!parsed.success) {
    throw new SourceUnavailableError(
      SOURCE_ID,
      "Guardian search response failed validation",
    );
  }

  const { results, currentPage, pages } = parsed.data.response;
  const articles: Article[] = [];
  let droppedInvalidCount = 0;

  for (const result of results) {
    const article = normalizeGuardianContent(result);

    if (article) {
      articles.push(article);
    } else {
      droppedInvalidCount += 1;
    }
  }

  return {
    articles,
    page: currentPage,
    hasMore: currentPage < pages,
    droppedInvalidCount,
  };
}

async function fetchGuardianById(id: string): Promise<Article | null> {
  const searchParams = new URLSearchParams({ "show-fields": SHOW_FIELDS });
  const response = await fetch(
    `/api/guardian/${id}?${searchParams.toString()}`,
  );
  const payload = await readJson(response);
  const parsed = guardianSingleResponseSchema.safeParse(payload);

  if (!parsed.success) {
    throw new SourceUnavailableError(
      SOURCE_ID,
      "Guardian article response failed validation",
    );
  }

  return normalizeGuardianContent(parsed.data.response.content);
}

function buildSearchParams(
  filters: Filters,
  page: number,
  authorTags: string[],
): URLSearchParams {
  const searchParams = new URLSearchParams({
    "page-size": String(PAGE_SIZE),
    page: String(page),
    "show-fields": SHOW_FIELDS,
  });

  if (filters.q.trim()) {
    searchParams.set("q", filters.q.trim());
  }

  if (filters.from) {
    searchParams.set("from-date", toGuardianDate(filters.from));
  }

  if (filters.to) {
    searchParams.set("to-date", toGuardianDate(filters.to));
  }

  if (filters.categories.length > 0) {
    searchParams.set(
      "section",
      mapCategoriesForSource(filters.categories, SOURCE_ID).join(
        FILTER_OR_SEPARATOR,
      ),
    );
  }

  if (authorTags.length > 0) {
    searchParams.set("tag", authorTags.join(FILTER_OR_SEPARATOR));
  }

  return searchParams;
}

export function toGuardianDate(value: string): string {
  return format(parseISO(value), "yyyy-MM-dd");
}

/**
 * Contributor tag slugs cannot be derived from a display name — Guardian is
 * inconsistent about separators (`profile/owen-jones` but `profile/marinahyde`,
 * `profile/georgemonbiot`, `profile/jonathanfreedland`). Guessing silently
 * yields zero results, so resolve through the tags endpoint instead.
 *
 * Memoised because the same authors are resolved again on every page of a feed
 * and on every keystroke-driven refetch.
 */
const contributorTagCache = new Map<string, string | null>();

export async function resolveContributorTag(
  author: string,
): Promise<string | null> {
  const trimmedAuthor = author.trim();

  if (!trimmedAuthor) {
    return null;
  }

  // Already a tag id (from preferences, or a shared URL).
  if (trimmedAuthor.startsWith(CONTRIBUTOR_TAG_PREFIX)) {
    return trimmedAuthor;
  }

  const cachedTag = contributorTagCache.get(trimmedAuthor);

  if (cachedTag !== undefined) {
    return cachedTag;
  }

  const searchParams = new URLSearchParams({
    type: "contributor",
    q: trimmedAuthor,
    "page-size": "1",
  });
  const response = await fetch(`/api/guardian/tags?${searchParams}`);
  const parsed = guardianTagsResponseSchema.safeParse(await readJson(response));
  const resolvedTag = parsed.success
    ? (parsed.data.response.results[0]?.id ?? null)
    : null;

  contributorTagCache.set(trimmedAuthor, resolvedTag);

  return resolvedTag;
}

export function clearContributorTagCache(): void {
  contributorTagCache.clear();
}

async function resolveContributorTags(authors: string[]): Promise<string[]> {
  const resolvedTags = await Promise.all(authors.map(resolveContributorTag));

  return resolvedTags.filter((tag): tag is string => tag !== null);
}

export function normalizeGuardianContent(value: unknown): Article | null {
  const parsed = guardianContentSchema.safeParse(value);

  if (!parsed.success) {
    return null;
  }

  return mapGuardianContent(parsed.data);
}

function mapGuardianContent(content: GuardianContent): Article {
  return {
    id: content.id,
    source: SOURCE_ID,
    sourceLabel: SOURCE_LABEL,
    title: content.webTitle,
    description: content.fields?.trailText ?? null,
    body: content.fields?.body ?? null,
    author: content.fields?.byline ?? null,
    category: content.sectionName ?? null,
    imageUrl: content.fields?.thumbnail ?? null,
    url: content.webUrl,
    publishedAt: content.webPublicationDate,
  };
}

async function readJson(response: Response): Promise<unknown> {
  return readSourceJson(response, SOURCE_ID);
}

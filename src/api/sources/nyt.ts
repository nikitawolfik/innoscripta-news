import { format, parseISO } from "date-fns";

import { SourceUnavailableError } from "~/api/errors";
import { readSourceJson } from "~/api/read-source-response";
import {
  nytArticleSchema,
  nytSearchResponseSchema,
  type NytArticle,
} from "~/api/sources/nyt.schema";
import type {
  SearchResult,
  SourceCapabilities,
  SourceClient,
} from "~/api/types";
import { mapCategoriesForSource } from "~/lib/categories";
import type { Article } from "~/types/article";
import type { Filters } from "~/types/filters";

const SOURCE_ID = "nyt" as const;
const SOURCE_LABEL = "The New York Times";
const PAGE_SIZE = 10;
const NYT_IMAGE_BASE_URL = "https://www.nytimes.com/";

const CAPABILITIES: SourceCapabilities = {
  keyword: true,
  dateRange: true,
  category: true,
  author: true,
  body: false,
  fetchById: true,
};

export const nytClient: SourceClient = {
  id: SOURCE_ID,
  label: SOURCE_LABEL,
  capabilities: CAPABILITIES,
  unsupportedReason: () => null,
  search: searchNyt,
  fetchById: fetchNytById,
};

async function searchNyt(
  filters: Filters,
  page: number,
): Promise<SearchResult> {
  const upstreamPage = Math.max(0, page - 1);
  const searchParams = buildNytSearchParams(filters, upstreamPage);
  const payload = await fetchNytPayload(searchParams);
  const { articles, droppedInvalidCount } = normalizeNytDocuments(
    payload.response.docs,
  );

  return {
    articles,
    page,
    hasMore: (upstreamPage + 1) * PAGE_SIZE < payload.response.metadata.hits,
    droppedInvalidCount,
  };
}

async function fetchNytById(id: string): Promise<Article | null> {
  const searchParams = new URLSearchParams({
    fq: `_id:"${escapeFilterValue(id)}"`,
  });
  const payload = await fetchNytPayload(searchParams);
  const firstDocument = payload.response.docs[0];

  return firstDocument ? normalizeNytArticle(firstDocument) : null;
}

export function buildNytSearchParams(
  filters: Filters,
  upstreamPage: number,
): URLSearchParams {
  const searchParams = new URLSearchParams({
    page: String(upstreamPage),
    sort: "newest",
  });

  if (filters.q.trim()) {
    searchParams.set("q", filters.q.trim());
  }

  if (filters.from) {
    searchParams.set("begin_date", toNytDate(filters.from));
  }

  if (filters.to) {
    searchParams.set("end_date", toNytDate(filters.to));
  }

  const filterQuery = buildNytFilterQuery(filters);

  if (filterQuery) {
    searchParams.set("fq", filterQuery);
  }

  return searchParams;
}

export function toNytDate(value: string): string {
  return format(parseISO(value), "yyyyMMdd");
}

export function normalizeNytArticle(value: unknown): Article | null {
  const parsed = nytArticleSchema.safeParse(value);

  if (!parsed.success) {
    return null;
  }

  return mapNytArticle(parsed.data);
}

function buildNytFilterQuery(filters: Filters): string {
  const expressions: string[] = [];
  const sections = mapCategoriesForSource(filters.categories, SOURCE_ID);

  if (sections.length > 0) {
    expressions.push(buildFilterExpression("section_name", sections));
  }

  if (filters.authors.length > 0) {
    expressions.push(buildFilterExpression("byline", filters.authors));
  }

  return expressions.join(" AND ");
}

function buildFilterExpression(field: string, values: string[]): string {
  const alternatives = values
    .map((value) => `"${escapeFilterValue(value)}"`)
    .join(" OR ");

  return `${field}:(${alternatives})`;
}

function escapeFilterValue(value: string): string {
  return value.replaceAll("\\", "\\\\").replaceAll('"', '\\"');
}

async function fetchNytPayload(searchParams: URLSearchParams): Promise<{
  response: {
    docs: unknown[];
    metadata: { hits: number; offset: number };
  };
}> {
  const response = await fetch(
    `/api/nyt/articlesearch.json?${searchParams.toString()}`,
  );
  const payload = await readSourceJson(response, SOURCE_ID);
  const parsed = nytSearchResponseSchema.safeParse(payload);

  if (!parsed.success) {
    throw new SourceUnavailableError(
      SOURCE_ID,
      "NYT search response failed validation",
    );
  }

  return parsed.data;
}

function normalizeNytDocuments(documents: unknown[]): {
  articles: Article[];
  droppedInvalidCount: number;
} {
  const articles: Article[] = [];
  let droppedInvalidCount = 0;

  for (const document of documents) {
    const article = normalizeNytArticle(document);

    if (article) {
      articles.push(article);
    } else {
      droppedInvalidCount += 1;
    }
  }

  return { articles, droppedInvalidCount };
}

function mapNytArticle(article: NytArticle): Article {
  return {
    id: article._id,
    source: SOURCE_ID,
    sourceLabel: SOURCE_LABEL,
    title: article.headline.main,
    description:
      firstNonEmpty(
        article.abstract,
        article.snippet,
        article.lead_paragraph,
      ) ?? null,
    body: null,
    author: article.byline?.original ?? null,
    category: article.section_name ?? null,
    imageUrl: resolveNytImageUrl(
      article.multimedia?.default?.url ?? article.multimedia?.thumbnail?.url,
    ),
    url: article.web_url,
    publishedAt: article.pub_date,
  };
}

function firstNonEmpty(
  ...values: Array<string | null | undefined>
): string | undefined {
  return values.find((value) => Boolean(value?.trim())) ?? undefined;
}

/**
 * Current responses carry absolute static01.nyt.com URLs; older ones were
 * relative to nytimes.com. Resolving against the base handles both, since an
 * absolute input is returned unchanged.
 */
function resolveNytImageUrl(value: string | null | undefined): string | null {
  return value ? new URL(value, NYT_IMAGE_BASE_URL).toString() : null;
}

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
import type { Article } from "~/types/article";
import type { Filters } from "~/types/filters";

const SOURCE_ID = "nyt" as const;
const SOURCE_LABEL = "The New York Times";
const PAGE_SIZE = 10;
const NYT_IMAGE_BASE_URL = "https://www.nytimes.com/";

/**
 * Article Search returns **zero results for any request carrying `fq`** on the
 * free tier — verified against the live API with a healthy baseline in the same
 * run: `q=climate&sort=newest` gave 10,000 hits while
 * `fq=section_name:("Technology")` gave `docs: null`, as did NYT's own
 * documented `fq` example.
 *
 * Category filtering, author filtering and by-id lookup are all expressed
 * through `fq`, so all three are declared unsupported rather than issued as
 * queries that return nothing. Claiming support and quietly contributing no
 * articles is the failure this project avoids everywhere else.
 */
const CAPABILITIES: SourceCapabilities = {
  keyword: true,
  dateRange: true,
  category: false,
  author: false,
  body: false,
  fetchById: false,
};

export const nytClient: SourceClient = {
  id: SOURCE_ID,
  label: SOURCE_LABEL,
  capabilities: CAPABILITIES,
  unsupportedReason: nytUnsupportedReason,
  search: searchNyt,
  fetchById: null,
};

function nytUnsupportedReason(filters: Filters): string | null {
  if (filters.categories.length > 0) {
    return "The New York Times cannot filter by category on this API tier";
  }

  if (filters.authors.length > 0) {
    return "The New York Times cannot filter by author on this API tier";
  }

  return null;
}

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

function buildNytSearchParams(
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

  // No `fq` is ever sent: see CAPABILITIES above.
  return searchParams;
}

function toNytDate(value: string): string {
  return format(parseISO(value), "yyyyMMdd");
}

export function normalizeNytArticle(value: unknown): Article | null {
  const parsed = nytArticleSchema.safeParse(value);

  if (!parsed.success) {
    return null;
  }

  return mapNytArticle(parsed.data);
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

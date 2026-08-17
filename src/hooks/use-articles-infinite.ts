import { useInfiniteQuery, type InfiniteData } from "@tanstack/react-query";

import { RateLimitError } from "~/api/errors";
import { partitionSources } from "~/api/sources/registry";
import type { SourceClient, SourceFailure } from "~/api/types";
import type { Article } from "~/types/article";
import type { Filters } from "~/types/filters";
import type { SourceId } from "~/types/source";

const MAX_RETAINED_PAGES = 8;
const STALE_TIME_MS = 5 * 60 * 1000;
const MAX_TRANSIENT_RETRIES = 2;
const TRANSIENT_RETRY_BASE_MS = 1_000;
const TRANSIENT_RETRY_CAP_MS = 30_000;

export type SourceCursor = Partial<Record<SourceId, number>>;

export type ArticlesBatch = {
  articles: Article[];
  nextCursor: SourceCursor | undefined;
  degraded: SourceFailure[];
};

export type ArticlesFeed = {
  articles: Article[];
  degraded: SourceFailure[];
};

export function useArticlesInfinite(filters: Filters) {
  return useInfiniteQuery({
    queryKey: ["articles", filters],
    initialPageParam: initialCursor(filters),
    queryFn: ({ pageParam }) => fetchArticlesBatch(filters, pageParam),
    getNextPageParam: (lastPage: ArticlesBatch) => lastPage.nextCursor,
    maxPages: MAX_RETAINED_PAGES,
    staleTime: STALE_TIME_MS,
    retry: shouldRetryBatch,
    retryDelay: batchRetryDelay,
    select: selectFeed,
  });
}

/**
 * Never retry a rate limit: the 429 is already handled as degradation and the
 * countdown UI owns recovery — exponential backoff against a quota makes the
 * problem worse.
 */
export function shouldRetryBatch(failureCount: number, error: Error): boolean {
  return (
    !(error instanceof RateLimitError) && failureCount < MAX_TRANSIENT_RETRIES
  );
}

/**
 * When the whole batch rejects with a rate limit, the server already said when
 * to come back — honour that instead of the default exponential backoff.
 */
export function batchRetryDelay(failureCount: number, error: Error): number {
  if (error instanceof RateLimitError) {
    return error.retryAfterMs;
  }

  return Math.min(
    TRANSIENT_RETRY_BASE_MS * 2 ** failureCount,
    TRANSIENT_RETRY_CAP_MS,
  );
}

function initialCursor(filters: Filters): SourceCursor {
  const { eligible } = partitionSources(filters);
  const cursor: SourceCursor = {};

  for (const sourceClient of eligible) {
    cursor[sourceClient.id] = 1;
  }

  return cursor;
}

async function fetchArticlesBatch(
  filters: Filters,
  cursor: SourceCursor,
): Promise<ArticlesBatch> {
  const { eligible, excluded } = partitionSources(filters);
  const activeSources = eligible.filter(
    (sourceClient) => cursor[sourceClient.id] !== undefined,
  );
  const settled = await Promise.allSettled(
    activeSources.map((sourceClient) =>
      sourceClient.search(filters, cursor[sourceClient.id] ?? 1),
    ),
  );

  const articles: Article[] = [];
  const degraded: SourceFailure[] = [...excluded];
  const nextCursor: SourceCursor = {};
  const errors: Error[] = [];

  for (const [index, outcome] of settled.entries()) {
    const sourceClient = activeSources[index];

    if (!sourceClient) {
      continue;
    }

    const currentPage = cursor[sourceClient.id] ?? 1;

    if (outcome.status === "fulfilled") {
      articles.push(...outcome.value.articles);

      if (outcome.value.hasMore) {
        nextCursor[sourceClient.id] = currentPage + 1;
      }

      continue;
    }

    // A failed source keeps its current page number so it resumes where it
    // left off once it recovers, rather than silently skipping a page.
    nextCursor[sourceClient.id] = currentPage;
    degraded.push(toSourceFailure(sourceClient, outcome.reason));

    if (outcome.reason instanceof Error) {
      errors.push(outcome.reason);
    }
  }

  const allActiveFailed =
    activeSources.length > 0 &&
    settled.every((outcome) => outcome.status === "rejected");

  if (allActiveFailed) {
    throw pickBatchError(errors);
  }

  articles.sort((first, second) =>
    second.publishedAt.localeCompare(first.publishedAt),
  );

  return {
    articles,
    nextCursor: Object.keys(nextCursor).length > 0 ? nextCursor : undefined,
    degraded,
  };
}

function toSourceFailure(
  sourceClient: SourceClient,
  reason: unknown,
): SourceFailure {
  if (reason instanceof RateLimitError) {
    return {
      source: sourceClient.id,
      reason: "rate_limited",
      retryAt: reason.retryAt,
    };
  }

  return { source: sourceClient.id, reason: "unavailable" };
}

/**
 * Prefer the rate-limit error with the longest window so `retryDelay` and the
 * paused UI wait long enough for every source to recover.
 */
function pickBatchError(errors: Error[]): Error {
  const rateLimitErrors = errors.filter(
    (error): error is RateLimitError => error instanceof RateLimitError,
  );

  if (rateLimitErrors.length > 0) {
    return rateLimitErrors.reduce((longest, candidate) =>
      candidate.retryAfterMs > longest.retryAfterMs ? candidate : longest,
    );
  }

  return errors[0] ?? new Error("All sources failed");
}

function selectFeed(
  data: InfiniteData<ArticlesBatch, SourceCursor>,
): ArticlesFeed {
  const lastPage = data.pages.at(-1);

  return {
    articles: data.pages.flatMap((page) => page.articles),
    degraded: lastPage?.degraded ?? [],
  };
}

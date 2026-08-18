import {
  useQuery,
  useQueryClient,
  type QueryClient,
} from "@tanstack/react-query";

import { getSourceClient } from "~/api/sources/registry";
import type { ArticlesBatch } from "~/hooks/use-articles-infinite";
import type { Article } from "~/types/article";
import { isSourceId, type SourceId } from "~/types/source";

const STALE_TIME_MS = 5 * 60 * 1000;

export type ArticleResolution =
  | { status: "found"; article: Article }
  /** The source has no by-id endpoint, so a cold deep link cannot be resolved. */
  | { status: "unresolvable"; source: SourceId }
  | { status: "not-found" };

/**
 * Resolves one article, cache first.
 *
 * Clicking through from the feed is the common path and it costs nothing: the
 * article is already in the infinite query's cache. Only a cold deep link — a
 * shared URL or a hard refresh — falls through to the network, and only some
 * sources can serve that at all.
 */
export function useArticle(
  source: string | undefined,
  articleId: string | null,
) {
  const queryClient = useQueryClient();

  return useQuery<ArticleResolution>({
    queryKey: ["article", source, articleId],
    staleTime: STALE_TIME_MS,
    queryFn: () => resolveArticle(queryClient, source, articleId),
  });
}

export async function resolveArticle(
  queryClient: QueryClient,
  source: string | undefined,
  articleId: string | null,
): Promise<ArticleResolution> {
  if (!source || !isSourceId(source) || !articleId) {
    return { status: "not-found" };
  }

  const cached = findCachedArticle(queryClient, source, articleId);

  if (cached) {
    return { status: "found", article: cached };
  }

  const sourceClient = getSourceClient(source);

  if (!sourceClient) {
    return { status: "not-found" };
  }

  if (!sourceClient.fetchById) {
    return { status: "unresolvable", source };
  }

  const article = await sourceClient.fetchById(articleId);

  return article ? { status: "found", article } : { status: "not-found" };
}

/**
 * Scans every cached feed. Note this reads the raw cached `ArticlesBatch`
 * pages, not the shape `useArticlesInfinite` exposes — `select` transforms on
 * read and never touches what is stored.
 */
function findCachedArticle(
  queryClient: QueryClient,
  source: SourceId,
  articleId: string,
): Article | undefined {
  const entries = queryClient.getQueriesData<{ pages: ArticlesBatch[] }>({
    queryKey: ["articles"],
  });

  for (const [, data] of entries) {
    for (const page of data?.pages ?? []) {
      const match = page.articles.find(
        (article) => article.source === source && article.id === articleId,
      );

      if (match) {
        return match;
      }
    }
  }

  return undefined;
}

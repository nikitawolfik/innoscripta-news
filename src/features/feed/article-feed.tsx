import { useEffect, useRef } from "react";

import { useWindowVirtualizer } from "@tanstack/react-virtual";

import { RateLimitError } from "~/api/errors";
import type { SourceFailure } from "~/api/types";
import { ArticleCard } from "~/features/feed/article-card";
import { ExcludedSourcesNotice } from "~/features/feed/excluded-sources-notice";
import { FeedEmpty } from "~/features/feed/feed-empty";
import { FeedError } from "~/features/feed/feed-error";
import { FeedPausedFooter } from "~/features/feed/feed-paused-footer";
import { FeedSkeleton, FeedSkeletonRow } from "~/features/feed/feed-skeleton";
import {
  ROW_HEIGHT_DESKTOP,
  ROW_HEIGHT_MOBILE,
} from "~/features/feed/row-height";
import { DESKTOP_MEDIA_QUERY } from "~/lib/breakpoints";
import { useArticlesInfinite } from "~/hooks/use-articles-infinite";
import { useMediaQuery } from "~/hooks/use-media-query";
import { useRetryCountdown } from "~/hooks/use-retry-countdown";
import type { Filters } from "~/types/filters";
import type { SourceId } from "~/types/source";

const OVERSCAN = 6;

type PausedState = {
  source: SourceId;
  retryAt: number;
} | null;

interface Props {
  filters: Filters;
  onResetFilters?: () => void;
}

export function ArticleFeed({ filters, onResetFilters }: Props) {
  const query = useArticlesInfinite(filters);
  const isDesktop = useMediaQuery(DESKTOP_MEDIA_QUERY);
  const rowHeight = isDesktop ? ROW_HEIGHT_DESKTOP : ROW_HEIGHT_MOBILE;
  const listRef = useRef<HTMLDivElement | null>(null);

  const articles = query.data?.articles ?? [];
  const degraded = query.data?.degraded ?? [];
  const paused = resolvePausedState(degraded, query.error);

  const resume = () => {
    if (query.hasNextPage) {
      query.fetchNextPage();
    } else {
      query.refetch();
    }
  };

  // One countdown owns auto-recovery for the whole feed; the notice and the
  // footer only display their own remaining time.
  const cooldownSeconds = useRetryCountdown(paused?.retryAt ?? null, resume);
  const coolingDown = paused !== null && cooldownSeconds > 0;

  const virtualizer = useWindowVirtualizer({
    count: articles.length,
    estimateSize: () => rowHeight,
    overscan: OVERSCAN,
    scrollMargin: listRef.current?.offsetTop ?? 0,
  });

  useEffect(() => {
    virtualizer.measure();
  }, [virtualizer, rowHeight]);

  const virtualItems = virtualizer.getVirtualItems();
  const lastVirtualItemIndex = virtualItems.at(-1)?.index;
  const { hasNextPage, isFetchingNextPage, fetchNextPage } = query;

  // Gating on the cooldown is not optional: the virtualizer re-evaluates this
  // threshold on every scroll frame, so an unguarded 429 becomes a request
  // storm.
  useEffect(() => {
    if (lastVirtualItemIndex === undefined) {
      return;
    }

    if (lastVirtualItemIndex < articles.length - OVERSCAN) {
      return;
    }

    if (!hasNextPage || isFetchingNextPage || coolingDown) {
      return;
    }

    fetchNextPage();
  }, [
    lastVirtualItemIndex,
    articles.length,
    hasNextPage,
    isFetchingNextPage,
    coolingDown,
    fetchNextPage,
  ]);

  if (query.isPending) {
    return <FeedSkeleton />;
  }

  if (query.isError && query.data === undefined) {
    if (query.error instanceof RateLimitError && paused) {
      return (
        <FeedPausedFooter
          source={paused.source}
          retryAt={paused.retryAt}
          onRetry={resume}
        />
      );
    }

    return (
      <FeedError
        message={query.error.message}
        onRetry={() => query.refetch()}
      />
    );
  }

  if (articles.length === 0) {
    // The notice renders here too. An empty feed is most often empty *because*
    // sources declined the filters, so this is exactly when the reader needs
    // the reason — "no articles match" on its own reads like there is nothing
    // to find, rather than that nothing was asked.
    return (
      <div>
        <ExcludedSourcesNotice failures={degraded} onRetry={resume} />
        <FeedEmpty onReset={onResetFilters} />
      </div>
    );
  }

  let tail: React.ReactNode = null;

  if (isFetchingNextPage) {
    tail = <FeedSkeletonRow />;
  } else if (coolingDown && paused) {
    tail = (
      <FeedPausedFooter
        source={paused.source}
        retryAt={paused.retryAt}
        onRetry={resume}
      />
    );
  } else if (!hasNextPage) {
    tail = (
      <p className="py-8 text-center text-sm text-muted-foreground">
        You&apos;re all caught up.
      </p>
    );
  }

  return (
    <div>
      <ExcludedSourcesNotice failures={degraded} onRetry={resume} />

      <div ref={listRef}>
        {/* Inline styles are required here: the virtualizer computes the list
            height and per-row offsets at runtime. */}
        <div
          className="relative w-full"
          style={{ height: virtualizer.getTotalSize() }}
        >
          {virtualItems.map((virtualItem) => {
            const article = articles[virtualItem.index];

            if (!article) {
              return null;
            }

            return (
              <div
                key={virtualItem.key}
                className="absolute top-0 left-0 w-full"
                style={{
                  height: virtualItem.size,
                  transform: `translateY(${virtualItem.start - virtualizer.options.scrollMargin}px)`,
                }}
              >
                <ArticleCard article={article} />
              </div>
            );
          })}
        </div>
      </div>

      {tail}
    </div>
  );
}

function resolvePausedState(
  degraded: SourceFailure[],
  error: Error | null,
): PausedState {
  let paused: PausedState = null;

  for (const failure of degraded) {
    if (failure.reason !== "rate_limited") {
      continue;
    }

    if (paused === null || failure.retryAt > paused.retryAt) {
      paused = { source: failure.source, retryAt: failure.retryAt };
    }
  }

  if (
    error instanceof RateLimitError &&
    (paused === null || error.retryAt > paused.retryAt)
  ) {
    paused = { source: error.source, retryAt: error.retryAt };
  }

  return paused;
}

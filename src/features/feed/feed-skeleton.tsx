import { Skeleton } from "~/components/ui/skeleton";
import { ROW_HEIGHT_CLASS } from "~/features/feed/row-height";
import { cn } from "~/lib/utils";

const SKELETON_ROW_COUNT = 6;
const SKELETON_ROW_KEYS = Array.from(
  { length: SKELETON_ROW_COUNT },
  (_, index) => `feed-skeleton-row-${index}`,
);

// Rows match the fixed feed row height so the swap to real cards causes no
// layout shift — never a spinner in the feed.
export function FeedSkeleton() {
  return (
    <div role="status" aria-label="Loading articles">
      {SKELETON_ROW_KEYS.map((rowKey) => (
        <FeedSkeletonRow key={rowKey} />
      ))}
    </div>
  );
}

export function FeedSkeletonRow() {
  return (
    <div
      className={cn(
        "flex flex-col gap-2 border-b border-border p-3 md:flex-row md:gap-4 md:p-4",
        ROW_HEIGHT_CLASS,
      )}
    >
      <Skeleton className="h-36 w-full shrink-0 rounded-lg md:h-full md:w-44" />
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-10 w-full shrink-0 md:h-12" />
        <Skeleton className="h-5 w-3/4" />
      </div>
    </div>
  );
}

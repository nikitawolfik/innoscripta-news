import { Skeleton } from "~/components/ui/skeleton";

export function ArticleDetailSkeleton() {
  return (
    <div
      role="status"
      aria-label="Loading article"
      className="mx-auto max-w-prose space-y-4"
    >
      <Skeleton className="h-4 w-32" />
      <Skeleton className="h-8 w-full" />
      <Skeleton className="h-8 w-3/4" />
      <Skeleton className="h-48 w-full rounded-lg" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-5/6" />
    </div>
  );
}

import { PauseCircle } from "lucide-react";

import { getSourceLabel } from "~/api/sources/registry";
import { Button } from "~/components/ui/button";
import { useRetryCountdown } from "~/hooks/use-retry-countdown";
import type { SourceId } from "~/types/source";

interface Props {
  source: SourceId;
  retryAt: number;
  onRetry: () => void;
}

// Replaces the loading skeleton at the list tail while every remaining source
// cools down. Display-only countdown: ArticleFeed owns the auto-resume so the
// refetch fires exactly once, never an infinite spinner.
export function FeedPausedFooter({ source, retryAt, onRetry }: Props) {
  const secondsRemaining = useRetryCountdown(retryAt);

  return (
    <div
      role="status"
      className="flex flex-col items-center gap-2 py-8 text-center text-sm text-muted-foreground"
    >
      <PauseCircle className="size-6" aria-hidden="true" />
      <p>
        Paused — {getSourceLabel(source)} is rate-limited, resuming in&#32;
        {secondsRemaining}s
      </p>
      <Button variant="outline" size="sm" onClick={onRetry}>
        Retry now
      </Button>
    </div>
  );
}

import { Info } from "lucide-react";

import { getSourceLabel } from "~/api/sources/registry";
import type { SourceFailure } from "~/api/types";
import { Button } from "~/components/ui/button";
import { useRetryCountdown } from "~/hooks/use-retry-countdown";

interface Props {
  failures: SourceFailure[];
  onRetry: () => void;
}

// The three reasons are different problems for the user: `excluded` is
// permanent for these filters, `rate_limited` recovers on its own, and
// `unavailable` deserves a manual retry. Render them distinctly.
export function ExcludedSourcesNotice({ failures, onRetry }: Props) {
  if (failures.length === 0) {
    return null;
  }

  return (
    <aside
      aria-live="polite"
      className="mb-4 space-y-1 rounded-lg border border-border bg-muted/50 p-3 text-sm text-muted-foreground"
    >
      {failures.map((failure) => (
        <FailureLine
          key={`${failure.source}-${failure.reason}`}
          failure={failure}
          onRetry={onRetry}
        />
      ))}
    </aside>
  );
}

interface FailureLineProps {
  failure: SourceFailure;
  onRetry: () => void;
}

function FailureLine({ failure, onRetry }: FailureLineProps) {
  const sourceLabel = getSourceLabel(failure.source);

  if (failure.reason === "excluded") {
    return <NoticeLine>{failure.detail}</NoticeLine>;
  }

  if (failure.reason === "rate_limited") {
    return (
      <RateLimitedLine sourceLabel={sourceLabel} retryAt={failure.retryAt} />
    );
  }

  return (
    <NoticeLine>
      {sourceLabel} is temporarily unavailable.
      <Button
        variant="link"
        size="sm"
        className="h-auto p-0 pl-1"
        onClick={onRetry}
      >
        Retry
      </Button>
    </NoticeLine>
  );
}

interface RateLimitedLineProps {
  sourceLabel: string;
  retryAt: number;
}

// Display-only countdown: ArticleFeed owns the auto-resume so recovery fires
// exactly one refetch, not one per notice line.
function RateLimitedLine({ sourceLabel, retryAt }: RateLimitedLineProps) {
  const secondsRemaining = useRetryCountdown(retryAt);

  return (
    <NoticeLine>
      {sourceLabel} is rate-limited — resuming in {secondsRemaining}s
    </NoticeLine>
  );
}

function NoticeLine({ children }: { children: React.ReactNode }) {
  return (
    <p className="flex items-center gap-2">
      <Info className="size-4 shrink-0" aria-hidden="true" />
      <span>{children}</span>
    </p>
  );
}

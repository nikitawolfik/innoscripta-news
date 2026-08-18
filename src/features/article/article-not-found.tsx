import { Link } from "react-router-dom";

import { Button } from "~/components/ui/button";

interface Props {
  onRetry?: () => void;
  message?: string;
}

export function ArticleNotFound({ onRetry, message }: Props) {
  return (
    <div className="mx-auto max-w-prose py-16 text-center">
      <h1 className="text-xl font-semibold">Article not found</h1>
      <p className="mt-3 text-sm text-muted-foreground">
        {message ??
          "That link doesn’t point at an article we can load. It may have been mistyped, or the source may no longer publish it."}
      </p>
      <div className="mt-6 flex justify-center gap-2">
        {onRetry ? (
          <Button variant="outline" onClick={onRetry}>
            Try again
          </Button>
        ) : null}
        <Button asChild>
          <Link to="/">Back to the feed</Link>
        </Button>
      </div>
    </div>
  );
}

import { Link } from "react-router-dom";

import { getSourceLabel } from "~/api/sources/registry";
import { Button } from "~/components/ui/button";
import type { SourceId } from "~/types/source";

interface Props {
  source: SourceId;
  url?: string;
}

/**
 * Shown when a source cannot resolve an article from its id alone. NewsAPI is
 * the case that matters: its articles carry no identifier, only a URL, so a
 * link opened in a fresh tab has nothing to fetch. Saying so plainly beats a
 * spinner that never resolves or a "not found" that blames the article.
 */
export function ArticleUnavailable({ source, url }: Props) {
  return (
    <div className="mx-auto max-w-prose py-16 text-center">
      <h1 className="text-xl font-semibold">
        This article can’t be opened here
      </h1>
      <p className="mt-3 text-sm text-muted-foreground">
        {getSourceLabel(source)} doesn’t offer a way to look an article up by
        id, so it can only be read here when you arrive from the feed. Opening
        the link directly — from a bookmark or a shared URL — leaves nothing to
        fetch.
      </p>
      <div className="mt-6 flex justify-center gap-2">
        {url ? (
          <Button asChild>
            <a href={url} target="_blank" rel="noreferrer">
              Read at {getSourceLabel(source)}
            </a>
          </Button>
        ) : null}
        <Button variant="outline" asChild>
          <Link to="/">Back to the feed</Link>
        </Button>
      </div>
    </div>
  );
}

import { CircleAlert } from "lucide-react";
import { Link, useRouteError } from "react-router-dom";

import { Button } from "~/components/ui/button";

/**
 * Last resort for a render that threw.
 *
 * Every *async* failure is already a designed state — a failed source, a rate
 * limit, an unresolvable article each render their own explanation. This
 * catches the other kind: an exception thrown while rendering, which otherwise
 * unmounts the whole tree and leaves a blank page. Merging three third-party
 * feeds means unanticipated data is a standing hazard, not a hypothetical.
 *
 * Mounted on the child routes rather than the layout, so the header and its
 * navigation survive and the reader can leave without reloading.
 */
export function RouteError() {
  const error = useRouteError();

  return (
    <section className="flex flex-col items-center gap-3 py-16 text-center">
      <CircleAlert className="size-8 text-destructive" aria-hidden="true" />
      <h1 className="text-xl font-semibold">Something went wrong</h1>
      <p className="max-w-prose text-sm text-muted-foreground">
        {toMessage(error)}
      </p>
      <div className="mt-2 flex flex-wrap justify-center gap-2">
        {/* A full reload, deliberately: the tree that threw is not in a state
            worth re-rendering, and a router navigation would keep it. */}
        <Button variant="outline" onClick={() => window.location.reload()}>
          Reload the page
        </Button>
        <Button asChild>
          <Link to="/" reloadDocument>
            Back to Discover
          </Link>
        </Button>
      </div>
    </section>
  );
}

function toMessage(error: unknown): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return "An unexpected error interrupted this page.";
}

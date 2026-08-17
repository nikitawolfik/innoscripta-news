import { useQuery } from "@tanstack/react-query";

import { guardianClient } from "~/api/sources/guardian";
import { DEFAULT_FILTERS } from "~/types/filters";

export function DiscoverRoute() {
  const query = useQuery({
    queryKey: ["p2-guardian-smoke"],
    queryFn: () => guardianClient.search(DEFAULT_FILTERS, 1),
  });

  return (
    <section>
      <h1 className="text-2xl font-semibold">Discover</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Temporary Guardian smoke list (P2). Replaced by the real feed in P3.
      </p>

      {query.isPending ? (
        <p className="mt-6 text-sm text-muted-foreground">Loading headlines…</p>
      ) : null}

      {query.isError ? (
        <p className="mt-6 text-sm text-destructive">
          {query.error instanceof Error
            ? query.error.message
            : "Failed to load Guardian headlines"}
        </p>
      ) : null}

      {query.data ? (
        <ul className="mt-6 space-y-3">
          {query.data.articles.map((article) => (
            <li key={article.id} className="border-b border-border pb-3">
              <a
                href={article.url}
                className="font-medium text-foreground hover:underline"
                target="_blank"
                rel="noreferrer"
              >
                {article.title}
              </a>
              <p className="mt-1 text-xs text-muted-foreground">
                {article.sourceLabel}
                {article.author ? ` · ${article.author}` : ""}
                {` · ${article.publishedAt}`}
              </p>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}

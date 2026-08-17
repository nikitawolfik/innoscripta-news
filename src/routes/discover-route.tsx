import { ArticleFeed } from "~/features/feed/article-feed";
import { DEFAULT_FILTERS } from "~/types/filters";

export function DiscoverRoute() {
  return (
    <section>
      <h1 className="sr-only">Discover</h1>
      {/* FilterBar with URL-backed filters arrives in P5; until then the feed
          renders with the defaults. */}
      <ArticleFeed filters={DEFAULT_FILTERS} />
    </section>
  );
}

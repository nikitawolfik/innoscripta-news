import { ArticleFeed } from "~/features/feed/article-feed";
import { FilterBar } from "~/features/filters/filter-bar";
import { useUrlFilters } from "~/hooks/use-url-filters";
import { DEFAULT_FILTERS } from "~/types/filters";

export function DiscoverRoute() {
  const [filters, setFilters] = useUrlFilters();

  return (
    <section>
      <h1 className="sr-only">Discover</h1>
      <FilterBar filters={filters} setFilters={setFilters} />
      <ArticleFeed
        filters={filters}
        onResetFilters={() => setFilters(DEFAULT_FILTERS)}
      />
    </section>
  );
}

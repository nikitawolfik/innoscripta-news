import { ArticleFeed } from "~/features/feed/article-feed";
import { FilterBar } from "~/features/filters/filter-bar";
import { FeedOnboarding } from "~/features/preferences/feed-onboarding";
import { usePreferenceFilters } from "~/hooks/use-preference-filters";
import { countActiveFilterGroups } from "~/lib/filters";
import { DEFAULT_FILTERS } from "~/types/filters";

/**
 * Identical to the Discover route apart from the adapter hook — the filter bar
 * here *is* the preferences editor, so there is no separate settings page to
 * fill in and navigate away from.
 */
export function FeedRoute() {
  const [filters, setFilters] = usePreferenceFilters();
  const hasPreferences = countActiveFilterGroups(filters) > 0;

  return (
    <section>
      <title>My feed</title>
      <h1 className="sr-only">My feed</h1>
      <FilterBar filters={filters} setFilters={setFilters} />
      {hasPreferences ? (
        <ArticleFeed
          filters={filters}
          onResetFilters={() => setFilters(DEFAULT_FILTERS)}
        />
      ) : (
        <FeedOnboarding />
      )}
    </section>
  );
}

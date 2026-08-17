import { FilterControls } from "~/features/filters/filter-controls";
import { FilterSheet } from "~/features/filters/filter-sheet";
import { SearchInput } from "~/features/filters/search-input";
import { cn } from "~/lib/utils";
import { STICKY_BELOW_HEADER_CLASS } from "~/routes/app-layout";
import type { Filters, SetFilters } from "~/types/filters";

interface Props {
  filters: Filters;
  setFilters: SetFilters;
}

/**
 * Adapter-agnostic: renders whatever `[filters, setFilters]` tuple it is
 * given, so `/` (URL params) and `/feed` (preferences store) share it.
 * Sticky below the fixed header — z-30 keeps it under the header (z-40) and
 * under Radix portals (z-50).
 */
export function FilterBar({ filters, setFilters }: Props) {
  return (
    <div
      className={cn(
        "sticky z-30 -mx-4 border-b border-border bg-background px-4 py-2",
        STICKY_BELOW_HEADER_CLASS,
      )}
    >
      <div className="flex items-center gap-2">
        <SearchInput
          value={filters.q}
          onChange={(nextQuery) => setFilters({ q: nextQuery })}
        />
        <div className="md:hidden">
          <FilterSheet filters={filters} setFilters={setFilters} />
        </div>
      </div>
      <FilterControls
        filters={filters}
        setFilters={setFilters}
        className="mt-2 hidden flex-wrap items-center md:flex"
      />
    </div>
  );
}

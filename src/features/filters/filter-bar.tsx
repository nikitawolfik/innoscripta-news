import { FilterControls } from "~/features/filters/filter-controls";
import { FilterSheet } from "~/features/filters/filter-sheet";
import { SearchInput } from "~/features/filters/search-input";
import { useMediaQuery } from "~/hooks/use-media-query";
import { DESKTOP_MEDIA_QUERY } from "~/lib/breakpoints";
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
  // Unmounted above the breakpoint rather than hidden with `md:hidden`: Radix
  // portals the sheet to document.body, so a class on the trigger's wrapper
  // never reaches the open panel. Resizing past the breakpoint with the sheet
  // open would otherwise strand an overlay on a layout that has no sheet.
  const isDesktop = useMediaQuery(DESKTOP_MEDIA_QUERY);

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
          // Replaces rather than pushes: a debounced search would otherwise
          // leave one history entry per typing pause, so Back would walk the
          // query letter by letter instead of leaving the page.
          onChange={(nextQuery) =>
            setFilters({ q: nextQuery }, { replace: true })
          }
        />
        {isDesktop ? null : (
          <FilterSheet filters={filters} setFilters={setFilters} />
        )}
      </div>
      {/* Inline, not portaled — a CSS breakpoint is sufficient here. */}
      <FilterControls
        filters={filters}
        setFilters={setFilters}
        className="mt-2 hidden flex-wrap items-center md:flex"
      />
    </div>
  );
}

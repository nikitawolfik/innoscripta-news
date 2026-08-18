import { SOURCES } from "~/api/sources/registry";
import { Button } from "~/components/ui/button";
import { AuthorInput } from "~/features/filters/author-input";
import { DateRangePicker } from "~/features/filters/date-range-picker";
import {
  MultiSelect,
  type MultiSelectOption,
} from "~/features/filters/multi-select";
import { CATEGORY_OPTIONS } from "~/lib/categories";
import { countActiveFilterGroups } from "~/lib/filters";
import { cn } from "~/lib/utils";
import {
  DEFAULT_FILTERS,
  type Filters,
  type SetFilters,
} from "~/types/filters";
import { isSourceId } from "~/types/source";

const SOURCE_OPTIONS: MultiSelectOption[] = SOURCES.map((sourceClient) => ({
  value: sourceClient.id,
  label: sourceClient.label,
}));

const CATEGORY_SELECT_OPTIONS: MultiSelectOption[] = CATEGORY_OPTIONS.map(
  (option) => ({ value: option.id, label: option.label }),
);

interface Props {
  filters: Filters;
  setFilters: SetFilters;
  className?: string;
  orientation?: "row" | "column";
}

/**
 * The controls minus the search input, shared by the desktop bar (row) and
 * the mobile sheet (column) — only the wrapping layout differs.
 */
export function FilterControls({
  filters,
  setFilters,
  className,
  orientation = "row",
}: Props) {
  const hasActiveFilters = countActiveFilterGroups(filters) > 0;
  // Stacked in the mobile sheet, each trigger fills the width — so the label
  // sits hard left and the chevron hard right instead of huddling in the
  // middle. In a row the triggers are content-width and need neither.
  const triggerClassName =
    orientation === "column" ? "w-full justify-between" : undefined;

  return (
    <div className={cn("flex gap-2", className)}>
      <DateRangePicker
        from={filters.from}
        to={filters.to}
        onChange={(range) => setFilters(range)}
        triggerClassName={triggerClassName}
      />
      <MultiSelect
        label="Sources"
        options={SOURCE_OPTIONS}
        values={filters.sources}
        onChange={(sources) =>
          setFilters({ sources: sources.filter(isSourceId) })
        }
        triggerClassName={triggerClassName}
      />
      <MultiSelect
        label="Categories"
        options={CATEGORY_SELECT_OPTIONS}
        values={filters.categories}
        onChange={(categories) => setFilters({ categories })}
        triggerClassName={triggerClassName}
      />
      <AuthorInput
        authors={filters.authors}
        onChange={(authors) => setFilters({ authors })}
      />
      {hasActiveFilters ? (
        <Button
          variant="outline"
          className={orientation === "column" ? "w-full" : undefined}
          onClick={() => setFilters(DEFAULT_FILTERS)}
        >
          Reset
        </Button>
      ) : null}
    </div>
  );
}

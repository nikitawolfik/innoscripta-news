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
}

/**
 * The controls minus the search input, shared by the desktop bar (row) and
 * the mobile sheet (column) — only the wrapping layout differs.
 */
export function FilterControls({ filters, setFilters, className }: Props) {
  const hasActiveFilters = countActiveFilterGroups(filters) > 0;

  return (
    <div className={cn("flex gap-2", className)}>
      <DateRangePicker
        from={filters.from}
        to={filters.to}
        onChange={(range) => setFilters(range)}
      />
      <MultiSelect
        label="Sources"
        options={SOURCE_OPTIONS}
        values={filters.sources}
        onChange={(sources) =>
          setFilters({ sources: sources.filter(isSourceId) })
        }
      />
      <MultiSelect
        label="Categories"
        options={CATEGORY_SELECT_OPTIONS}
        values={filters.categories}
        onChange={(categories) => setFilters({ categories })}
      />
      <AuthorInput
        authors={filters.authors}
        onChange={(authors) => setFilters({ authors })}
      />
      {hasActiveFilters ? (
        <Button variant="ghost" onClick={() => setFilters(DEFAULT_FILTERS)}>
          Reset
        </Button>
      ) : null}
    </div>
  );
}

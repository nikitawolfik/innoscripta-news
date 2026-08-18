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
import type { Filters, SetFilters } from "~/types/filters";
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
  onApply: () => void;
  onReset: () => void;
  isDirty: boolean;
  className?: string;
  orientation?: "row" | "column";
}

/**
 * The controls minus the search input, shared by the desktop bar (row) and
 * the mobile sheet (column) — only the wrapping layout differs.
 *
 * Every control here edits a draft; nothing reaches the feed until Apply. The
 * search input is deliberately outside this set and stays live.
 */
export function FilterControls({
  filters,
  setFilters,
  onApply,
  onReset,
  isDirty,
  className,
  orientation = "row",
}: Props) {
  const hasActiveFilters = countActiveFilterGroups(filters) > 0;
  const buttonClassName = orientation === "column" ? "w-full" : undefined;
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
      {/* Disabled rather than unmounted. Applying updates the draft and the
          filters through two different stores, so a render can land between
          them where the draft has briefly reverted — mounting on that would
          make the button blink and shift the row. */}
      <Button
        variant="outline"
        className={buttonClassName}
        // Clearing everything is unambiguous, so it skips the draft and
        // commits straight away rather than needing a second click.
        onClick={onReset}
        disabled={!hasActiveFilters}
      >
        Reset
      </Button>
      <Button className={buttonClassName} onClick={onApply} disabled={!isDirty}>
        Apply
      </Button>
    </div>
  );
}

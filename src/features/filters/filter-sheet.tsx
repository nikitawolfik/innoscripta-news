import { useState } from "react";

import { SlidersHorizontal } from "lucide-react";

import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "~/components/ui/sheet";
import { FilterControls } from "~/features/filters/filter-controls";
import { countActiveFilterGroups } from "~/lib/filters";
import type { Filters, SetFilters } from "~/types/filters";

interface Props {
  filters: Filters;
  setFilters: SetFilters;
  onApply: () => void;
  onReset: () => void;
  onDiscard: () => void;
  isDirty: boolean;
}

/** Mobile: the filter controls collapse into a sheet behind one trigger. */
export function FilterSheet({
  filters,
  setFilters,
  onApply,
  onReset,
  onDiscard,
  isDirty,
}: Props) {
  const [open, setOpen] = useState(false);
  const activeCount = countActiveFilterGroups(filters, {
    includeQuery: false,
  });

  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen);

    // Dismissing abandons the draft. The sheet covers the feed on mobile, so
    // selections left unapplied would otherwise sit invisible behind it and
    // surprise the reader the next time they opened the panel.
    if (!nextOpen) {
      onDiscard();
    }
  }

  function handleApply() {
    onApply();
    setOpen(false);
  }

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetTrigger asChild>
        <Button variant="outline" aria-label="Open filters">
          <SlidersHorizontal aria-hidden="true" />
          Filters
          {activeCount > 0 ? (
            <Badge variant="secondary">{activeCount}</Badge>
          ) : null}
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-72">
        <SheetHeader>
          <SheetTitle>Filters</SheetTitle>
          <SheetDescription>
            Narrow the feed by date, source, category or author.
          </SheetDescription>
        </SheetHeader>
        <FilterControls
          filters={filters}
          setFilters={setFilters}
          onApply={handleApply}
          onReset={onReset}
          isDirty={isDirty}
          orientation="column"
          className="flex-col px-4"
        />
      </SheetContent>
    </Sheet>
  );
}

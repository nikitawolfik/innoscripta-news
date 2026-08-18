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
}

/** Mobile: the filter controls collapse into a sheet behind one trigger. */
export function FilterSheet({ filters, setFilters }: Props) {
  const activeCount = countActiveFilterGroups(filters);

  return (
    <Sheet>
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
          orientation="column"
          className="flex-col px-4"
        />
      </SheetContent>
    </Sheet>
  );
}

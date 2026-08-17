import { SearchX } from "lucide-react";

import { Button } from "~/components/ui/button";

interface Props {
  onReset?: () => void;
}

export function FeedEmpty({ onReset }: Props) {
  return (
    <div className="flex flex-col items-center gap-3 py-16 text-center">
      <SearchX className="size-8 text-muted-foreground" aria-hidden="true" />
      <p className="font-medium text-foreground">
        No articles match these filters
      </p>
      <p className="text-sm text-muted-foreground">
        Try a different keyword or widen the date range.
      </p>
      {onReset ? (
        <Button variant="outline" onClick={onReset}>
          Reset filters
        </Button>
      ) : null}
    </div>
  );
}

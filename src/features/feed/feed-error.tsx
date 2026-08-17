import { CircleAlert } from "lucide-react";

import { Button } from "~/components/ui/button";

interface Props {
  message: string;
  onRetry: () => void;
}

export function FeedError({ message, onRetry }: Props) {
  return (
    <div className="flex flex-col items-center gap-3 py-16 text-center">
      <CircleAlert className="size-8 text-destructive" aria-hidden="true" />
      <p className="font-medium text-foreground">Couldn&apos;t load the feed</p>
      <p className="text-sm text-muted-foreground">{message}</p>
      <Button variant="outline" onClick={onRetry}>
        Try again
      </Button>
    </div>
  );
}

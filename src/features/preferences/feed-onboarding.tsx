import { Settings2 } from "lucide-react";

/**
 * Shown when no preference is set yet. Without it `/feed` would render exactly
 * what `/` renders, leaving the reader with two identical pages and no clue
 * that one of them is theirs to shape.
 */
export function FeedOnboarding() {
  return (
    <div className="flex flex-col items-center gap-3 py-16 text-center">
      <Settings2 className="size-8 text-muted-foreground" aria-hidden="true" />
      <h2 className="text-lg font-semibold">Build your feed</h2>
      <p className="max-w-sm text-sm text-muted-foreground">
        Pick sources, categories or authors in the bar above. Your choices are
        saved on this device and this page will keep showing them.
      </p>
    </div>
  );
}

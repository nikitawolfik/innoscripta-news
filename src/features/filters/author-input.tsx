import { useState } from "react";

import { X } from "lucide-react";

import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { cn } from "~/lib/utils";

interface Props {
  authors: string[];
  onChange: (authors: string[]) => void;
  className?: string;
}

/**
 * Authors are committed explicitly — by pressing Enter or the Add button —
 * never on blur or per keystroke. Each name costs a Guardian contributor-tag
 * lookup, so a half-typed name must not reach the filters.
 *
 * Note commas are *not* treated as separators: display names contain them
 * ("Smith, Jr."), which is the same reason the URL carries one repeated
 * `author` param per name instead of a joined list.
 */
export function AuthorInput({ authors, onChange, className }: Props) {
  const [draft, setDraft] = useState("");
  const trimmedDraft = draft.trim();

  function addAuthor() {
    if (!trimmedDraft || authors.includes(trimmedDraft)) {
      setDraft("");
      return;
    }

    onChange([...authors, trimmedDraft]);
    setDraft("");
  }

  function removeAuthor(target: string) {
    onChange(authors.filter((author) => author !== target));
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter") {
      // The bar sits inside a form-less sheet, but stop Enter from doing
      // anything else surprising.
      event.preventDefault();
      addAuthor();
      return;
    }

    // Backspace in an empty field removes the last chip, as this pattern does
    // everywhere else.
    const lastAuthor = authors.at(-1);

    if (event.key === "Backspace" && !draft && lastAuthor) {
      removeAuthor(lastAuthor);
    }
  }

  return (
    <div className={cn("flex w-full items-start gap-2", className)}>
      <div className="flex min-h-9 w-full flex-1 flex-wrap items-center gap-1 rounded-md border border-input bg-transparent px-2 py-1 text-sm focus-within:border-ring focus-within:ring-[3px] focus-within:ring-ring/50">
        {authors.map((author) => (
          <Badge key={author} variant="secondary" className="gap-1 py-0 pr-1">
            {author}
            <button
              type="button"
              onClick={() => removeAuthor(author)}
              aria-label={`Remove ${author}`}
              className="rounded-full p-0.5 hover:bg-background/60"
            >
              <X className="size-3" aria-hidden="true" />
            </button>
          </Badge>
        ))}
        <input
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={authors.length > 0 ? "" : "Add an author…"}
          aria-label="Filter by authors"
          className="min-w-24 flex-1 bg-transparent outline-none placeholder:text-muted-foreground"
        />
      </div>
      <Button
        type="button"
        variant="outline"
        onClick={addAuthor}
        disabled={!trimmedDraft}
      >
        Add
      </Button>
    </div>
  );
}

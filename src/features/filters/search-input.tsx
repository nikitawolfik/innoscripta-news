import { useEffect, useState } from "react";

import { Search } from "lucide-react";

import { Input } from "~/components/ui/input";
import { useDebouncedCallback } from "~/hooks/use-debounced-callback";

export const SEARCH_DEBOUNCE_MS = 400;

interface Props {
  value: string;
  onChange: (value: string) => void;
}

// Debounced so a keystroke burst becomes one filter change — every change is
// a round of metered upstream requests, not just a re-render.
export function SearchInput({ value, onChange }: Props) {
  const [draft, setDraft] = useState(value);
  const commitQuery = useDebouncedCallback(onChange, SEARCH_DEBOUNCE_MS);

  // Sync external changes (reset, Back/Forward) into the draft. Only a
  // keystroke schedules a commit, so this never echoes back out as a change.
  useEffect(() => {
    setDraft(value);
  }, [value]);

  function handleChange(event: React.ChangeEvent<HTMLInputElement>) {
    const nextDraft = event.target.value;

    setDraft(nextDraft);
    commitQuery(nextDraft);
  }

  return (
    <div className="relative w-full min-w-0">
      <Search
        className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
        aria-hidden="true"
      />
      <Input
        type="search"
        value={draft}
        onChange={handleChange}
        placeholder="Search articles…"
        aria-label="Search articles"
        className="pl-8"
      />
    </div>
  );
}

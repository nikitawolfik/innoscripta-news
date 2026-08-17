import { useEffect, useState } from "react";

import { Input } from "~/components/ui/input";

const AUTHOR_SEPARATOR = ",";

interface Props {
  authors: string[];
  onChange: (authors: string[]) => void;
}

// Commits on Enter or blur rather than per keystroke: author filters trigger
// a Guardian tag lookup per name, so half-typed names would burn requests.
export function AuthorInput({ authors, onChange }: Props) {
  const joinedAuthors = authors.join(`${AUTHOR_SEPARATOR} `);
  const [draft, setDraft] = useState(joinedAuthors);

  useEffect(() => {
    setDraft(joinedAuthors);
  }, [joinedAuthors]);

  function commit() {
    const nextAuthors = draft
      .split(AUTHOR_SEPARATOR)
      .map((author) => author.trim())
      .filter(Boolean);

    onChange(nextAuthors);
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter") {
      commit();
    }
  }

  return (
    <Input
      value={draft}
      onChange={(event) => setDraft(event.target.value)}
      onBlur={commit}
      onKeyDown={handleKeyDown}
      placeholder="Authors, comma-separated"
      aria-label="Filter by authors"
    />
  );
}

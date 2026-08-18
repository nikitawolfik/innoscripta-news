import { useMemo } from "react";

import DOMPurify from "dompurify";

import { localizeArticleTimes } from "~/lib/localize-article-times";

interface Props {
  html: string;
}

/**
 * Guardian is the only source that returns article bodies, and it returns them
 * as HTML. That HTML is third-party input, so it is sanitized before it goes
 * anywhere near dangerouslySetInnerHTML — a stray script or an onerror
 * attribute would otherwise execute on our origin, where the proxy lives.
 */
export function ArticleBody({ html }: Props) {
  // Sanitize first, then localize: the transform runs on a tree that is
  // already safe, and the sanitizer cannot strip what it adds.
  const bodyHtml = useMemo(
    () => localizeArticleTimes(DOMPurify.sanitize(html)),
    [html],
  );

  return (
    <div
      className="prose-sm mt-6 max-w-none space-y-4 [&_a]:underline [&_h2]:mt-6 [&_h2]:font-semibold"
      // Sanitized directly above; DOMPurify strips scripts, event handlers and
      // javascript: URLs.
      dangerouslySetInnerHTML={{ __html: bodyHtml }}
    />
  );
}

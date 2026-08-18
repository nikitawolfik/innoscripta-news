import { format, isValid, parseISO } from "date-fns";

/** e.g. "26 Aug 2026, 5:56am" — `aaa` gives lowercase am/pm. */
const TIMESTAMP_PATTERN = "d MMM yyyy, h:mmaaa";
const LEADING_PREPOSITION = /^(at\s+)/i;

/**
 * Rewrites `<time>` text in article bodies to the reader's timezone.
 *
 * Guardian liveblogs stamp every update in the paper's own timezone — "at
 * 5.25am BST" — while carrying the real instant in the adjacent `datetime`
 * attribute. Only the display string needs changing, so nothing is parsed out
 * of the prose: the machine-readable value is already there.
 *
 * Runs on already-sanitized HTML. Re-serializing a safe tree is safe, whereas
 * transforming first and sanitizing after would risk the sanitizer stripping
 * what was just added.
 */
export function localizeArticleTimes(html: string): string {
  // Ordinary articles carry no <time> at all; skip the parse entirely.
  if (!html.includes("<time")) {
    return html;
  }

  const parsed = new DOMParser().parseFromString(html, "text/html");
  let rewroteAny = false;

  for (const element of parsed.querySelectorAll("time[datetime]")) {
    const instant = parseISO(element.getAttribute("datetime") ?? "");

    // A malformed attribute means the source's own text is the best available
    // answer, so leave it exactly as published.
    if (!isValid(instant)) {
      continue;
    }

    const originalText = element.textContent?.trim() ?? "";
    // Guardian renders "Updated <time>at 5.25am BST</time>", so dropping the
    // preposition would leave the sentence reading "Updated 6.25am".
    const preposition = LEADING_PREPOSITION.exec(originalText)?.[1] ?? "";

    // Always dated, never bare. A liveblog read the next morning would show a
    // lone "5:56am" that looks like today's.
    element.textContent = `${preposition}${format(instant, TIMESTAMP_PATTERN)}`;

    if (originalText) {
      // Keep what the source published, so the original stays discoverable.
      element.setAttribute("title", originalText);
    }

    rewroteAny = true;
  }

  return rewroteAny ? parsed.body.innerHTML : html;
}

import { format } from "date-fns";
import { afterEach, describe, expect, it, vi } from "vitest";

import { localizeArticleTimes } from "~/lib/localize-article-times";

/** The exact markup Guardian emits for a liveblog update. */
function blockTime(datetime: string, text: string) {
  return `<p class="block-time updated-time">Updated <time datetime="${datetime}">${text}</time></p>`;
}

function timeElement(html: string) {
  const parsed = new DOMParser().parseFromString(html, "text/html");
  const element = parsed.querySelector("time");

  if (!element) {
    throw new Error("expected a <time> element");
  }

  return element;
}

afterEach(() => {
  vi.useRealTimers();
});

describe("localizeArticleTimes", () => {
  it("restates the published time in the reader's timezone", () => {
    const instant = "2026-08-18T04:25:59.141Z";

    const element = timeElement(
      localizeArticleTimes(blockTime(instant, "at 5.25am BST")),
    );

    // BST is the paper's timezone, not necessarily the reader's.
    expect(element.textContent).toBe(
      `at ${format(new Date(instant), "d MMM yyyy, h:mmaaa")}`,
    );
  });

  it("renders as '26 Aug 2026, 5:56am'", () => {
    const element = timeElement(
      localizeArticleTimes(
        blockTime("2026-08-26T04:56:00.000Z", "at 5.56am BST"),
      ),
    );

    expect(element.textContent).toMatch(
      /^at \d{1,2} \w{3} \d{4}, \d{1,2}:\d{2}(am|pm)$/,
    );
  });

  it("keeps the preposition so the sentence still reads", () => {
    const html = localizeArticleTimes(
      blockTime("2026-08-18T04:25:59.141Z", "at 5.25am BST"),
    );

    expect(html).toContain("Updated ");
    expect(timeElement(html).textContent?.startsWith("at ")).toBe(true);
  });

  it("preserves the original wording in a title attribute", () => {
    const element = timeElement(
      localizeArticleTimes(
        blockTime("2026-08-18T04:25:59.141Z", "at 5.25am BST"),
      ),
    );

    expect(element.getAttribute("title")).toBe("at 5.25am BST");
  });

  it("always carries the date, so a stale liveblog cannot read as today", () => {
    const element = timeElement(
      localizeArticleTimes(
        blockTime("2026-08-18T04:25:59.141Z", "at 5.25am BST"),
      ),
    );

    expect(element.textContent).toContain("Aug 2026");
  });

  it("keeps the machine-readable attribute untouched", () => {
    const element = timeElement(
      localizeArticleTimes(
        blockTime("2026-08-18T04:25:59.141Z", "at 5.25am BST"),
      ),
    );

    expect(element.getAttribute("datetime")).toBe("2026-08-18T04:25:59.141Z");
  });

  it("leaves an unparseable datetime exactly as published", () => {
    const html = blockTime("not-a-date", "at 5.25am BST");

    expect(timeElement(localizeArticleTimes(html)).textContent).toBe(
      "at 5.25am BST",
    );
  });

  it("returns ordinary article bodies untouched", () => {
    const html = "<p>No timestamps here.</p>";

    expect(localizeArticleTimes(html)).toBe(html);
  });

  it("rewrites every update in a liveblog, not just the first", () => {
    const html = localizeArticleTimes(
      blockTime("2026-08-18T04:25:59.141Z", "at 5.25am BST") +
        blockTime("2026-08-18T03:59:41.625Z", "at 4.59am BST"),
    );
    const parsed = new DOMParser().parseFromString(html, "text/html");

    expect(
      [...parsed.querySelectorAll("time")].map((element) =>
        element.getAttribute("title"),
      ),
    ).toEqual(["at 5.25am BST", "at 4.59am BST"]);
  });
});

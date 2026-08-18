import { describe, expect, it } from "vitest";

import { guardianClient } from "~/api/sources/guardian";
import { partitionSources, SOURCES } from "~/api/sources/registry";
import { DEFAULT_FILTERS } from "~/types/filters";

describe("source registry", () => {
  it("registers all three interchangeable clients", () => {
    expect(SOURCES.map((sourceClient) => sourceClient.id)).toEqual([
      "newsapi",
      "guardian",
      "nyt",
    ]);
  });

  it("Guardian supports every shared filter", () => {
    expect(
      guardianClient.unsupportedReason({
        ...DEFAULT_FILTERS,
        q: "climate",
        from: "2026-01-01",
        to: "2026-01-31",
        categories: ["science", "technology"],
        authors: ["Marina Hyde"],
      }),
    ).toBeNull();
  });

  it("leaves only Guardian on an author search, each exclusion explained", () => {
    const partition = partitionSources({
      ...DEFAULT_FILTERS,
      authors: ["Jane Doe"],
    });

    // Guardian resolves a display name to a contributor tag. NewsAPI has no
    // author parameter, and NYT's author filter needs `fq`, which returns
    // nothing on the free tier — so both decline rather than contribute an
    // empty result while appearing to have filtered.
    expect(partition.eligible.map((sourceClient) => sourceClient.id)).toEqual([
      "guardian",
    ]);
    expect(partition.excluded).toEqual([
      {
        source: "newsapi",
        reason: "excluded",
        detail: "NewsAPI cannot filter by author",
      },
      {
        source: "nyt",
        reason: "excluded",
        detail: "The New York Times cannot filter by author on this API tier",
      },
    ]);
  });

  it("honours an explicit source selection", () => {
    const partition = partitionSources({
      ...DEFAULT_FILTERS,
      sources: ["nyt"],
    });

    expect(partition.eligible.map((sourceClient) => sourceClient.id)).toEqual([
      "nyt",
    ]);
    expect(partition.excluded).toEqual([]);
  });
});

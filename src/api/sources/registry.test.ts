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

  it("excludes NewsAPI from author searches with an actionable detail", () => {
    const partition = partitionSources({
      ...DEFAULT_FILTERS,
      authors: ["Jane Doe"],
    });

    expect(partition.eligible.map((sourceClient) => sourceClient.id)).toEqual([
      "guardian",
      "nyt",
    ]);
    expect(partition.excluded).toEqual([
      {
        source: "newsapi",
        reason: "excluded",
        detail: "NewsAPI cannot filter by author",
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

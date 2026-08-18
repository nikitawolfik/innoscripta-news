import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";

import { nytClient, normalizeNytArticle } from "~/api/sources/nyt";
import { nytSearchResponseSchema } from "~/api/sources/nyt.schema";
import { DEFAULT_FILTERS } from "~/types/filters";
import nytSearchFixtureJson from "../../../tests/fixtures/nyt-search.json";
import { mswServer } from "../../../tests/msw/server";

/**
 * Captured from a real Article Search response. The previous tests asserted
 * against a hand-written shape (`response.meta`, `multimedia` as an array) that
 * the API does not actually return, so they passed while every live request
 * failed validation. Keep this file in sync with reality, not with the code.
 */
const nytSearchFixture = nytSearchFixtureJson as {
  response: { docs: unknown[] };
};

describe("nyt response schema", () => {
  it("accepts a real captured response", () => {
    expect(nytSearchResponseSchema.safeParse(nytSearchFixture).success).toBe(
      true,
    );
  });

  it("treats a null docs list as an empty page", () => {
    // NYT sends `docs: null` rather than `[]` when a query matches nothing,
    // including while throttled. Rejecting it would surface as "unavailable".
    const parsed = nytSearchResponseSchema.safeParse({
      response: { docs: null, metadata: { hits: 0, offset: 0 } },
    });

    expect(parsed.success).toBe(true);
    expect(parsed.success && parsed.data.response.docs).toEqual([]);
  });
});

describe("normalizeNytArticle", () => {
  it("reads the image from the multimedia object", () => {
    const article = normalizeNytArticle(nytSearchFixture.response.docs[0]);

    expect(article).toMatchObject({
      id: "nyt://article/798697fc-12fc-5fed-a4db-ac3b0739a741",
      source: "nyt",
      sourceLabel: "The New York Times",
      title: "A Quiet Play With a Loud Heart",
      description: "Sophie McIntosh's new play opens in the East Village.",
      author: "By Juan A. Ramírez",
      category: "Theater",
      imageUrl:
        "https://static01.nyt.com/images/2026/08/17/multimedia/17cul-benevolent/17cul-benevolent-articleLarge.jpg",
      body: null,
    });
  });

  it("keeps an article that has no multimedia at all", () => {
    const article = normalizeNytArticle(nytSearchFixture.response.docs[1]);

    // Declaring multimedia as a required array dropped these entirely.
    expect(article).not.toBeNull();
    expect(article?.imageUrl).toBeNull();
    expect(article?.description).toBe("The vote fell along party lines.");
  });

  it("drops a malformed document", () => {
    expect(normalizeNytArticle({ _id: "missing-everything-else" })).toBeNull();
  });
});

describe("nytClient", () => {
  it("serves keyword and date filters", () => {
    expect(
      nytClient.unsupportedReason({
        ...DEFAULT_FILTERS,
        q: "climate",
        from: "2026-01-01",
        to: "2026-01-31",
      }),
    ).toBeNull();
  });

  /**
   * Article Search returns zero results for any request carrying `fq` on this
   * tier, and category, author and by-id lookup are all expressed through it.
   * Declining is the honest answer; issuing the query would contribute no
   * articles while claiming to have filtered.
   */
  it("declines the filters that would need fq", () => {
    expect(
      nytClient.unsupportedReason({
        ...DEFAULT_FILTERS,
        categories: ["technology"],
      }),
    ).toBe("The New York Times cannot filter by category on this API tier");

    expect(
      nytClient.unsupportedReason({
        ...DEFAULT_FILTERS,
        authors: ["Jane Doe"],
      }),
    ).toBe("The New York Times cannot filter by author on this API tier");
  });

  it("offers no by-id lookup", () => {
    expect(nytClient.fetchById).toBeNull();
    expect(nytClient.capabilities.fetchById).toBe(false);
  });

  it("serializes its zero-based page and dates, and never sends fq", async () => {
    let requestedUrl = "";

    mswServer.use(
      http.get("*/api/nyt/articlesearch.json", ({ request }) => {
        requestedUrl = request.url;

        return HttpResponse.json(nytSearchFixture);
      }),
    );

    const result = await nytClient.search(
      {
        ...DEFAULT_FILTERS,
        q: "artificial intelligence",
        from: "2026-01-02T12:00:00Z",
        to: "2026-02-03T12:00:00Z",
      },
      2,
    );
    const searchParams = new URL(requestedUrl).searchParams;

    expect(searchParams.get("page")).toBe("1");
    expect(searchParams.get("begin_date")).toBe("20260102");
    expect(searchParams.get("end_date")).toBe("20260203");
    expect(searchParams.get("fq")).toBeNull();
    expect(result.articles).toHaveLength(2);
    expect(result.hasMore).toBe(true);
  });

  it("returns an empty page when the response carries no documents", async () => {
    mswServer.use(
      http.get("*/api/nyt/articlesearch.json", () =>
        HttpResponse.json({
          response: { docs: null, metadata: { hits: 0, offset: 0 } },
        }),
      ),
    );

    const result = await nytClient.search({ ...DEFAULT_FILTERS, q: "x" }, 1);

    expect(result.articles).toEqual([]);
    expect(result.hasMore).toBe(false);
  });
});

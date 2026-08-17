import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { RateLimitError } from "~/api/errors";
import {
  clearContributorTagCache,
  guardianClient,
  normalizeGuardianContent,
  resolveContributorTag,
  toGuardianDate,
} from "~/api/sources/guardian";
import { DEFAULT_RETRY_AFTER_MS, MAX_RETRY_AFTER_MS } from "~/lib/retry-after";
import { DEFAULT_FILTERS, type Filters } from "~/types/filters";
import guardianSearchFixtureJson from "../../../tests/fixtures/guardian-search.json";

/** Captured from a real Guardian search response. */
const guardianSearchFixture = guardianSearchFixtureJson as {
  response: {
    results: unknown[];
    currentPage: number;
    pages: number;
  };
};

function tagsResponse(tagId: string | null) {
  return Response.json({
    response: {
      status: "ok",
      results: tagId ? [{ id: tagId, webTitle: "Contributor" }] : [],
    },
  });
}

function filters(overrides: Partial<Filters> = {}): Filters {
  return { ...DEFAULT_FILTERS, ...overrides };
}

beforeEach(() => {
  clearContributorTagCache();
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe("normalizeGuardianContent", () => {
  it("maps a full fixture item", () => {
    const article = normalizeGuardianContent(
      guardianSearchFixture.response.results[0],
    );

    expect(article).toEqual({
      id: "technology/2024/jan/01/ai-future-2024",
      source: "guardian",
      sourceLabel: "The Guardian",
      title: "AI in 2024: What to Expect",
      description: "A look ahead at artificial intelligence.",
      body: "<p>Full article body.</p>",
      author: "Jane Smith",
      category: "Technology",
      imageUrl: "https://media.guim.co.uk/example/thumbnail.jpg",
      url: "https://www.theguardian.com/technology/2024/jan/01/ai-future-2024",
      publishedAt: "2024-01-01T10:00:00Z",
    });
  });

  it("tolerates missing thumbnail and byline", () => {
    const article = normalizeGuardianContent(
      guardianSearchFixture.response.results[1],
    );

    expect(article?.imageUrl).toBeNull();
    expect(article?.author).toBeNull();
    expect(article?.description).toBe("Diplomats gather for another round.");
  });

  it("drops malformed items", () => {
    expect(
      normalizeGuardianContent({ id: "missing-required-fields" }),
    ).toBeNull();
  });
});

describe("toGuardianDate", () => {
  it("formats ISO timestamps as yyyy-MM-dd", () => {
    expect(toGuardianDate("2024-03-15T18:22:00.000Z")).toBe("2024-03-15");
  });
});

describe("resolveContributorTag", () => {
  it("looks a display name up through the tags endpoint", async () => {
    const fetchMock = vi.fn(async (_input: RequestInfo | URL) =>
      tagsResponse("profile/marinahyde"),
    );
    vi.stubGlobal("fetch", fetchMock);

    // Deliberately a name whose slug has no separator: deriving it from the
    // display name would produce `profile/marina-hyde`, which matches nothing.
    expect(await resolveContributorTag("Marina Hyde")).toBe(
      "profile/marinahyde",
    );

    const requestUrl = String(fetchMock.mock.calls[0]?.[0]);
    expect(requestUrl).toContain("/api/guardian/tags?");
    expect(requestUrl).toContain("type=contributor");
    expect(requestUrl).toContain("q=Marina+Hyde");
  });

  it("memoises resolved and unresolved names alike", async () => {
    const fetchMock = vi.fn(async () => tagsResponse(null));
    vi.stubGlobal("fetch", fetchMock);

    expect(await resolveContributorTag("Nobody At All")).toBeNull();
    expect(await resolveContributorTag("Nobody At All")).toBeNull();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("passes an existing tag id straight through", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    expect(await resolveContributorTag("profile/georgemonbiot")).toBe(
      "profile/georgemonbiot",
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe("guardianClient.search", () => {
  it("normalizes a page and counts dropped invalid items", async () => {
    const payload = structuredClone(guardianSearchFixture);
    payload.response.results.push({ broken: true });

    vi.stubGlobal(
      "fetch",
      vi.fn(async () => Response.json(payload)),
    );

    const result = await guardianClient.search(
      filters({ q: "climate", from: "2024-01-01", to: "2024-02-01" }),
      1,
    );

    expect(result.articles).toHaveLength(2);
    expect(result.droppedInvalidCount).toBe(1);
    expect(result.hasMore).toBe(false);

    const requestUrl = String(vi.mocked(fetch).mock.calls[0]?.[0]);
    expect(requestUrl).toContain("/api/guardian/search?");
    expect(requestUrl).toContain("q=climate");
    expect(requestUrl).toContain("from-date=2024-01-01");
    expect(requestUrl).toContain("to-date=2024-02-01");
  });

  /**
   * Guardian reads `,` as AND: `section=technology,sport` asks for articles in
   * both sections at once and returns nothing. Asserting a single value would
   * pass either way, which is how this shipped broken.
   */
  it("combines multiple categories with OR, not AND", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => Response.json(guardianSearchFixture)),
    );

    await guardianClient.search(
      filters({ categories: ["technology", "sport"] }),
      1,
    );

    const requestUrl = new URL(
      String(vi.mocked(fetch).mock.calls[0]?.[0]),
      "http://localhost",
    );

    expect(requestUrl.searchParams.get("section")).toBe("technology|sport");
  });

  it("combines multiple author tags with OR, not AND", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(tagsResponse("profile/georgemonbiot"))
      .mockResolvedValueOnce(tagsResponse("profile/owen-jones"))
      .mockResolvedValueOnce(Response.json(guardianSearchFixture));
    vi.stubGlobal("fetch", fetchMock);

    await guardianClient.search(
      filters({ authors: ["George Monbiot", "Owen Jones"] }),
      1,
    );

    const searchUrl = new URL(
      String(fetchMock.mock.calls[2]?.[0]),
      "http://localhost",
    );

    expect(searchUrl.searchParams.get("tag")).toBe(
      "profile/georgemonbiot|profile/owen-jones",
    );
  });

  it("returns an empty page when no author resolves", async () => {
    const fetchMock = vi.fn(async () => tagsResponse(null));
    vi.stubGlobal("fetch", fetchMock);

    const result = await guardianClient.search(
      filters({ authors: ["Not A Guardian Writer"] }),
      1,
    );

    // Never fall back to an unfiltered search: that would show articles by
    // everyone except the requested author.
    expect(result.articles).toEqual([]);
    expect(result.hasMore).toBe(false);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("maps 429 responses to RateLimitError across Retry-After forms", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-17T12:00:00.000Z"));

    const cases = [
      { header: "42", expectedMs: 42_000 },
      {
        header: new Date(Date.now() + 42_000).toUTCString(),
        expectedMs: 42_000,
      },
      { header: null, expectedMs: DEFAULT_RETRY_AFTER_MS },
      {
        header: new Date(Date.now() - 60_000).toUTCString(),
        expectedMs: DEFAULT_RETRY_AFTER_MS,
      },
      { header: "999999", expectedMs: MAX_RETRY_AFTER_MS },
    ];

    for (const testCase of cases) {
      vi.stubGlobal(
        "fetch",
        vi.fn(
          async () =>
            new Response(JSON.stringify({ error: "rate_limited" }), {
              status: 429,
              headers: testCase.header
                ? { "Retry-After": testCase.header }
                : undefined,
            }),
        ),
      );

      await expect(guardianClient.search(filters(), 1)).rejects.toMatchObject({
        source: "guardian",
        retryAfterMs: testCase.expectedMs,
      });
      await expect(guardianClient.search(filters(), 1)).rejects.toBeInstanceOf(
        RateLimitError,
      );
    }
  });
});

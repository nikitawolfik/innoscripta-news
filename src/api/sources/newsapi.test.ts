import { format, subDays } from "date-fns";
import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";

import { newsApiClient, selectNewsApiEndpoint } from "~/api/sources/newsapi";
import { DEFAULT_FILTERS, type Filters } from "~/types/filters";
import { mswServer } from "../../../tests/msw/server";

type SupportCase = {
  name: string;
  filters: Partial<Filters>;
  /** null when NewsAPI can serve the filters, otherwise the reason it cannot. */
  expected: string | null;
};

const SUPPORT_CASES: SupportCase[] = [
  { name: "keyword only", filters: { q: "climate" }, expected: null },
  {
    name: "single category only",
    filters: { categories: ["technology"] },
    expected: null,
  },
  {
    name: "keyword and category together",
    filters: { q: "climate", categories: ["science"] },
    expected: null,
  },
  {
    name: "keyword with a recent date range",
    filters: { q: "climate", from: recentDate(7) },
    expected: null,
  },
  {
    name: "no filters at all",
    filters: {},
    expected: "NewsAPI needs a keyword or category",
  },
  {
    name: "author",
    filters: { authors: ["Jane Doe"] },
    expected: "NewsAPI cannot filter by author",
  },
  {
    name: "multiple categories",
    filters: { categories: ["science", "technology"] },
    expected: "NewsAPI can only filter by one category at a time",
  },
  {
    name: "category with a date range",
    filters: { categories: ["science"], from: recentDate(7) },
    expected: "NewsAPI cannot combine a category with a date range",
  },
  {
    name: "date range older than the plan window",
    filters: { q: "climate", from: recentDate(45) },
    expected: "NewsAPI's free plan only reaches back 30 days",
  },
];

function recentDate(daysAgo: number): string {
  return format(subDays(new Date(), daysAgo), "yyyy-MM-dd");
}

describe("newsApiClient.unsupportedReason", () => {
  for (const testCase of SUPPORT_CASES) {
    it(testCase.name, () => {
      expect(
        newsApiClient.unsupportedReason({
          ...DEFAULT_FILTERS,
          ...testCase.filters,
        }),
      ).toBe(testCase.expected);
    });
  }
});

describe("NewsAPI endpoint selection", () => {
  it("uses top-headlines for a category without a keyword", () => {
    expect(
      selectNewsApiEndpoint({
        ...DEFAULT_FILTERS,
        categories: ["technology"],
      }),
    ).toBe("top-headlines");
  });

  it("uses everything for keyword and date searches", () => {
    expect(selectNewsApiEndpoint({ ...DEFAULT_FILTERS, q: "technology" })).toBe(
      "everything",
    );
    expect(
      selectNewsApiEndpoint({
        ...DEFAULT_FILTERS,
        from: "2026-01-01",
      }),
    ).toBe("everything");
  });

  it("serializes the selected endpoint and normalizes its response", async () => {
    let requestedUrl = "";

    mswServer.use(
      http.get("*/api/newsapi/top-headlines", ({ request }) => {
        requestedUrl = request.url;

        return HttpResponse.json({
          status: "ok",
          totalResults: 1,
          articles: [
            {
              source: { id: "example", name: "Example News" },
              author: "Reporter",
              title: "A technology headline",
              description: "The article summary",
              url: "https://example.com/article",
              urlToImage: null,
              publishedAt: "2026-08-17T12:00:00Z",
            },
          ],
        });
      }),
    );

    const result = await newsApiClient.search(
      { ...DEFAULT_FILTERS, categories: ["technology"] },
      1,
    );
    const searchParams = new URL(requestedUrl).searchParams;

    expect(searchParams.get("category")).toBe("technology");
    expect(searchParams.get("page")).toBe("1");
    expect(result.articles[0]).toMatchObject({
      id: "https://example.com/article",
      source: "newsapi",
      sourceLabel: "NewsAPI",
      category: "technology",
      body: null,
    });
    expect(result.hasMore).toBe(false);
  });
});

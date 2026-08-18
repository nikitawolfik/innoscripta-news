import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";

import { fetchArticlesBatch } from "~/hooks/use-articles-infinite";
import { DEFAULT_FILTERS } from "~/types/filters";

// NewsAPI declines a request with neither keyword nor category (its endpoints
// both reject one), so a batch exercising all three sources needs a keyword.
const ALL_SOURCE_FILTERS = { ...DEFAULT_FILTERS, q: "climate" };
import { mswServer } from "../../tests/msw/server";

const NEWSAPI_PUBLISHED_AT = "2026-08-17T13:00:00Z";
const GUARDIAN_PUBLISHED_AT = "2026-08-17T12:00:00Z";
// NYT spells UTC as `+0000` where the other two use `Z`, so the defaults keep
// every batch test running against genuinely mixed ISO forms.
const NYT_PUBLISHED_AT = "2026-08-17T11:00:00+0000";

const ALL_SOURCE_CURSOR = {
  newsapi: 1,
  guardian: 1,
  nyt: 1,
} as const;

describe("multi-source article batches", () => {
  it("merges all sources in descending publication order", async () => {
    useSuccessfulSourceHandlers();

    const batch = await fetchArticlesBatch(
      ALL_SOURCE_FILTERS,
      ALL_SOURCE_CURSOR,
    );

    expect(batch.articles.map((article) => article.source)).toEqual([
      "newsapi",
      "guardian",
      "nyt",
    ]);
    expect(batch.degraded).toEqual([]);
    expect(batch.nextCursor).toBeUndefined();
  });

  it("keeps successful results when one source rejects", async () => {
    useSuccessfulSourceHandlers({
      newsApiResponse: HttpResponse.json(
        { error: "upstream_error" },
        { status: 500 },
      ),
    });

    const batch = await fetchArticlesBatch(
      ALL_SOURCE_FILTERS,
      ALL_SOURCE_CURSOR,
    );

    expect(batch.articles.map((article) => article.source)).toEqual([
      "guardian",
      "nyt",
    ]);
    expect(batch.degraded).toEqual([
      { source: "newsapi", reason: "unavailable" },
    ]);
    expect(batch.nextCursor).toEqual({ newsapi: 1 });
  });

  it("keeps NYT at its saved page after a 429 and resumes there", async () => {
    const requestedNytPages: string[] = [];
    let nytRequestCount = 0;

    useSuccessfulSourceHandlers({
      nytHandler: ({ request }) => {
        requestedNytPages.push(
          new URL(request.url).searchParams.get("page") ?? "",
        );
        nytRequestCount += 1;

        if (nytRequestCount === 1) {
          return HttpResponse.json(
            { error: "rate_limited" },
            { status: 429, headers: { "Retry-After": "60" } },
          );
        }

        return HttpResponse.json(nytPayload());
      },
    });

    const limitedBatch = await fetchArticlesBatch(
      ALL_SOURCE_FILTERS,
      ALL_SOURCE_CURSOR,
    );

    expect(limitedBatch.articles.map((article) => article.source)).toEqual([
      "newsapi",
      "guardian",
    ]);
    expect(limitedBatch.degraded).toHaveLength(1);
    expect(limitedBatch.degraded[0]).toMatchObject({
      source: "nyt",
      reason: "rate_limited",
    });
    expect(limitedBatch.nextCursor).toEqual({ nyt: 1 });

    const recoveredBatch = await fetchArticlesBatch(
      ALL_SOURCE_FILTERS,
      limitedBatch.nextCursor ?? {},
    );

    // Internal page 1 maps to NYT's zero-based page 0 both before and after
    // cooldown; incrementing here would silently skip its first page.
    expect(requestedNytPages).toEqual(["0", "0"]);
    expect(recoveredBatch.articles.map((article) => article.source)).toEqual([
      "nyt",
    ]);
    expect(recoveredBatch.degraded).toEqual([]);
  });

  it("orders a batch by instant, not by timestamp spelling", async () => {
    // Offsets that disagree with wall-clock order: comparing these strings
    // lexicographically puts Guardian first, but it is the oldest of the three.
    useSuccessfulSourceHandlers({
      publishedAt: {
        newsapi: "2026-08-17T13:00:00Z",
        guardian: "2026-08-17T14:30:00+02:00",
        nyt: "2026-08-17T13:45:00+0000",
      },
    });

    const batch = await fetchArticlesBatch(
      ALL_SOURCE_FILTERS,
      ALL_SOURCE_CURSOR,
    );

    expect(batch.articles.map((article) => article.source)).toEqual([
      "nyt",
      "newsapi",
      "guardian",
    ]);
  });

  it("drops an article whose timestamp will not parse", async () => {
    // The card formats this value with date-fns, which throws on a date it
    // cannot read — so an unparseable one has to fail validation rather than
    // reach the feed and take the render down with it.
    useSuccessfulSourceHandlers({
      publishedAt: { newsapi: "yesterday, probably" },
    });

    const batch = await fetchArticlesBatch(
      ALL_SOURCE_FILTERS,
      ALL_SOURCE_CURSOR,
    );

    expect(batch.articles.map((article) => article.source)).toEqual([
      "guardian",
      "nyt",
    ]);
    // Counted, not silently swallowed: the other two sources still render.
    expect(batch.degraded).toEqual([]);
  });
});

type PublishedDates = Partial<Record<"newsapi" | "guardian" | "nyt", string>>;

type HandlerOptions = {
  newsApiResponse?: Response;
  nytHandler?: Parameters<typeof http.get>[1];
  publishedAt?: PublishedDates;
};

function useSuccessfulSourceHandlers(options: HandlerOptions = {}): void {
  const publishedAt = options.publishedAt ?? {};

  mswServer.use(
    http.get("*/api/newsapi/everything", () => {
      return (
        options.newsApiResponse ??
        HttpResponse.json(newsApiPayload(publishedAt.newsapi))
      );
    }),
    http.get("*/api/guardian/search", () =>
      HttpResponse.json(guardianPayload(publishedAt.guardian)),
    ),
    http.get(
      "*/api/nyt/articlesearch.json",
      options.nytHandler ??
        (() => HttpResponse.json(nytPayload(publishedAt.nyt))),
    ),
  );
}

function newsApiPayload(publishedAt = NEWSAPI_PUBLISHED_AT) {
  return {
    status: "ok",
    totalResults: 1,
    articles: [
      {
        source: { name: "News publisher" },
        author: "News author",
        title: "Newest NewsAPI article",
        description: "News description",
        url: "https://example.com/newsapi",
        urlToImage: null,
        publishedAt,
      },
    ],
  };
}

function guardianPayload(webPublicationDate = GUARDIAN_PUBLISHED_AT) {
  return {
    response: {
      status: "ok",
      currentPage: 1,
      pages: 1,
      results: [
        {
          id: "world/guardian-example",
          webTitle: "Guardian article",
          webUrl: "https://www.theguardian.com/world/guardian-example",
          webPublicationDate,
          sectionName: "World news",
        },
      ],
    },
  };
}

function nytPayload(pubDate = NYT_PUBLISHED_AT) {
  return {
    response: {
      docs: [
        {
          _id: "nyt://article/example",
          web_url: "https://www.nytimes.com/2026/08/17/example.html",
          abstract: "NYT abstract",
          headline: { main: "NYT article" },
          pub_date: pubDate,
          section_name: "World",
          byline: { original: "By NYT Author" },
          multimedia: { default: { url: "https://static01.nyt.com/a.jpg" } },
        },
      ],
      metadata: { hits: 1, offset: 0 },
    },
  };
}

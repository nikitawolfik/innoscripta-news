import { QueryClient } from "@tanstack/react-query";
import { http, HttpResponse } from "msw";
import { beforeEach, describe, expect, it } from "vitest";

import { resolveArticle } from "~/hooks/use-article";
import type { Article } from "~/types/article";
import { mswServer } from "../../tests/msw/server";

const GUARDIAN_ARTICLE: Article = {
  id: "world/2026/aug/18/example",
  source: "guardian",
  sourceLabel: "The Guardian",
  title: "Cached headline",
  description: "From the feed cache.",
  body: "<p>Body</p>",
  author: "Jane Smith",
  category: "World news",
  imageUrl: null,
  url: "https://www.theguardian.com/world/2026/aug/18/example",
  publishedAt: "2026-08-18T09:00:00Z",
};

let queryClient: QueryClient;
let upstreamCallCount: number;

/**
 * Driven through MSW rather than by stubbing the client, so the cache-first
 * path is proven by the absence of a real request instead of an unused spy.
 */
function stubGuardianArticle(content: unknown) {
  upstreamCallCount = 0;

  mswServer.use(
    http.get("*/api/guardian/*", () => {
      upstreamCallCount += 1;

      return HttpResponse.json({ response: { status: "ok", content } });
    }),
  );
}

function seedFeedCache(articles: Article[]) {
  queryClient.setQueryData(["articles", { q: "" }], {
    pages: [{ articles, nextCursor: undefined, degraded: [] }],
    pageParams: [{}],
  });
}

beforeEach(() => {
  queryClient = new QueryClient();
  upstreamCallCount = 0;
});

describe("resolveArticle", () => {
  it("serves a click-through from the feed cache without any network call", async () => {
    stubGuardianArticle(null);
    seedFeedCache([GUARDIAN_ARTICLE]);

    const resolution = await resolveArticle(
      queryClient,
      "guardian",
      GUARDIAN_ARTICLE.id,
    );

    expect(resolution).toEqual({ status: "found", article: GUARDIAN_ARTICLE });
    expect(upstreamCallCount).toBe(0);
  });

  it("does not match a cached article belonging to another source", async () => {
    seedFeedCache([GUARDIAN_ARTICLE]);

    // NewsAPI has no by-id endpoint, so a miss is unresolvable rather than
    // accidentally resolving to the Guardian entry with the same id.
    expect(
      await resolveArticle(queryClient, "newsapi", GUARDIAN_ARTICLE.id),
    ).toEqual({ status: "unresolvable", source: "newsapi" });
  });

  it("falls back to the source on a cold deep link", async () => {
    stubGuardianArticle({
      id: GUARDIAN_ARTICLE.id,
      webTitle: "Fetched headline",
      webUrl: GUARDIAN_ARTICLE.url,
      webPublicationDate: GUARDIAN_ARTICLE.publishedAt,
      sectionName: "World news",
      fields: { body: "<p>Full text.</p>" },
    });

    const resolution = await resolveArticle(
      queryClient,
      "guardian",
      GUARDIAN_ARTICLE.id,
    );

    expect(upstreamCallCount).toBe(1);
    expect(resolution).toMatchObject({
      status: "found",
      article: { title: "Fetched headline", body: "<p>Full text.</p>" },
    });
  });

  it("reports not-found when the source returns nothing", async () => {
    stubGuardianArticle(null);

    expect(await resolveArticle(queryClient, "guardian", "missing")).toEqual({
      status: "not-found",
    });
  });

  it("reports not-found for an unknown source or a missing id", async () => {
    expect(await resolveArticle(queryClient, "myspace", "x")).toEqual({
      status: "not-found",
    });
    expect(await resolveArticle(queryClient, "guardian", null)).toEqual({
      status: "not-found",
    });
  });
});

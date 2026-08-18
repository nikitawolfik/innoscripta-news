import { describe, expect, it } from "vitest";

import { guardianSearchResponseSchema } from "~/api/sources/guardian.schema";
import { newsApiSearchResponseSchema } from "~/api/sources/newsapi.schema";
import { nytSearchResponseSchema } from "~/api/sources/nyt.schema";
import { normalizeGuardianContent } from "~/api/sources/guardian";
import { normalizeNewsApiArticle } from "~/api/sources/newsapi";
import { normalizeNytArticle } from "~/api/sources/nyt";
import guardianSearch from "./guardian-search.json";
import newsApiEverything from "./newsapi-everything.json";
import nytSearch from "./nyt-search.json";

/**
 * Every fixture is a response captured from the live API, and each is parsed
 * here by the schema the client actually uses.
 *
 * This is the guard that was missing when NYT shipped broken: its tests
 * asserted against a hand-written shape (`response.meta`, `multimedia` as an
 * array) that the API does not return, so they agreed with the code while
 * every real request failed validation. A fixture that stops parsing means the
 * upstream changed — fix the schema, do not edit the fixture to match.
 */
describe("captured fixtures still satisfy their schemas", () => {
  it("guardian search", () => {
    const parsed = guardianSearchResponseSchema.safeParse(guardianSearch);

    expect(parsed.success).toBe(true);
  });

  it("newsapi everything", () => {
    const parsed = newsApiSearchResponseSchema.safeParse(newsApiEverything);

    expect(parsed.success).toBe(true);
  });

  it("nyt article search", () => {
    const parsed = nytSearchResponseSchema.safeParse(nytSearch);

    expect(parsed.success).toBe(true);
  });
});

describe("every fixture article normalizes to a complete Article", () => {
  it.each([
    ["guardian", guardianSearch.response.results, normalizeGuardianContent],
    ["newsapi", newsApiEverything.articles, normalizeNewsApiArticle],
    ["nyt", nytSearch.response.docs, normalizeNytArticle],
  ])("%s", (_source, items, normalize) => {
    const articles = (items as unknown[]).map((item) => normalize(item));

    // Nothing captured from a real response should be dropped as invalid.
    expect(articles.every((article) => article !== null)).toBe(true);

    for (const article of articles) {
      expect(article?.id).toBeTruthy();
      expect(article?.title).toBeTruthy();
      expect(article?.url).toMatch(/^https?:\/\//);
      expect(Number.isNaN(Date.parse(article?.publishedAt ?? ""))).toBe(false);
    }
  });
});

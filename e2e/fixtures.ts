import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { test as base, type Page } from "@playwright/test";

/**
 * Read rather than imported: Playwright loads specs through Node's ESM loader,
 * which requires an import attribute for JSON, while the vitest suite goes
 * through Vite where a plain import works. Reading the file keeps one set of
 * fixtures usable by both.
 */
function loadFixture(name: string): unknown {
  return JSON.parse(
    readFileSync(
      fileURLToPath(new URL(`../tests/fixtures/${name}`, import.meta.url)),
      "utf8",
    ),
  );
}

const guardianSearch = loadFixture("guardian-search.json");
const newsApiEverything = loadFixture("newsapi-everything.json");
const nytSearch = loadFixture("nyt-search.json");

export type SourceId = "guardian" | "newsapi" | "nyt";

type RouteOptions = {
  /** Sources to answer with a 429 instead of their fixture. */
  rateLimited?: SourceId[];
  /** Sources to answer with a 500. */
  unavailable?: SourceId[];
  /** Answer Guardian with an empty result set. */
  emptyGuardian?: boolean;
};

const FIXTURES: Record<SourceId, unknown> = {
  guardian: guardianSearch,
  newsapi: newsApiEverything,
  nyt: nytSearch,
};

const EMPTY_GUARDIAN = {
  response: { status: "ok", currentPage: 1, pages: 1, results: [] },
};

/**
 * Page two onwards is empty for every source. Without this the same fixture is
 * served for every page and the infinite feed appends it forever — duplicate
 * articles that no real API would produce.
 *
 * NYT counts pages from zero; the other two from one.
 */
const EMPTY_PAGES: Record<SourceId, unknown> = {
  guardian: EMPTY_GUARDIAN,
  newsapi: { status: "ok", totalResults: 0, articles: [] },
  nyt: { response: { docs: [], metadata: { hits: 0, offset: 0 } } },
};

function isFirstPage(source: SourceId, url: URL): boolean {
  const page = Number(
    url.searchParams.get("page") ?? (source === "nyt" ? 0 : 1),
  );

  return source === "nyt" ? page <= 0 : page <= 1;
}

/**
 * Intercepts every proxied call in the browser and answers from the same
 * captured fixtures the unit suite uses, so the two layers cannot disagree
 * about what an API returns. Nothing here reaches the network, which is what
 * keeps the suite deterministic against APIs metered at 5 requests a minute.
 */
export async function mockApi(page: Page, options: RouteOptions = {}) {
  const requestCounts = new Map<string, number>();

  await page.route("**/api/**", async (route) => {
    const url = new URL(route.request().url());
    const source = url.pathname.split("/")[2] as SourceId;

    requestCounts.set(source, (requestCounts.get(source) ?? 0) + 1);

    if (options.rateLimited?.includes(source)) {
      await route.fulfill({
        status: 429,
        headers: { "retry-after": "42" },
        json: { error: "rate_limited", source },
      });
      return;
    }

    if (options.unavailable?.includes(source)) {
      await route.fulfill({
        status: 500,
        json: { error: "upstream_error", source },
      });
      return;
    }

    if (source === "guardian" && options.emptyGuardian) {
      await route.fulfill({ json: EMPTY_GUARDIAN });
      return;
    }

    if (!isFirstPage(source, url)) {
      await route.fulfill({ json: EMPTY_PAGES[source] ?? {} });
      return;
    }

    await route.fulfill({ json: FIXTURES[source] ?? {} });
  });

  return {
    countFor: (source: SourceId) => requestCounts.get(source) ?? 0,
    reset: () => requestCounts.clear(),
  };
}

export const test = base;
export { expect } from "@playwright/test";

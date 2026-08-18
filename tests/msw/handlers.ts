import { http, HttpResponse } from "msw";

import guardianSearch from "../fixtures/guardian-search.json";
import newsApiEverything from "../fixtures/newsapi-everything.json";
import nytSearch from "../fixtures/nyt-search.json";

export const FIXTURES = {
  guardian: guardianSearch,
  newsapi: newsApiEverything,
  nyt: nytSearch,
};

/** Every source answering normally, from the captured responses. */
export function successHandlers() {
  return [
    http.get("*/api/guardian/search", () => HttpResponse.json(guardianSearch)),
    http.get("*/api/newsapi/*", () => HttpResponse.json(newsApiEverything)),
    http.get("*/api/nyt/*", () => HttpResponse.json(nytSearch)),
  ];
}

/**
 * A rate-limited source. Mirrors the proxy's contract exactly — status,
 * body and a forwarded `Retry-After` — so the client parses the same thing it
 * would in production.
 */
export function rateLimitedHandler(source: string, retryAfterSeconds = 42) {
  return http.get(`*/api/${source}/*`, () =>
    HttpResponse.json(
      { error: "rate_limited", source },
      {
        status: 429,
        headers: { "Retry-After": String(retryAfterSeconds) },
      },
    ),
  );
}

export function unavailableHandler(source: string, status = 500) {
  return http.get(`*/api/${source}/*`, () =>
    HttpResponse.json({ error: "upstream_error", source }, { status }),
  );
}

export function emptyGuardianHandler() {
  return http.get("*/api/guardian/search", () =>
    HttpResponse.json({
      response: { status: "ok", currentPage: 1, pages: 1, results: [] },
    }),
  );
}

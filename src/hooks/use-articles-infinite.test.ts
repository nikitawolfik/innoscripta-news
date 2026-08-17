import { describe, expect, it } from "vitest";

import { RateLimitError, SourceUnavailableError } from "~/api/errors";
import {
  batchRetryDelay,
  shouldRetryBatch,
} from "~/hooks/use-articles-infinite";

describe("shouldRetryBatch", () => {
  it("never retries a rate limit", () => {
    const rateLimitError = new RateLimitError("guardian", 30_000);

    expect(shouldRetryBatch(0, rateLimitError)).toBe(false);
    expect(shouldRetryBatch(1, rateLimitError)).toBe(false);
  });

  it("retries transient failures a bounded number of times", () => {
    const unavailableError = new SourceUnavailableError("guardian");

    expect(shouldRetryBatch(0, unavailableError)).toBe(true);
    expect(shouldRetryBatch(1, unavailableError)).toBe(true);
    expect(shouldRetryBatch(2, unavailableError)).toBe(false);
  });
});

describe("batchRetryDelay", () => {
  it("honours the server's retry window for rate limits", () => {
    expect(batchRetryDelay(0, new RateLimitError("guardian", 42_000))).toBe(
      42_000,
    );
  });

  it("backs off exponentially for transient failures", () => {
    const unavailableError = new SourceUnavailableError("guardian");

    expect(batchRetryDelay(0, unavailableError)).toBe(1_000);
    expect(batchRetryDelay(1, unavailableError)).toBe(2_000);
    expect(batchRetryDelay(10, unavailableError)).toBe(30_000);
  });
});

import { describe, expect, it } from "vitest";

import {
  DEFAULT_RETRY_AFTER_MS,
  MAX_RETRY_AFTER_MS,
  parseRetryAfter,
} from "~/lib/retry-after";

const NOW = Date.parse("2026-08-17T12:00:00.000Z");

describe("parseRetryAfter", () => {
  it("parses delta-seconds", () => {
    expect(parseRetryAfter("30")).toBe(30_000);
  });

  it("parses an HTTP-date", () => {
    expect(parseRetryAfter(new Date(NOW + 15_000).toUTCString(), NOW)).toBe(
      15_000,
    );
  });

  it("falls back to the default when absent or unparseable", () => {
    expect(parseRetryAfter(null)).toBe(DEFAULT_RETRY_AFTER_MS);
    expect(parseRetryAfter("not-a-date")).toBe(DEFAULT_RETRY_AFTER_MS);
    expect(parseRetryAfter("  ")).toBe(DEFAULT_RETRY_AFTER_MS);
  });

  it("falls back to the default for a non-positive window", () => {
    // A past date or clock skew must never resolve to "retry immediately".
    expect(parseRetryAfter(new Date(NOW - 1_000).toUTCString(), NOW)).toBe(
      DEFAULT_RETRY_AFTER_MS,
    );
    expect(parseRetryAfter(new Date(NOW).toUTCString(), NOW)).toBe(
      DEFAULT_RETRY_AFTER_MS,
    );
    expect(parseRetryAfter("-5")).toBe(DEFAULT_RETRY_AFTER_MS);
  });

  it("clamps an excessive window", () => {
    expect(parseRetryAfter("999999")).toBe(MAX_RETRY_AFTER_MS);
  });
});

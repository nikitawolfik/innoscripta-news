import type { SourceId } from "~/types/source";

class SourceError extends Error {
  readonly source: SourceId;

  constructor(source: SourceId, message: string) {
    super(message);
    this.name = "SourceError";
    this.source = source;
  }
}

export class RateLimitError extends SourceError {
  readonly retryAfterMs: number;
  /** Absolute timestamp the countdown UI ticks toward. */
  readonly retryAt: number;

  constructor(source: SourceId, retryAfterMs: number) {
    super(source, `${source} is rate-limited`);
    this.name = "RateLimitError";
    this.retryAfterMs = retryAfterMs;
    this.retryAt = Date.now() + retryAfterMs;
  }
}

export class SourceUnavailableError extends SourceError {
  constructor(source: SourceId, message = `${source} is unavailable`) {
    super(source, message);
    this.name = "SourceUnavailableError";
  }
}

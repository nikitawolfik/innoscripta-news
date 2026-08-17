export const DEFAULT_RETRY_AFTER_MS = 60_000;
export const MAX_RETRY_AFTER_MS = 5 * 60_000;

/**
 * Parses a `Retry-After` header (delta-seconds or HTTP-date). Absent, invalid,
 * or non-positive values fall back to `DEFAULT_RETRY_AFTER_MS` so a past date
 * or clock skew never means "retry immediately".
 */
export function parseRetryAfter(
  value: string | null,
  now = Date.now(),
): number {
  if (value === null) {
    return DEFAULT_RETRY_AFTER_MS;
  }

  const trimmedValue = value.trim();
  const deltaSeconds = /^\d+$/.test(trimmedValue)
    ? Number(trimmedValue)
    : Number.NaN;
  const parsedMs = Number.isFinite(deltaSeconds)
    ? deltaSeconds * 1_000
    : Date.parse(trimmedValue) - now;

  if (!Number.isFinite(parsedMs) || parsedMs <= 0) {
    return DEFAULT_RETRY_AFTER_MS;
  }

  return Math.min(parsedMs, MAX_RETRY_AFTER_MS);
}

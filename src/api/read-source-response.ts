import { RateLimitError, SourceUnavailableError } from "~/api/errors";
import { parseRetryAfter } from "~/lib/retry-after";
import type { SourceId } from "~/types/source";

export async function readSourceJson(
  response: Response,
  source: SourceId,
): Promise<unknown> {
  if (response.status === 429) {
    throw new RateLimitError(
      source,
      parseRetryAfter(response.headers.get("Retry-After")),
    );
  }

  if (!response.ok) {
    throw new SourceUnavailableError(
      source,
      `${source} upstream returned ${response.status}`,
    );
  }

  return response.json();
}

import { guardianClient } from "~/api/sources/guardian";
import { newsApiClient } from "~/api/sources/newsapi";
import { nytClient } from "~/api/sources/nyt";
import type { SourceClient, SourceFailure } from "~/api/types";
import type { Filters } from "~/types/filters";

export const SOURCES: SourceClient[] = [
  newsApiClient,
  guardianClient,
  nytClient,
];

export type SourcePartition = {
  eligible: SourceClient[];
  excluded: SourceFailure[];
};

export function partitionSources(filters: Filters): SourcePartition {
  const selectedSources =
    filters.sources.length > 0
      ? SOURCES.filter((sourceClient) =>
          filters.sources.includes(sourceClient.id),
        )
      : SOURCES;

  const eligible: SourceClient[] = [];
  const excluded: SourceFailure[] = [];

  // Each client explains itself. The registry deliberately holds no opinion
  // about why a source opted out — a second copy of that reasoning here drifts
  // from the client's the moment an API's constraints change.
  for (const sourceClient of selectedSources) {
    const reason = sourceClient.unsupportedReason(filters);

    if (reason === null) {
      eligible.push(sourceClient);
    } else {
      excluded.push({
        source: sourceClient.id,
        reason: "excluded",
        detail: reason,
      });
    }
  }

  return { eligible, excluded };
}

export function getSourceLabel(sourceId: string): string {
  return getSourceClient(sourceId)?.label ?? sourceId;
}

export function getSourceClient(sourceId: string): SourceClient | null {
  return SOURCES.find((candidate) => candidate.id === sourceId) ?? null;
}

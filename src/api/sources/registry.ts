import { guardianClient } from "~/api/sources/guardian";
import type { SourceClient, SourceFailure } from "~/api/types";
import type { Filters } from "~/types/filters";

// NYT and NewsAPI join in P4; the feed code is written against the list, not
// against any individual client.
export const SOURCES: SourceClient[] = [guardianClient];

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

  for (const sourceClient of selectedSources) {
    if (sourceClient.supports(filters)) {
      eligible.push(sourceClient);
    } else {
      excluded.push({
        source: sourceClient.id,
        reason: "excluded",
        detail: `${sourceClient.label} cannot honour the selected filters`,
      });
    }
  }

  return { eligible, excluded };
}

export function getSourceLabel(sourceId: string): string {
  const sourceClient = SOURCES.find((candidate) => candidate.id === sourceId);

  return sourceClient?.label ?? sourceId;
}

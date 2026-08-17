import type { Article } from "~/types/article";
import type { Filters } from "~/types/filters";
import type { SourceId } from "~/types/source";

export type SourceCapabilities = {
  keyword: boolean;
  dateRange: boolean;
  category: boolean;
  author: boolean;
  body: boolean;
  fetchById: boolean;
};

export type SearchResult = {
  articles: Article[];
  page: number;
  hasMore: boolean;
  droppedInvalidCount: number;
};

export type SourceClient = {
  id: SourceId;
  label: string;
  capabilities: SourceCapabilities;
  /**
   * `null` when the source can honour the filters, otherwise a reader-facing
   * sentence explaining why it cannot. The reason is surfaced verbatim in the
   * excluded-sources notice, so it has to say what the user could change —
   * "NewsAPI needs a keyword or category", not "unsupported filters".
   */
  unsupportedReason: (filters: Filters) => string | null;
  search: (filters: Filters, page: number) => Promise<SearchResult>;
  fetchById: ((id: string) => Promise<Article | null>) | null;
};

export type SourceFailure =
  | { source: SourceId; reason: "rate_limited"; retryAt: number }
  | { source: SourceId; reason: "unavailable" }
  | { source: SourceId; reason: "excluded"; detail: string };

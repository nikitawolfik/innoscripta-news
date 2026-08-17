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
  supports: (filters: Filters) => boolean;
  search: (filters: Filters, page: number) => Promise<SearchResult>;
  fetchById: ((id: string) => Promise<Article | null>) | null;
};

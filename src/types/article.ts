import type { SourceId } from "~/types/source";

export type Article = {
  id: string;
  source: SourceId;
  sourceLabel: string;
  title: string;
  description: string | null;
  body: string | null;
  author: string | null;
  category: string | null;
  imageUrl: string | null;
  url: string;
  publishedAt: string;
};

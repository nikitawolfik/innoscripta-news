import type { SourceId } from "~/types/source";

export type CategoryId =
  | "general"
  | "business"
  | "entertainment"
  | "health"
  | "science"
  | "sports"
  | "technology";

type CategoryOption = {
  id: CategoryId;
  label: string;
  sourceValues: Record<SourceId, string>;
};

export const CATEGORY_OPTIONS: CategoryOption[] = [
  {
    id: "general",
    label: "General",
    sourceValues: { newsapi: "general", guardian: "world", nyt: "World" },
  },
  {
    id: "business",
    label: "Business",
    sourceValues: {
      newsapi: "business",
      guardian: "business",
      nyt: "Business",
    },
  },
  {
    id: "entertainment",
    label: "Entertainment",
    sourceValues: {
      newsapi: "entertainment",
      guardian: "culture",
      nyt: "Arts",
    },
  },
  {
    id: "health",
    label: "Health",
    sourceValues: { newsapi: "health", guardian: "society", nyt: "Health" },
  },
  {
    id: "science",
    label: "Science",
    sourceValues: { newsapi: "science", guardian: "science", nyt: "Science" },
  },
  {
    id: "sports",
    label: "Sports",
    sourceValues: { newsapi: "sports", guardian: "sport", nyt: "Sports" },
  },
  {
    id: "technology",
    label: "Technology",
    sourceValues: {
      newsapi: "technology",
      guardian: "technology",
      nyt: "Technology",
    },
  },
];

export function mapCategoriesForSource(
  categories: string[],
  source: SourceId,
): string[] {
  return categories.map((category) => {
    const option = CATEGORY_OPTIONS.find(
      (candidate) => candidate.id === category,
    );

    return option?.sourceValues[source] ?? category;
  });
}

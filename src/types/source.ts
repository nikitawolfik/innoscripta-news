export type SourceId = "newsapi" | "guardian" | "nyt";

export const SOURCE_IDS: SourceId[] = ["newsapi", "guardian", "nyt"];

export function isSourceId(value: string): value is SourceId {
  return (SOURCE_IDS as string[]).includes(value);
}

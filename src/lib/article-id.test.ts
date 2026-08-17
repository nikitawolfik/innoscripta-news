import { describe, expect, it } from "vitest";

import { decodeArticleId, encodeArticleId } from "~/lib/article-id";

describe("article id encoding", () => {
  it("round-trips ids that contain slashes and ://", () => {
    const samples = [
      "technology/2024/jan/01/ai-future-2024",
      "https://www.theguardian.com/world/2024/feb/02/climate-talks",
      "nyt://article/12345",
    ];

    for (const sample of samples) {
      expect(decodeArticleId(encodeArticleId(sample))).toBe(sample);
    }
  });

  it("returns null for undecodable values", () => {
    expect(decodeArticleId("%%%")).toBeNull();
  });
});

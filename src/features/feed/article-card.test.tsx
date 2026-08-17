import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ArticleCard } from "~/features/feed/article-card";
import { encodeArticleId } from "~/lib/article-id";
import type { Article } from "~/types/article";

const BASE_ARTICLE: Article = {
  id: "technology/2024/jan/01/ai-future-2024",
  source: "guardian",
  sourceLabel: "The Guardian",
  title: "AI in 2024: What to Expect",
  description: "A look ahead at artificial intelligence.",
  body: null,
  author: "Jane Smith",
  category: "Technology",
  imageUrl: "https://media.guim.co.uk/example/thumbnail.jpg",
  url: "https://www.theguardian.com/technology/2024/jan/01/ai-future-2024",
  publishedAt: "2024-01-01T10:00:00Z",
};

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2024-01-02T10:00:00Z"));
});

afterEach(() => {
  vi.useRealTimers();
});

function renderCard(article: Article) {
  return render(
    <MemoryRouter>
      <ArticleCard article={article} />
    </MemoryRouter>,
  );
}

describe("ArticleCard", () => {
  it("renders the thumbnail when the article has an image", () => {
    renderCard(BASE_ARTICLE);

    // The thumbnail is decorative (alt=""), which maps to role "presentation".
    expect(screen.getByRole("presentation")).toHaveAttribute(
      "src",
      BASE_ARTICLE.imageUrl,
    );
    expect(
      screen.queryByTestId("article-image-placeholder"),
    ).not.toBeInTheDocument();
  });

  it("renders a placeholder when the article has no image", () => {
    renderCard({ ...BASE_ARTICLE, imageUrl: null });

    expect(screen.queryByRole("presentation")).not.toBeInTheDocument();
    expect(screen.getByTestId("article-image-placeholder")).toBeInTheDocument();
  });

  it("links to the detail route with the encoded article id", () => {
    renderCard(BASE_ARTICLE);

    expect(screen.getByRole("link")).toHaveAttribute(
      "href",
      `/post/guardian/${encodeArticleId(BASE_ARTICLE.id)}`,
    );
  });

  it("matches the snapshot", () => {
    const { container } = renderCard(BASE_ARTICLE);

    expect(container).toMatchSnapshot();
  });
});

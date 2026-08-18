import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";

import { ArticleDetail } from "~/features/article/article-detail";
import type { Article } from "~/types/article";

const BASE_ARTICLE: Article = {
  id: "world/2026/aug/18/example",
  source: "guardian",
  sourceLabel: "The Guardian",
  title: "A headline",
  description: "The standfirst.",
  body: null,
  author: "Jane Smith",
  category: "World news",
  imageUrl: null,
  url: "https://www.theguardian.com/world/2026/aug/18/example",
  publishedAt: "2026-08-18T09:00:00Z",
};

function renderDetail(article: Partial<Article> = {}) {
  return render(
    <MemoryRouter>
      <ArticleDetail article={{ ...BASE_ARTICLE, ...article }} />
    </MemoryRouter>,
  );
}

describe("ArticleDetail", () => {
  it("renders the Guardian body when full text is available", () => {
    renderDetail({ body: "<p>First paragraph.</p><p>Second.</p>" });

    expect(screen.getByText("First paragraph.")).toBeInTheDocument();
    expect(screen.getByText("Second.")).toBeInTheDocument();
  });

  it("strips scripts and event handlers from source HTML", () => {
    const { container } = renderDetail({
      body: '<p>Safe</p><script>window.pwned = true;</script><img src="x" onerror="window.pwned = true">',
    });

    // The body is third-party HTML rendered into our origin, where the proxy
    // lives — sanitizing is what makes dangerouslySetInnerHTML acceptable.
    expect(screen.getByText("Safe")).toBeInTheDocument();
    expect(container.querySelector("script")).toBeNull();
    expect(container.querySelector("[onerror]")).toBeNull();
  });

  it("explains the summary when a source licenses no body text", () => {
    renderDetail({ body: null, sourceLabel: "The New York Times" });

    expect(screen.getByText("The standfirst.")).toBeInTheDocument();
    expect(
      screen.getByText(/provides a summary through its API/),
    ).toBeInTheDocument();
  });

  it("always links out to the original", () => {
    renderDetail();

    const link = screen.getByRole("link", { name: /Read at The Guardian/ });

    expect(link).toHaveAttribute("href", BASE_ARTICLE.url);
    expect(link).toHaveAttribute("rel", "noreferrer");
  });
});

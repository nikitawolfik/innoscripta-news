import { QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it } from "vitest";

import { createQueryClient } from "~/lib/query-client";
import { encodeArticleId } from "~/lib/article-id";
import { ArticleRoute } from "~/routes/article-route";
import { mswServer } from "../../tests/msw/server";

function renderRoute(path: string) {
  return render(
    <QueryClientProvider client={createQueryClient()}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/post/:source/:id" element={<ArticleRoute />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("ArticleRoute", () => {
  it("explains that NewsAPI articles cannot be deep-linked", async () => {
    renderRoute(`/post/newsapi/${encodeArticleId("https://example.com/a")}`);

    expect(
      await screen.findByRole("heading", {
        name: /can’t be opened here/,
      }),
    ).toBeInTheDocument();
  });

  it("treats an undecodable id as a bad link, not an error", async () => {
    renderRoute("/post/guardian/!!!not-base64!!!");

    expect(
      await screen.findByRole("heading", { name: "Article not found" }),
    ).toBeInTheDocument();
  });

  it("renders the article once the source resolves it", async () => {
    mswServer.use(
      http.get("*/api/guardian/*", () =>
        HttpResponse.json({
          response: {
            status: "ok",
            content: {
              id: "world/2026/aug/18/example",
              webTitle: "Resolved from a cold link",
              webUrl: "https://www.theguardian.com/world/2026/aug/18/example",
              webPublicationDate: "2026-08-18T09:00:00Z",
              sectionName: "World news",
            },
          },
        }),
      ),
    );

    renderRoute(
      `/post/guardian/${encodeArticleId("world/2026/aug/18/example")}`,
    );

    expect(
      await screen.findByRole("heading", { name: "Resolved from a cold link" }),
    ).toBeInTheDocument();
  });
});

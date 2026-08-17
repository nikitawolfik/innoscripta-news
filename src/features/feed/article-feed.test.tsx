import { QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import { delay, http, HttpResponse } from "msw";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";

import { ArticleFeed } from "~/features/feed/article-feed";
import { createQueryClient } from "~/lib/query-client";
import { DEFAULT_FILTERS } from "~/types/filters";
import { mswServer } from "../../../tests/msw/server";

const GUARDIAN_SEARCH_URL = "*/api/guardian/search";
const PAGE_SIZE = 10;

type GuardianPageOptions = {
  currentPage: number;
  pages: number;
  articleCount?: number;
};

function guardianPage({
  currentPage,
  pages,
  articleCount = PAGE_SIZE,
}: GuardianPageOptions) {
  const results = Array.from({ length: articleCount }, (_, index) => {
    const articleNumber = (currentPage - 1) * PAGE_SIZE + index + 1;

    return {
      id: `world/2024/jan/01/article-${articleNumber}`,
      webTitle: `Guardian article ${articleNumber}`,
      webUrl: `https://www.theguardian.com/world/2024/jan/01/article-${articleNumber}`,
      webPublicationDate: "2024-01-01T10:00:00Z",
      sectionName: "World news",
    };
  });

  return {
    response: {
      status: "ok",
      currentPage,
      pages,
      results,
    },
  };
}

function renderFeed() {
  return render(
    <QueryClientProvider client={createQueryClient()}>
      <MemoryRouter>
        <ArticleFeed filters={DEFAULT_FILTERS} />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("ArticleFeed", () => {
  it("shows the loading skeleton, then the articles", async () => {
    mswServer.use(
      http.get(GUARDIAN_SEARCH_URL, async () => {
        await delay(100);
        return HttpResponse.json(
          guardianPage({ currentPage: 1, pages: 1, articleCount: 3 }),
        );
      }),
    );

    renderFeed();

    expect(
      screen.getByRole("status", { name: "Loading articles" }),
    ).toBeInTheDocument();

    expect(await screen.findByText("Guardian article 1")).toBeInTheDocument();
    expect(
      screen.queryByRole("status", { name: "Loading articles" }),
    ).not.toBeInTheDocument();
  });

  it("shows the empty state when no articles match", async () => {
    mswServer.use(
      http.get(GUARDIAN_SEARCH_URL, () =>
        HttpResponse.json(
          guardianPage({ currentPage: 1, pages: 1, articleCount: 0 }),
        ),
      ),
    );

    renderFeed();

    expect(
      await screen.findByText("No articles match these filters"),
    ).toBeInTheDocument();
  });

  it("shows the error state with a retry action when every source fails", async () => {
    mswServer.use(
      http.get(GUARDIAN_SEARCH_URL, () =>
        HttpResponse.json({ error: "upstream_error" }, { status: 500 }),
      ),
    );

    renderFeed();

    expect(
      await screen.findByText("Couldn't load the feed", undefined, {
        timeout: 10_000,
      }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Try again" })).toBeVisible();
  }, 15_000);

  it("fetches the next page exactly once at the threshold", async () => {
    const requestedPages: string[] = [];

    mswServer.use(
      http.get(GUARDIAN_SEARCH_URL, ({ request }) => {
        const page = new URL(request.url).searchParams.get("page") ?? "1";
        requestedPages.push(page);

        return HttpResponse.json(
          guardianPage({ currentPage: Number(page), pages: 2 }),
        );
      }),
    );

    renderFeed();

    await screen.findByText("Guardian article 1");
    await waitFor(() => {
      expect(requestedPages).toContain("2");
    });
    await waitFor(() => {
      expect(screen.getByText("You're all caught up.")).toBeInTheDocument();
    });

    expect(requestedPages.filter((page) => page === "2")).toHaveLength(1);
    expect(requestedPages).toEqual(["1", "2"]);
  });

  it("pauses on a 429 instead of firing more requests", async () => {
    let pageTwoRequests = 0;

    mswServer.use(
      http.get(GUARDIAN_SEARCH_URL, ({ request }) => {
        const page = new URL(request.url).searchParams.get("page") ?? "1";

        if (page === "2") {
          pageTwoRequests += 1;
          return HttpResponse.json(
            { error: "rate_limited" },
            { status: 429, headers: { "Retry-After": "60" } },
          );
        }

        return HttpResponse.json(guardianPage({ currentPage: 1, pages: 2 }));
      }),
    );

    renderFeed();

    expect(
      await screen.findByText(/rate-limited, resuming in/),
    ).toBeInTheDocument();

    // Give an unguarded effect time to storm; the count must stay at one.
    await delay(300);
    expect(pageTwoRequests).toBe(1);
  });

  it("auto-resumes when the countdown reaches zero", async () => {
    let pageTwoRequests = 0;

    mswServer.use(
      http.get(GUARDIAN_SEARCH_URL, ({ request }) => {
        const page = new URL(request.url).searchParams.get("page") ?? "1";

        if (page !== "2") {
          return HttpResponse.json(guardianPage({ currentPage: 1, pages: 2 }));
        }

        pageTwoRequests += 1;

        if (pageTwoRequests === 1) {
          return HttpResponse.json(
            { error: "rate_limited" },
            { status: 429, headers: { "Retry-After": "1" } },
          );
        }

        return HttpResponse.json(guardianPage({ currentPage: 2, pages: 2 }));
      }),
    );

    renderFeed();

    expect(
      await screen.findByText(/rate-limited, resuming in/),
    ).toBeInTheDocument();

    // Page-2 articles sit below the viewport with the taller mobile row height,
    // so assert the end-of-feed marker and the request count instead of a title.
    await waitFor(
      () => {
        expect(pageTwoRequests).toBe(2);
        expect(screen.getByText("You're all caught up.")).toBeInTheDocument();
      },
      { timeout: 5_000 },
    );
  }, 10_000);
});

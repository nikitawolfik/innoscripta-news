import { QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it } from "vitest";

import { createQueryClient } from "~/lib/query-client";
import { FeedRoute } from "~/routes/feed-route";
import { usePreferencesStore } from "~/stores/preferences-store";
import { DEFAULT_FILTERS } from "~/types/filters";

function renderFeedRoute() {
  return render(
    <QueryClientProvider client={createQueryClient()}>
      <MemoryRouter>
        <FeedRoute />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  localStorage.clear();
  usePreferencesStore.setState({ filters: DEFAULT_FILTERS });
});

describe("FeedRoute", () => {
  it("onboards instead of rendering a feed when nothing is chosen", () => {
    renderFeedRoute();

    // An unfiltered /feed would be identical to /, so the empty state has to
    // explain what the page is for rather than silently duplicating Discover.
    expect(
      screen.getByRole("heading", { name: "Build your feed" }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("renders the feed once a preference exists", () => {
    usePreferencesStore.setState({
      filters: { ...DEFAULT_FILTERS, sources: ["guardian"] },
    });

    renderFeedRoute();

    expect(
      screen.queryByRole("heading", { name: "Build your feed" }),
    ).not.toBeInTheDocument();
    expect(screen.getByLabelText("Loading articles")).toBeInTheDocument();
  });

  it("keeps the filter bar available in the empty state", () => {
    renderFeedRoute();

    // The bar is the preferences editor — hiding it would leave no way out.
    expect(screen.getByLabelText("Search articles")).toBeInTheDocument();
  });
});

import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { FilterBar } from "~/features/filters/filter-bar";
import { SEARCH_DEBOUNCE_MS } from "~/features/filters/search-input";
import { DEFAULT_FILTERS, type Filters } from "~/types/filters";

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

function renderBar(filters: Filters = DEFAULT_FILTERS) {
  const setFilters = vi.fn();
  render(<FilterBar filters={filters} setFilters={setFilters} />);

  return setFilters;
}

describe("FilterBar", () => {
  it("debounces the search input into a single patch", () => {
    const setFilters = renderBar();
    const searchInput = screen.getByLabelText("Search articles");

    fireEvent.change(searchInput, { target: { value: "cli" } });
    fireEvent.change(searchInput, { target: { value: "clim" } });
    fireEvent.change(searchInput, { target: { value: "climate" } });

    vi.advanceTimersByTime(SEARCH_DEBOUNCE_MS - 1);
    expect(setFilters).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1);
    expect(setFilters).toHaveBeenCalledTimes(1);
    expect(setFilters).toHaveBeenCalledWith({ q: "climate" });
  });

  it("patches authors on Enter", () => {
    const setFilters = renderBar();
    const authorInput = screen.getByLabelText("Filter by authors");

    fireEvent.change(authorInput, {
      target: { value: "Jane Smith, John Doe" },
    });
    fireEvent.keyDown(authorInput, { key: "Enter" });

    expect(setFilters).toHaveBeenCalledWith({
      authors: ["Jane Smith", "John Doe"],
    });
  });

  it("resets to the defaults when filters are active", () => {
    const setFilters = renderBar({ ...DEFAULT_FILTERS, q: "climate" });

    fireEvent.click(screen.getByRole("button", { name: "Reset" }));

    expect(setFilters).toHaveBeenCalledWith(DEFAULT_FILTERS);
  });

  it("hides the reset action when nothing is filtered", () => {
    renderBar();

    expect(
      screen.queryByRole("button", { name: "Reset" }),
    ).not.toBeInTheDocument();
  });
});

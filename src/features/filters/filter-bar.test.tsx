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

/**
 * Everything but the search box edits a draft, so a test that exercises a
 * control has to submit it before anything reaches the feed.
 */
function applyDraft() {
  fireEvent.click(screen.getByRole("button", { name: "Apply" }));
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
    expect(setFilters).toHaveBeenCalledWith(
      { q: "climate" },
      // Replaces so Back does not walk the query one typing pause at a time.
      { replace: true },
    );
  });

  it("adds an author on Enter", () => {
    const setFilters = renderBar();
    const authorInput = screen.getByLabelText("Filter by authors");

    fireEvent.change(authorInput, { target: { value: "Jane Smith" } });
    fireEvent.keyDown(authorInput, { key: "Enter" });

    expect(setFilters).not.toHaveBeenCalled();

    applyDraft();

    expect(setFilters).toHaveBeenCalledWith({ authors: ["Jane Smith"] });
  });

  it("adds an author with the Add button", () => {
    const setFilters = renderBar();

    fireEvent.change(screen.getByLabelText("Filter by authors"), {
      target: { value: "Marina Hyde" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Add" }));
    applyDraft();

    expect(setFilters).toHaveBeenCalledWith({ authors: ["Marina Hyde"] });
  });

  it("keeps a comma inside a name rather than splitting on it", () => {
    const setFilters = renderBar();
    const authorInput = screen.getByLabelText("Filter by authors");

    // Display names contain commas, which is why the URL uses one repeated
    // `author` param per name instead of a joined list.
    fireEvent.change(authorInput, { target: { value: "Smith, Jr." } });
    fireEvent.keyDown(authorInput, { key: "Enter" });
    applyDraft();

    expect(setFilters).toHaveBeenCalledWith({ authors: ["Smith, Jr."] });
  });

  it("appends to the authors already chosen", () => {
    const setFilters = renderBar({
      ...DEFAULT_FILTERS,
      authors: ["Jane Smith"],
    });

    fireEvent.change(screen.getByLabelText("Filter by authors"), {
      target: { value: "John Doe" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Add" }));
    applyDraft();

    expect(setFilters).toHaveBeenCalledWith({
      authors: ["Jane Smith", "John Doe"],
    });
  });

  it("removes an author from its chip", () => {
    const setFilters = renderBar({
      ...DEFAULT_FILTERS,
      authors: ["Jane Smith", "John Doe"],
    });

    fireEvent.click(screen.getByRole("button", { name: "Remove Jane Smith" }));
    applyDraft();

    expect(setFilters).toHaveBeenCalledWith({ authors: ["John Doe"] });
  });

  it("ignores an empty or duplicate name", () => {
    const setFilters = renderBar({
      ...DEFAULT_FILTERS,
      authors: ["Jane Smith"],
    });
    const authorInput = screen.getByLabelText("Filter by authors");

    fireEvent.keyDown(authorInput, { key: "Enter" });
    fireEvent.change(authorInput, { target: { value: "  Jane Smith  " } });
    fireEvent.keyDown(authorInput, { key: "Enter" });

    expect(setFilters).not.toHaveBeenCalled();
  });

  it("resets to the defaults when filters are active", () => {
    const setFilters = renderBar({ ...DEFAULT_FILTERS, q: "climate" });

    // Reset does not wait for Apply: clearing everything is unambiguous.
    fireEvent.click(screen.getByRole("button", { name: "Reset" }));

    expect(setFilters).toHaveBeenCalledWith(DEFAULT_FILTERS);
  });

  it("keeps Apply inert until the draft differs from the applied filters", () => {
    renderBar();
    const applyButton = screen.getByRole("button", { name: "Apply" });

    expect(applyButton).toBeDisabled();

    fireEvent.change(screen.getByLabelText("Filter by authors"), {
      target: { value: "Marina Hyde" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Add" }));

    expect(applyButton).toBeEnabled();
  });

  it("keeps Reset in place but inert when nothing is filtered", () => {
    // Mounted either way: applying commits the draft and the filters through
    // two stores, and unmounting on the render between them made the button
    // blink and the row shift.
    renderBar();

    expect(screen.getByRole("button", { name: "Reset" })).toBeDisabled();
  });

  it("enables Reset for a draft that has not been applied yet", () => {
    renderBar();

    fireEvent.change(screen.getByLabelText("Filter by authors"), {
      target: { value: "Marina Hyde" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Add" }));

    expect(screen.getByRole("button", { name: "Reset" })).toBeEnabled();
  });
});

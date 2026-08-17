import { act, renderHook } from "@testing-library/react";
import { MemoryRouter, useLocation } from "react-router-dom";
import { describe, expect, it } from "vitest";

import { useUrlFilters } from "~/hooks/use-url-filters";
import { DEFAULT_FILTERS } from "~/types/filters";

function renderUrlFilters(initialSearch = "") {
  return renderHook(
    () => ({ tuple: useUrlFilters(), location: useLocation() }),
    {
      wrapper: ({ children }) => (
        <MemoryRouter initialEntries={[`/${initialSearch}`]}>
          {children}
        </MemoryRouter>
      ),
    },
  );
}

describe("useUrlFilters", () => {
  it("parses the current search params into filters", () => {
    const { result } = renderUrlFilters("?q=solar&sources=guardian");

    expect(result.current.tuple[0]).toEqual({
      ...DEFAULT_FILTERS,
      q: "solar",
      sources: ["guardian"],
    });
  });

  it("merges a patch into the URL without dropping other filters", () => {
    const { result } = renderUrlFilters("?q=solar");

    act(() => {
      result.current.tuple[1]({ categories: ["technology"] });
    });

    expect(result.current.location.search).toBe(
      "?q=solar&categories=technology",
    );
    expect(result.current.tuple[0]).toEqual({
      ...DEFAULT_FILTERS,
      q: "solar",
      categories: ["technology"],
    });
  });

  it("clears params when a patch resets to defaults", () => {
    const { result } = renderUrlFilters("?q=solar&sources=guardian");

    act(() => {
      result.current.tuple[1](DEFAULT_FILTERS);
    });

    expect(result.current.location.search).toBe("");
    expect(result.current.tuple[0]).toEqual(DEFAULT_FILTERS);
  });
});

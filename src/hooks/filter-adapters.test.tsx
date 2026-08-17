import type { ReactNode } from "react";

import { act, renderHook } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it } from "vitest";

import { usePreferenceFilters } from "~/hooks/use-preference-filters";
import { useUrlFilters } from "~/hooks/use-url-filters";
import { usePreferencesStore } from "~/stores/preferences-store";
import {
  DEFAULT_FILTERS,
  type Filters,
  type SetFilters,
} from "~/types/filters";

type Adapter = {
  name: string;
  useAdapter: () => [Filters, SetFilters];
  wrapper: ({ children }: { children: ReactNode }) => ReactNode;
};

/**
 * `<FilterBar>` is handed one of these and cannot tell them apart — that
 * substitutability is the whole reason `/` and `/feed` share a component, so
 * the same suite runs against both rather than testing each in isolation.
 */
const ADAPTERS: Adapter[] = [
  {
    name: "useUrlFilters",
    useAdapter: useUrlFilters,
    wrapper: ({ children }) => <MemoryRouter>{children}</MemoryRouter>,
  },
  {
    name: "usePreferenceFilters",
    useAdapter: usePreferenceFilters,
    wrapper: ({ children }) => children,
  },
];

beforeEach(() => {
  localStorage.clear();
  usePreferencesStore.setState({ filters: DEFAULT_FILTERS });
});

describe.each(ADAPTERS)("$name satisfies the filter contract", (adapter) => {
  function render() {
    return renderHook(() => adapter.useAdapter(), {
      wrapper: adapter.wrapper,
    });
  }

  it("starts from the shared defaults", () => {
    const { result } = render();

    expect(result.current[0]).toEqual(DEFAULT_FILTERS);
  });

  it("applies a patch and exposes it on the next read", () => {
    const { result } = render();

    act(() => {
      result.current[1]({ categories: ["science"] });
    });

    expect(result.current[0].categories).toEqual(["science"]);
  });

  it("merges successive patches instead of replacing", () => {
    const { result } = render();

    act(() => {
      result.current[1]({ q: "climate" });
    });
    act(() => {
      result.current[1]({ sources: ["guardian"] });
    });

    expect(result.current[0]).toEqual({
      ...DEFAULT_FILTERS,
      q: "climate",
      sources: ["guardian"],
    });
  });

  it("clears back to the defaults", () => {
    const { result } = render();

    act(() => {
      result.current[1]({ q: "climate", categories: ["science"] });
    });
    act(() => {
      result.current[1](DEFAULT_FILTERS);
    });

    expect(result.current[0]).toEqual(DEFAULT_FILTERS);
  });
});

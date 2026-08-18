import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { useDraftFilters } from "~/hooks/use-draft-filters";
import { DEFAULT_FILTERS, type Filters } from "~/types/filters";

const APPLIED: Filters = {
  ...DEFAULT_FILTERS,
  sources: ["guardian"],
  categories: ["technology"],
};

function renderDraft(filters: Filters = APPLIED) {
  const setFilters = vi.fn();
  const view = renderHook(
    ({ applied }: { applied: Filters }) => useDraftFilters(applied, setFilters),
    { initialProps: { applied: filters } },
  );

  return { ...view, setFilters };
}

describe("useDraftFilters", () => {
  it("shows edits in the draft without committing them", () => {
    const { result, setFilters } = renderDraft();

    act(() => {
      result.current.setDraft({ categories: ["technology", "business"] });
    });

    expect(result.current.draft.categories).toEqual(["technology", "business"]);
    expect(result.current.isDirty).toBe(true);
    expect(setFilters).not.toHaveBeenCalled();
  });

  it("submits every edited control as one patch", () => {
    const { result, setFilters } = renderDraft();

    act(() => {
      result.current.setDraft({ categories: ["business"] });
    });
    act(() => {
      result.current.setDraft({ authors: ["Marina Hyde"] });
    });
    act(() => {
      result.current.apply();
    });

    expect(setFilters).toHaveBeenCalledTimes(1);
    expect(setFilters).toHaveBeenCalledWith({
      categories: ["business"],
      authors: ["Marina Hyde"],
    });
  });

  it("stays clean when an edit lands back on the applied value", () => {
    const { result } = renderDraft();

    act(() => {
      result.current.setDraft({ categories: [] });
    });
    expect(result.current.isDirty).toBe(true);

    act(() => {
      result.current.setDraft({ categories: ["technology"] });
    });

    expect(result.current.isDirty).toBe(false);
  });

  it("ignores the order a set was rebuilt in", () => {
    const { result } = renderDraft({
      ...APPLIED,
      categories: ["technology", "business"],
    });

    // Unchecking then rechecking appends, so the array order flips without the
    // request changing. Lighting up Apply for that would be a lie.
    act(() => {
      result.current.setDraft({ categories: ["business", "technology"] });
    });

    expect(result.current.isDirty).toBe(false);
  });

  it("holds the submitted values until the applied filters catch up", () => {
    // The router commits its navigation at a lower priority than local state,
    // so there are renders after Apply where `filters` is still the old value.
    // Reverting the draft across that gap made every control flash.
    const { result, rerender } = renderDraft();

    act(() => {
      result.current.setDraft({ categories: ["business", "technology"] });
    });
    act(() => {
      result.current.apply();
    });

    rerender({ applied: APPLIED });

    expect(result.current.draft.categories).toEqual(["business", "technology"]);
  });

  it("releases the draft once the commit shows up in the filters", () => {
    const { result, rerender } = renderDraft();

    act(() => {
      result.current.setDraft({ categories: ["business"] });
    });
    act(() => {
      result.current.apply();
    });

    rerender({ applied: { ...APPLIED, categories: ["business"] } });

    expect(result.current.isDirty).toBe(false);

    // With the patch released, an external change is no longer overridden.
    rerender({ applied: DEFAULT_FILTERS });

    expect(result.current.draft).toEqual(DEFAULT_FILTERS);
  });

  it("commits nothing when the draft matches the applied filters", () => {
    const { result, setFilters } = renderDraft();

    act(() => {
      result.current.apply();
    });

    expect(setFilters).not.toHaveBeenCalled();
  });

  it("drops the draft on discard, leaving the applied filters alone", () => {
    const { result, setFilters } = renderDraft();

    act(() => {
      result.current.setDraft({ categories: ["business"] });
    });
    act(() => {
      result.current.discard();
    });

    expect(result.current.draft).toEqual(APPLIED);
    expect(result.current.isDirty).toBe(false);
    expect(setFilters).not.toHaveBeenCalled();
  });

  it("clears the draft and commits the defaults on reset", () => {
    const { result, setFilters } = renderDraft();

    act(() => {
      result.current.setDraft({ categories: ["business"] });
    });
    act(() => {
      result.current.reset();
    });

    expect(setFilters).toHaveBeenCalledWith(DEFAULT_FILTERS);
    expect(result.current.isDirty).toBe(false);
  });
});

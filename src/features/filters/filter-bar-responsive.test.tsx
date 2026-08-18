import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { FilterBar } from "~/features/filters/filter-bar";
import { DEFAULT_FILTERS } from "~/types/filters";

/**
 * The shared setup stubs a static matchMedia; crossing a breakpoint needs one
 * that can change and notify, which is what `useMediaQuery` subscribes to.
 */
function stubViewport(initiallyDesktop: boolean) {
  const listeners = new Set<() => void>();
  let matches = initiallyDesktop;

  vi.stubGlobal("matchMedia", (query: string) => ({
    get matches() {
      return matches;
    },
    media: query,
    onchange: null,
    addEventListener: (_event: string, listener: () => void) =>
      listeners.add(listener),
    removeEventListener: (_event: string, listener: () => void) =>
      listeners.delete(listener),
    addListener: () => undefined,
    removeListener: () => undefined,
    dispatchEvent: () => false,
  }));

  return {
    resizeTo(desktop: boolean) {
      matches = desktop;
      act(() => {
        for (const listener of listeners) {
          listener();
        }
      });
    },
  };
}

function renderBar() {
  render(<FilterBar filters={DEFAULT_FILTERS} setFilters={vi.fn()} />);
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("FilterBar across the breakpoint", () => {
  it("closes the filter sheet when the viewport grows past the breakpoint", () => {
    const viewport = stubViewport(false);
    renderBar();

    fireEvent.click(screen.getByRole("button", { name: "Open filters" }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();

    viewport.resizeTo(true);

    // Radix portals the sheet to document.body, so `md:hidden` on the trigger
    // wrapper would leave this overlay stranded over the desktop layout.
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Open filters" }),
    ).not.toBeInTheDocument();
  });

  it("offers no sheet trigger at desktop width", () => {
    stubViewport(true);
    renderBar();

    expect(
      screen.queryByRole("button", { name: "Open filters" }),
    ).not.toBeInTheDocument();
  });

  it("restores the trigger when the viewport shrinks back", () => {
    const viewport = stubViewport(true);
    renderBar();

    viewport.resizeTo(false);

    expect(
      screen.getByRole("button", { name: "Open filters" }),
    ).toBeInTheDocument();
  });
});

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { FilterSheet } from "~/features/filters/filter-sheet";
import { DEFAULT_FILTERS, type Filters } from "~/types/filters";

const ACTIVE_FILTERS: Filters = {
  ...DEFAULT_FILTERS,
  q: "climate",
  sources: ["guardian"],
  categories: ["technology"],
};

describe("FilterSheet", () => {
  it("counts only the filters the sheet actually contains", () => {
    // ACTIVE_FILTERS sets a query plus a source and a category. The search box
    // lives outside the sheet, so badging it would point at something the
    // sheet neither shows nor can clear.
    render(<FilterSheet filters={ACTIVE_FILTERS} setFilters={vi.fn()} />);

    expect(
      screen.getByRole("button", { name: /open filters/i }),
    ).toHaveTextContent("2");
  });

  it("shows no badge when only the search box is in use", () => {
    render(
      <FilterSheet
        filters={{ ...DEFAULT_FILTERS, q: "climate" }}
        setFilters={vi.fn()}
      />,
    );

    expect(
      screen.getByRole("button", { name: /open filters/i }),
    ).toHaveTextContent(/^Filters$/);
  });

  it("hides the badge when nothing is filtered", () => {
    render(<FilterSheet filters={DEFAULT_FILTERS} setFilters={vi.fn()} />);

    expect(
      screen.getByRole("button", { name: /open filters/i }),
    ).toHaveTextContent(/^Filters$/);
  });

  it("opens the sheet with the filter controls", async () => {
    const user = userEvent.setup();
    render(<FilterSheet filters={DEFAULT_FILTERS} setFilters={vi.fn()} />);

    await user.click(screen.getByRole("button", { name: /open filters/i }));

    expect(screen.getByRole("dialog", { name: "Filters" })).toBeInTheDocument();
    expect(screen.getByLabelText("Filter by authors")).toBeInTheDocument();
  });

  it("matches the snapshot", () => {
    const { container } = render(
      <FilterSheet filters={ACTIVE_FILTERS} setFilters={vi.fn()} />,
    );

    expect(container).toMatchSnapshot();
  });
});

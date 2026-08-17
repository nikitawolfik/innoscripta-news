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
  it("shows the active filter group count on the trigger", () => {
    render(<FilterSheet filters={ACTIVE_FILTERS} setFilters={vi.fn()} />);

    expect(
      screen.getByRole("button", { name: /open filters/i }),
    ).toHaveTextContent("3");
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

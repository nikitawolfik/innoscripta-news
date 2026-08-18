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

function renderSheet(filters: Filters = DEFAULT_FILTERS, isDirty = false) {
  const onApply = vi.fn();
  const onDiscard = vi.fn();

  const view = render(
    <FilterSheet
      filters={filters}
      setFilters={vi.fn()}
      onApply={onApply}
      onReset={vi.fn()}
      onDiscard={onDiscard}
      isDirty={isDirty}
    />,
  );

  return { ...view, onApply, onDiscard };
}

describe("FilterSheet", () => {
  it("counts only the filters the sheet actually contains", () => {
    // ACTIVE_FILTERS sets a query plus a source and a category. The search box
    // lives outside the sheet, so badging it would point at something the
    // sheet neither shows nor can clear.
    renderSheet(ACTIVE_FILTERS);

    expect(
      screen.getByRole("button", { name: /open filters/i }),
    ).toHaveTextContent("2");
  });

  it("shows no badge when only the search box is in use", () => {
    renderSheet({ ...DEFAULT_FILTERS, q: "climate" });

    expect(
      screen.getByRole("button", { name: /open filters/i }),
    ).toHaveTextContent(/^Filters$/);
  });

  it("hides the badge when nothing is filtered", () => {
    renderSheet();

    expect(
      screen.getByRole("button", { name: /open filters/i }),
    ).toHaveTextContent(/^Filters$/);
  });

  it("opens the sheet with the filter controls", async () => {
    const user = userEvent.setup();
    renderSheet();

    await user.click(screen.getByRole("button", { name: /open filters/i }));

    expect(screen.getByRole("dialog", { name: "Filters" })).toBeInTheDocument();
    expect(screen.getByLabelText("Filter by authors")).toBeInTheDocument();
  });

  it("abandons the draft when the sheet is dismissed", async () => {
    const user = userEvent.setup();
    const { onDiscard } = renderSheet();

    await user.click(screen.getByRole("button", { name: /open filters/i }));
    expect(onDiscard).not.toHaveBeenCalled();

    await user.keyboard("{Escape}");

    expect(onDiscard).toHaveBeenCalledTimes(1);
  });

  it("leaves Apply inert until something in the draft changes", async () => {
    const user = userEvent.setup();
    renderSheet(ACTIVE_FILTERS);

    await user.click(screen.getByRole("button", { name: /open filters/i }));

    expect(screen.getByRole("button", { name: "Apply" })).toBeDisabled();
  });

  it("closes the sheet once the draft is applied", async () => {
    const user = userEvent.setup();
    const { onApply } = renderSheet(ACTIVE_FILTERS, true);

    await user.click(screen.getByRole("button", { name: /open filters/i }));
    await user.click(screen.getByRole("button", { name: "Apply" }));

    expect(onApply).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("matches the snapshot", () => {
    const { container } = renderSheet(ACTIVE_FILTERS);

    expect(container).toMatchSnapshot();
  });
});

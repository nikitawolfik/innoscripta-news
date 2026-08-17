import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { DateRangePicker } from "~/features/filters/date-range-picker";

beforeEach(() => {
  // Only Date is faked: userEvent needs real timers to flush its own waits.
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2024-06-15T12:00:00Z"));
});

afterEach(() => {
  vi.useRealTimers();
});

describe("DateRangePicker", () => {
  it("applies the last-7-days preset relative to today", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<DateRangePicker from={null} to={null} onChange={onChange} />);

    await user.click(screen.getByRole("button", { name: /any time/i }));
    await user.click(screen.getByRole("button", { name: "Last 7 days" }));

    expect(onChange).toHaveBeenCalledWith({
      from: "2024-06-08",
      to: "2024-06-15",
    });
  });

  it("clears the range with the all-time preset", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <DateRangePicker from="2024-06-01" to="2024-06-10" onChange={onChange} />,
    );

    await user.click(
      screen.getByRole("button", { name: /1 jun 2024 – 10 jun 2024/i }),
    );
    await user.click(screen.getByRole("button", { name: "All time" }));

    expect(onChange).toHaveBeenCalledWith({ from: null, to: null });
  });

  it("matches the snapshot", () => {
    const { container } = render(
      <DateRangePicker from="2024-06-01" to="2024-06-10" onChange={vi.fn()} />,
    );

    expect(container).toMatchSnapshot();
  });
});

import { render, screen } from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { AppLayout } from "~/routes/app-layout";
import { RouteError } from "~/routes/route-error";

function Exploding(): React.ReactNode {
  throw new Error("Invalid time value");
}

function renderExplodingRoute() {
  const router = createMemoryRouter(
    [
      {
        element: <AppLayout />,
        errorElement: <RouteError />,
        children: [
          { index: true, element: <Exploding />, errorElement: <RouteError /> },
        ],
      },
    ],
    { initialEntries: ["/"] },
  );

  return render(<RouterProvider router={router} />);
}

describe("RouteError", () => {
  beforeEach(() => {
    // React logs the caught error; the test asserts recovery, not the noise.
    vi.spyOn(console, "error").mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("catches a throw during render instead of blanking the page", () => {
    renderExplodingRoute();

    expect(
      screen.getByRole("heading", { name: "Something went wrong" }),
    ).toBeInTheDocument();
  });

  it("surfaces the message rather than swallowing it", () => {
    renderExplodingRoute();

    expect(screen.getByText("Invalid time value")).toBeInTheDocument();
  });

  it("keeps the shell, so the reader can navigate away without reloading", () => {
    // The whole reason the boundary sits on the child route and not the layout.
    renderExplodingRoute();

    expect(screen.getByRole("navigation")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "My feed" })).toBeInTheDocument();
  });
});

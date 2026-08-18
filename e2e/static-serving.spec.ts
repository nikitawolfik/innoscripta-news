import { expect, test } from "./fixtures";

/**
 * Guards the container's own file serving, which `vite preview` would not
 * exercise. A trailing-separator slip in the path containment check once made
 * every asset fall through to the SPA shell: assets returned `text/html`, the
 * browser refused to execute them, and the page rendered blank while every
 * route still answered 200.
 */
test.describe("production server", () => {
  test("serves hashed assets with their real content type", async ({
    page,
  }) => {
    const contentTypes: string[] = [];

    page.on("response", (response) => {
      if (/\/assets\/.*\.js$/.test(new URL(response.url()).pathname)) {
        contentTypes.push(response.headers()["content-type"] ?? "");
      }
    });

    await page.goto("/");
    await expect(page.getByRole("navigation")).toBeVisible();

    expect(contentTypes.length).toBeGreaterThan(0);
    for (const contentType of contentTypes) {
      expect(contentType).toContain("javascript");
    }
  });

  test("boots the app rather than rendering a blank page", async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on("console", (message) => {
      if (message.type() === "error") {
        consoleErrors.push(message.text());
      }
    });

    await page.goto("/");

    // The shell alone returns 200 for everything, so assert React actually ran.
    await expect(page.getByRole("link", { name: "My feed" })).toBeVisible();
    expect(consoleErrors).toEqual([]);
  });

  test("falls back to the shell for a client-side route", async ({ page }) => {
    await page.goto("/feed");

    await expect(
      page.getByRole("heading", { name: "Build your feed" }),
    ).toBeVisible();
  });
});

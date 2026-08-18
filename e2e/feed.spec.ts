import { expect, mockApi, test } from "./fixtures";

const GUARDIAN_HEADLINE = "AI in 2024: What to Expect";
const NYT_HEADLINE = "A Quiet Play With a Loud Heart";

test.describe("discover feed", () => {
  test("merges every source into one feed", async ({ page }) => {
    await mockApi(page);
    await page.goto("/?q=climate");

    // A keyword is present so all three sources take part: NewsAPI declines a
    // query with neither keyword nor category.
    await expect(
      page.getByRole("heading", { name: GUARDIAN_HEADLINE }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: NYT_HEADLINE }),
    ).toBeVisible();
    await expect(page.getByText("The Guardian").first()).toBeVisible();
    await expect(page.getByText("The New York Times").first()).toBeVisible();
  });

  test("puts the search keyword in the URL", async ({ page }) => {
    await mockApi(page);
    await page.goto("/");

    await page.getByLabel("Search articles").fill("climate");

    await expect(page).toHaveURL(/[?&]q=climate/);
  });

  test("a shared URL reproduces the filtered view", async ({
    page,
    viewport,
  }) => {
    // The inline controls only exist from the md breakpoint up; mobile.spec.ts
    // covers their equivalents inside the sheet.
    test.skip((viewport?.width ?? 0) < 768, "desktop filter bar only");

    await mockApi(page);
    await page.goto("/?q=climate&sources=guardian&categories=science");

    await expect(
      page.getByRole("button", { name: /Sources \(1\)/ }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: /Categories \(1\)/ }),
    ).toBeVisible();
    await expect(page.getByLabel("Search articles")).toHaveValue("climate");
  });

  test("deselecting a source drops it from the feed", async ({ page }) => {
    await mockApi(page);
    await page.goto("/?q=climate&sources=guardian");

    await expect(
      page.getByRole("heading", { name: GUARDIAN_HEADLINE }),
    ).toBeVisible();
    await expect(page.getByRole("heading", { name: NYT_HEADLINE })).toHaveCount(
      0,
    );
  });

  test("resetting clears the filters from the URL", async ({
    page,
    viewport,
  }) => {
    // The inline controls only exist from the md breakpoint up; mobile.spec.ts
    // covers their equivalents inside the sheet.
    test.skip((viewport?.width ?? 0) < 768, "desktop filter bar only");

    await mockApi(page);
    await page.goto("/?q=climate&sources=guardian");

    await page.getByRole("button", { name: "Reset" }).click();

    await expect(page).toHaveURL((url) => url.search === "");
  });

  test("shows an empty state when nothing matches", async ({ page }) => {
    await mockApi(page, { emptyGuardian: true });
    await page.goto("/?q=nothingmatches&sources=guardian");

    await expect(page.getByText(/No articles/i)).toBeVisible();
  });
});

test.describe("degradation", () => {
  test("an author filter excludes NewsAPI with a reason", async ({ page }) => {
    await mockApi(page);
    await page.goto("/?q=climate&author=Marina+Hyde");

    await expect(
      page.getByText("NewsAPI cannot filter by author"),
    ).toBeVisible();
  });

  test("a rate-limited source pauses without killing the feed", async ({
    page,
  }) => {
    const api = await mockApi(page, { rateLimited: ["nyt"] });
    await page.goto("/?q=climate");

    // The other sources keep rendering...
    await expect(
      page.getByRole("heading", { name: GUARDIAN_HEADLINE }),
    ).toBeVisible();
    // ...and the notice names the one that dropped out. Scoped to the notice
    // because the paused footer at the list tail says the same thing.
    await expect(
      page.getByRole("complementary").getByText(/rate-limited/i),
    ).toBeVisible();

    const callsAfterLoad = api.countFor("nyt");
    await page.waitForTimeout(1500);

    // Asserting the request count, not just the UI: an unguarded 429 turns
    // into a request storm that looks perfectly fine on screen.
    expect(api.countFor("nyt")).toBe(callsAfterLoad);
  });

  test("an unavailable source is reported and retryable", async ({ page }) => {
    await mockApi(page, { unavailable: ["nyt"] });
    await page.goto("/?q=climate");

    await expect(
      page.getByRole("heading", { name: GUARDIAN_HEADLINE }),
    ).toBeVisible();
    await expect(page.getByText(/temporarily unavailable/i)).toBeVisible();
  });
});

import { expect, mockApi, test } from "./fixtures";

test.describe("article detail", () => {
  test("opens an article from the feed and returns", async ({ page }) => {
    await mockApi(page);
    await page.goto("/?q=climate");

    await page
      .getByRole("heading", { name: "AI in 2024: What to Expect" })
      .click();

    await expect(page).toHaveURL(/\/post\/guardian\//);
    await expect(
      page.getByRole("heading", {
        level: 1,
        name: "AI in 2024: What to Expect",
      }),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: /Read at The Guardian/ }),
    ).toBeVisible();

    await page.getByRole("link", { name: "Back to the feed" }).click();
    await expect(page).toHaveURL(/\/\?q=climate/);
  });

  test("renders Guardian body text", async ({ page }) => {
    await mockApi(page);
    await page.goto("/?q=climate");

    await page
      .getByRole("heading", { name: "AI in 2024: What to Expect" })
      .click();

    await expect(page.getByText("Full article body.")).toBeVisible();
  });

  test("explains that a NewsAPI deep link cannot be resolved", async ({
    page,
  }) => {
    await mockApi(page);
    // base64url of the fixture article's URL, which is all NewsAPI gives as id.
    const encodedId = Buffer.from(
      "https://www.irishtimes.com/environment/climate-crisis/2026/08/18/example/",
    )
      .toString("base64")
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");

    await page.goto(`/post/newsapi/${encodedId}`);

    await expect(
      page.getByRole("heading", { name: /can’t be opened here/ }),
    ).toBeVisible();
  });

  test("treats an undecodable id as a bad link", async ({ page }) => {
    await mockApi(page);
    await page.goto("/post/guardian/!!!not-base64!!!");

    await expect(
      page.getByRole("heading", { name: "Article not found" }),
    ).toBeVisible();
  });
});

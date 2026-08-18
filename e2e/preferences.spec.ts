import { expect, mockApi, test } from "./fixtures";

test.describe("personal feed", () => {
  test("onboards before anything is chosen", async ({ page }) => {
    await mockApi(page);
    await page.goto("/feed");

    // An unfiltered /feed would render exactly what / renders.
    await expect(
      page.getByRole("heading", { name: "Build your feed" }),
    ).toBeVisible();
  });

  test("preferences survive a reload and stay out of the URL", async ({
    page,
  }) => {
    await mockApi(page);
    await page.goto("/feed");

    await page.getByLabel("Search articles").fill("climate");
    await expect(
      page.getByRole("heading", { name: "AI in 2024: What to Expect" }),
    ).toBeVisible();

    // A personal feed is not a shareable view, so nothing leaks into the URL.
    await expect(page).toHaveURL((url) => url.search === "");

    await page.reload();

    await expect(page.getByLabel("Search articles")).toHaveValue("climate");
    await expect(
      page.getByRole("heading", { name: "Build your feed" }),
    ).toHaveCount(0);
  });

  test("discover filters do not leak into the personal feed", async ({
    page,
  }) => {
    await mockApi(page);
    await page.goto("/?q=climate");
    await expect(page.getByLabel("Search articles")).toHaveValue("climate");

    await page.getByRole("link", { name: "My feed" }).click();

    // The two routes hold separate state; only the adapter differs.
    await expect(
      page.getByRole("heading", { name: "Build your feed" }),
    ).toBeVisible();
  });
});

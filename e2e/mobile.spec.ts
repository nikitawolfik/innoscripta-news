import { expect, mockApi, test } from "./fixtures";

// The sheet only exists below the md breakpoint.
test.use({ viewport: { width: 390, height: 844 } });

test.describe("mobile filters", () => {
  test("opens the sheet, applies a filter and closes", async ({ page }) => {
    await mockApi(page);
    await page.goto("/?q=climate");

    await page.getByRole("button", { name: "Open filters" }).click();
    await expect(page.getByRole("dialog")).toBeVisible();

    await page.getByRole("button", { name: /^Sources/ }).click();
    await page.getByRole("menuitemcheckbox", { name: "The Guardian" }).click();
    await page.keyboard.press("Escape");

    // The selection is a draft until submitted, so the URL is untouched here.
    await expect(page).toHaveURL(/^[^?]*\?q=climate$/);

    await page.getByRole("button", { name: "Apply" }).click();

    await expect(page).toHaveURL(/sources=guardian/);
    await expect(page.getByRole("dialog")).toHaveCount(0);
  });

  test("abandons the draft when the sheet is dismissed", async ({ page }) => {
    await mockApi(page);
    await page.goto("/?q=climate");

    await page.getByRole("button", { name: "Open filters" }).click();
    await page.getByRole("button", { name: /^Sources/ }).click();
    await page.getByRole("menuitemcheckbox", { name: "The Guardian" }).click();
    await page.keyboard.press("Escape");
    await page.keyboard.press("Escape");

    await expect(page.getByRole("dialog")).toHaveCount(0);
    // Never committed, so the feed and the URL are as they were. That the
    // reopened sheet forgets the selection is covered in filter-sheet.test.tsx.
    await expect(page).toHaveURL(/^[^?]*\?q=climate$/);
  });

  test("the trigger counts only what the sheet contains", async ({ page }) => {
    await mockApi(page);
    // A query and a source are both active, but the search box sits outside
    // the sheet — badging it would point at something the sheet cannot clear.
    await page.goto("/?q=climate&sources=guardian");

    await expect(
      page.getByRole("button", { name: "Open filters" }),
    ).toContainText("1");
  });

  test("the trigger shows no count for a search alone", async ({ page }) => {
    await mockApi(page);
    await page.goto("/?q=climate");

    await expect(page.getByRole("button", { name: "Open filters" })).toHaveText(
      "Filters",
    );
  });
});

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

    await expect(page).toHaveURL(/sources=guardian/);

    await page.keyboard.press("Escape");
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).toHaveCount(0);
  });

  test("the sheet trigger carries an active-filter count", async ({ page }) => {
    await mockApi(page);
    await page.goto("/?q=climate&sources=guardian");

    await expect(
      page.getByRole("button", { name: "Open filters" }),
    ).toContainText("2");
  });
});

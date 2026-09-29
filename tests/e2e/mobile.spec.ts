import { expect, test } from "@playwright/test";

for (const path of ["/", "/build", "/explore", "/studio"]) {
  test(`${path} fits a phone screen`, async ({ page }) => {
    await page.goto(path);
    await page.waitForLoadState("networkidle");
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow).toBeLessThanOrEqual(1);
  });
}

test("the editor works on a phone", async ({ page }) => {
  await page.goto("/build");
  await expect(page.getByTestId("poster").locator("svg")).toBeVisible();
  await page.locator('[data-chart="donut"]').click();
  await expect(page.getByTestId("poster").locator("svg")).toContainText("TOTAL");
});

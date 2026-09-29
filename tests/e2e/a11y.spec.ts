import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

for (const [path, scheme] of [
  ["/", "light"],
  ["/build", "light"],
  ["/explore", "light"],
  ["/explore/co2-mauna-loa", "light"],
  ["/studio", "light"],
  ["/guide", "light"],
  ["/", "dark"],
  ["/build", "dark"],
  ["/studio", "dark"],
] as const) {
  test(`no serious accessibility violations on ${path} (${scheme})`, async ({ page }) => {
    await page.emulateMedia({ colorScheme: scheme });
    await page.goto(path);
    await page.waitForLoadState("networkidle");
    const results = await new AxeBuilder({ page })
      // Chart SVG text is decorative detail inside role="img" posters with an aria-label.
      .exclude(".poster svg")
      .exclude(".thumb svg")
      .exclude(".hero-stage svg")
      .exclude(".detail-stage svg")
      .analyze();
    const serious = results.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
    expect(serious.map((v) => `${v.id}: ${v.nodes.slice(0, 3).map((n) => n.target.join(" ")).join(" | ")}`)).toEqual([]);
  });
}

import { readFileSync } from "node:fs";
import { expect, test } from "@playwright/test";
import { openBuilder, pngSize, posterSvg, toast } from "./helpers";

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    if (!sessionStorage.getItem("pp-e2e-init")) {
      localStorage.clear();
      sessionStorage.setItem("pp-e2e-init", "1");
    }
  });
});

test("renders the default chart and switches types", async ({ page }) => {
  await openBuilder(page);
  const svg = await posterSvg(page);
  await expect(svg).toHaveAttribute("width", "1200");
  await expect(svg).toContainText("Coffee is still the office favourite");
  await page.locator('[data-chart="hbar"]').click();
  await expect(page.locator('[data-chart="hbar"]')).toHaveAttribute("aria-pressed", "true");
  await expect(svg).toContainText("Espresso");
  // Undo with the keyboard goes back to the column chart.
  await page.locator("body").click({ position: { x: 5, y: 300 } });
  await page.keyboard.press("Control+z");
  await expect(page.locator('[data-chart="bar"]')).toHaveAttribute("aria-pressed", "true");
});

test("uploads a CSV, maps it and exports a 2× PNG", async ({ page }) => {
  await openBuilder(page);
  await page.getByTestId("file-input").setInputFiles({
    name: "cities.csv",
    mimeType: "text/csv",
    buffer: Buffer.from("city;population\nLima;10.151.200\nArequipa;1.008.290\nTrujillo;919.899\nCusco;428.450\n"),
  });
  await toast(page, /Loaded 4 rows/);
  await expect(page.getByLabel("city 2", { exact: true })).toHaveValue("Arequipa");
  const svg = await posterSvg(page);
  await expect(svg).toContainText("Lima");
  await expect(svg).toContainText("10.2M");

  const download = page.waitForEvent("download");
  await page.getByTestId("export-png").click();
  const file = await download;
  expect(file.suggestedFilename()).toMatch(/@2x\.png$/);
  expect(pngSize((await file.path())!)).toEqual({ width: 2400, height: 1350 });
});

test("exports an SVG with embedded fonts", async ({ page }) => {
  await openBuilder(page);
  await page.getByTestId("export-menu").click();
  const download = page.waitForEvent("download");
  await page.getByTestId("export-svg").click();
  const svg = readFileSync((await (await download).path())!, "utf8");
  expect(svg).toContain("<?xml");
  expect(svg).toMatch(/@font-face\{font-family:'Inter'.*base64,/);
  expect(svg).toContain("Coffee is still the office favourite");
});

test("styles: theme, size and number format", async ({ page }) => {
  await openBuilder(page);
  await page.locator('[data-tab="style"]').click();
  await page.locator('[data-theme="midnight"]').click();
  const svg = await posterSvg(page);
  await expect(svg.locator("rect").first()).toHaveAttribute("fill", "#0E131F");
  await page.locator('[data-size="square"]').click();
  await expect(svg).toHaveAttribute("width", "1080");
  await expect(svg).toHaveAttribute("height", "1080");
  await page.getByLabel("Prefix").fill("$");
  await expect(svg).toContainText("$412");
});

test("chart tab edits text and mapping", async ({ page }) => {
  await openBuilder(page);
  await page.locator('[data-tab="chart"]').click();
  await page.locator("#f-title").fill("Espresso wins again");
  const svg = await posterSvg(page);
  await expect(svg).toContainText("Espresso wins again");
  // Unmapping a required field shows a friendly warning with a fix.
  await page.locator('[data-field="value"] select').selectOption("");
  await expect(page.locator(".alert.warn")).toContainText("Choose a column");
  await page.locator(".alert.warn").getByRole("button", { name: "Use sample data" }).click();
  await expect(page.locator(".alert.warn")).toHaveCount(0);
});

test("the draft survives a reload", async ({ page }) => {
  await openBuilder(page);
  await page.locator('[data-tab="chart"]').click();
  await page.locator("#f-title").fill("Persist me please");
  await page.waitForTimeout(700);
  await page.reload();
  await expect(await posterSvg(page)).toContainText("Persist me please");
});

test("share links reopen the same chart elsewhere", async ({ page, browser, context }) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await openBuilder(page, "?type=donut");
  await expect(page).toHaveURL(/\/build$/); // one-shot parameters are dropped
  await page.locator('[data-tab="chart"]').click();
  await page.locator("#f-title").fill("Shared donut");
  await page.getByTestId("export-menu").click();
  await page.getByTestId("copy-link").click();
  await toast(page, /link copied/);
  const url = await page.evaluate(() => navigator.clipboard.readText());
  expect(url).toMatch(/\/build#d=z/);
  await expect(page).toHaveURL(/\/build$/); // the address bar isn't rewritten
  const other = await browser.newPage();
  await other.goto(url);
  await expect(other.locator(".toast").first()).toContainText("shared chart");
  await expect(other.getByTestId("poster").locator("svg")).toContainText("Shared donut");
  await other.close();
});

test.describe("links never destroy the saved draft", () => {
  const typeTitle = async (page: import("@playwright/test").Page, title: string) => {
    await page.locator('[data-tab="chart"]').click();
    await page.locator("#f-title").fill(title);
    await page.waitForTimeout(700); // autosave
  };

  test("opening ?type= on top of a draft can be undone", async ({ page }) => {
    await openBuilder(page);
    await typeTitle(page, "My precious draft");
    await openBuilder(page, "?type=pie");
    await expect(page).toHaveURL(/\/build$/);
    await toast(page, /Undo/);
    await expect(page.locator('[data-chart="pie"]')).toHaveAttribute("aria-pressed", "true");
    await page.getByRole("button", { name: "Undo", exact: true }).click();
    await expect(await posterSvg(page)).toContainText("My precious draft");
  });

  test("the replaced draft survives reloads and chains of links until restored", async ({ page }) => {
    await openBuilder(page);
    await typeTitle(page, "Real work");
    await openBuilder(page, "?type=pie");
    await page.waitForTimeout(700); // the untouched pie gets autosaved
    await openBuilder(page, "?type=donut"); // a second link must not replace the backup
    await page.reload();
    await expect(page.locator(".builder[data-ready=true]")).toBeVisible();
    const notice = page.getByTestId("prev-draft");
    await expect(notice).toContainText("Real work");
    await notice.getByRole("button", { name: "Restore it" }).click();
    await expect(await posterSvg(page)).toContainText("Real work");
    await expect(notice).toHaveCount(0);
    await page.waitForTimeout(700);
    await page.reload();
    await expect(await posterSvg(page)).toContainText("Real work");
    await expect(page.getByTestId("prev-draft")).toHaveCount(0);
  });

  test("an example opened with no earlier draft survives a reload", async ({ page }) => {
    await openBuilder(page, "?example=seattle-temperature-by-month");
    const title = await (await posterSvg(page)).getAttribute("aria-label");
    await page.waitForTimeout(700);
    await page.reload();
    await expect(page.locator(".builder[data-ready=true]")).toBeVisible();
    await expect(await posterSvg(page)).toHaveAttribute("aria-label", title!);
  });

  test("reloading after opening an example keeps later edits", async ({ page }) => {
    await openBuilder(page, "?example=seattle-temperature-by-month");
    await expect(page).toHaveURL(/\/build$/);
    await typeTitle(page, "Edited example");
    await page.reload();
    await expect(page.locator(".builder[data-ready=true]")).toBeVisible();
    await expect(await posterSvg(page)).toContainText("Edited example");
  });

  test("a share link opens on top of the draft; undo brings the draft back", async ({ page, context }) => {
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    await openBuilder(page, "?type=donut");
    await typeTitle(page, "Shared thing");
    await page.getByTestId("export-menu").click();
    await page.getByTestId("copy-link").click();
    await toast(page, /link copied/);
    const url = await page.evaluate(() => navigator.clipboard.readText());
    await typeTitle(page, "Newer local work");
    await page.goto(url);
    await expect(page.locator(".builder[data-ready=true]")).toBeVisible();
    await expect(await posterSvg(page)).toContainText("Shared thing");
    await expect(page).toHaveURL(/\/build$/);
    await page.getByRole("button", { name: "Undo", exact: true }).click();
    await expect(await posterSvg(page)).toContainText("Newer local work");
  });

  test("a remix handed over through the session opens and installs its custom type", async ({ page }) => {
    await openBuilder(page);
    await typeTitle(page, "Keep me");
    await page.evaluate(async () => {
      const spec = {
        version: 1,
        name: "Remixed dots",
        fields: [
          { key: "label", label: "Label", type: "string" },
          { key: "value", label: "Value", type: "number" },
        ],
        layers: [{ mark: "point", encoding: { x: { field: "value", type: "linear" }, y: { field: "label", type: "band" } } }],
        sample: { rows: [{ label: "A", value: 1 }, { label: "B", value: 3 }] },
      };
      const doc = {
        version: 1, chartType: "custom:someone-elses", title: "Community remix", subtitle: "", source: "", note: "",
        columns: [{ name: "label", type: "string" }, { name: "value", type: "number" }],
        data: [{ label: "A", value: 1 }, { label: "B", value: 3 }],
        mapping: { label: "label", value: "value" }, options: {}, style: { width: 1200, height: 675 },
      };
      sessionStorage.setItem("pp-incoming-v1", JSON.stringify({ doc, spec }));
    });
    await openBuilder(page, "?incoming=1");
    await expect(await posterSvg(page)).toContainText("Community remix");
    await expect(page.locator('[data-chart^="custom:"]').first()).toBeVisible();
    await expect(page.locator(".alert.warn")).toHaveCount(0);
    await page.getByRole("button", { name: "Undo", exact: true }).click();
    await expect(await posterSvg(page)).toContainText("Keep me");
  });
});

test.describe("editing inputs", () => {
  test("Escape discards a cell edit", async ({ page }) => {
    await openBuilder(page);
    const cell = page.getByLabel("orders 1", { exact: true });
    const before = await cell.inputValue();
    await cell.click();
    await cell.fill("999999");
    await cell.press("Escape");
    await expect(cell).toHaveValue(before);
    await expect(await posterSvg(page)).not.toContainText("999,999");
  });

  test("Escape discards a column rename", async ({ page }) => {
    await openBuilder(page);
    const header = page.getByLabel(/: orders$/);
    await header.click();
    await header.fill("renamed");
    await header.press("Escape");
    await expect(page.getByLabel(/: orders$/)).toHaveValue("orders");
  });

  test("width can be typed digit by digit and is clamped on blur", async ({ page }) => {
    await openBuilder(page);
    await page.locator('[data-tab="style"]').click();
    const w = page.locator("#w");
    await w.click();
    await w.press("ControlOrMeta+a");
    await w.pressSequentially("1000");
    await expect(await posterSvg(page)).toHaveAttribute("width", "1000");
    await w.press("ControlOrMeta+a");
    await w.pressSequentially("5");
    await w.blur();
    await expect(w).toHaveValue("320");
    await expect(await posterSvg(page)).toHaveAttribute("width", "320");
  });

  test("Ctrl+S while typing exports the latest text", async ({ page }) => {
    await openBuilder(page);
    const cell = page.getByLabel("drink 1", { exact: true });
    await cell.click();
    await cell.fill("Matcha");
    const download = page.waitForEvent("download");
    await page.keyboard.press("Control+s");
    await download;
    await expect(cell).toHaveValue("Matcha");
    await expect(await posterSvg(page)).toContainText("Matcha");
  });
});

test("paste from a spreadsheet", async ({ page }) => {
  await openBuilder(page);
  await page.getByRole("button", { name: "Paste data" }).click();
  await page.getByTestId("paste-area").fill("Team\tScore\nRed\t12\nBlue\t19\nGreen\t7");
  await page.getByRole("button", { name: "Use pasted data" }).click();
  await expect(await posterSvg(page)).toContainText("Blue");
});

test("messy European CSV is understood", async ({ page }) => {
  await openBuilder(page);
  await page.getByTestId("file-input").setInputFiles("tests/fixtures/messy.csv");
  await expect(page.getByLabel("Tienda 1", { exact: true })).toHaveValue("Lima, Miraflores");
  await expect(page.getByLabel("Ventas 1", { exact: true })).toHaveValue("1234.5");
  await expect(page.locator(".toast").filter({ hasText: /different number of cells/ })).toBeVisible();
  await expect(await posterSvg(page)).toBeVisible();
});

test.describe("unhappy paths", () => {
  test("binary files are rejected with a message", async ({ page }) => {
    await openBuilder(page);
    await page.getByTestId("file-input").setInputFiles({ name: "photo.csv", mimeType: "text/csv", buffer: Buffer.from([0x89, 0x50, 0x4e, 0x47, 0, 0, 0, 0, 1, 2, 3]) });
    await toast(page, /doesn't look like a text file/);
  });

  test("empty files are rejected", async ({ page }) => {
    await openBuilder(page);
    await page.getByTestId("file-input").setInputFiles({ name: "empty.csv", mimeType: "text/csv", buffer: Buffer.from("\n\n") });
    await toast(page, /couldn't read any rows/);
  });

  test("a broken share link falls back gracefully", async ({ page }) => {
    await page.goto("/build#d=zNOTAREALCHART");
    await toast(page, /broken or incomplete/);
    await expect(page.getByTestId("poster").locator("svg")).toBeVisible();
  });

  test("importing a non-Plotpaper JSON file explains the problem", async ({ page }) => {
    await openBuilder(page);
    await page.getByTestId("export-menu").click();
    const chooser = page.waitForEvent("filechooser");
    await page.getByRole("menuitem").filter({ hasText: "Open Plotpaper file" }).or(page.locator(".menu-item", { hasText: "Open Plotpaper file" })).first().click();
    await (await chooser).setFiles({ name: "x.json", mimeType: "application/json", buffer: Buffer.from('{"hello": "world"}') });
    await toast(page, /isn't a Plotpaper chart/);
  });

  test("corrupted local draft doesn't break the editor", async ({ page }) => {
    await page.goto("/build");
    await page.evaluate(() => localStorage.setItem("pp-doc-v2", '{"data": "oops", "style": 7}'));
    await page.reload();
    await expect(page.getByTestId("poster").locator("svg")).toBeVisible();
  });

  test("unknown example ids fall back to the default chart", async ({ page }) => {
    await openBuilder(page, "?example=does-not-exist");
    await expect(await posterSvg(page)).toBeVisible();
  });
});

test("AI suggestion (mock provider) applies a chart", async ({ page }) => {
  await openBuilder(page);
  await page.locator('[data-tab="chart"]').click();
  await page.locator(".ai-box textarea").fill("top drinks ranking");
  await page.getByRole("button", { name: "Suggest a chart" }).click();
  await toast(page, /Applied: Ranked bars/);
  await expect(page.locator('[data-chart="hbar"]')).toHaveAttribute("aria-pressed", "true");
});

test.describe("large datasets", () => {
  test("20,000 flights render as a scatter plot", async ({ page }) => {
    await openBuilder(page);
    const t0 = Date.now();
    await page.getByTestId("file-input").setInputFiles("tests/fixtures/large-scatter.csv");
    await toast(page, /Loaded 20,000 rows/);
    await page.locator('[data-chart="scatter"]').click();
    const svg = await posterSvg(page);
    await expect(svg.locator("circle").nth(19_000)).toBeAttached();
    expect(Date.now() - t0).toBeLessThan(20_000);
    await expect(page.getByText(/Showing the first 200 of 20,000 rows/)).toBeVisible();
    // Typing stays responsive while the big chart re-renders.
    await page.locator('[data-tab="chart"]').click();
    const t1 = Date.now();
    await page.locator("#f-title").pressSequentially("Flight delays vs distance", { delay: 5 });
    expect(Date.now() - t1).toBeLessThan(10_000);
    await expect(svg).toContainText("Flight delays vs distance");
    // A PNG still exports.
    const download = page.waitForEvent("download");
    await page.getByTestId("export-png").click();
    expect((await download).suggestedFilename()).toMatch(/\.png$/);
  });

  test("3,653 daily points render as a multi-line chart", async ({ page }) => {
    await openBuilder(page, "?type=line");
    await page.getByTestId("file-input").setInputFiles("tests/fixtures/long-timeseries.csv");
    await toast(page, /Loaded 3,653 rows/);
    const svg = await posterSvg(page);
    await expect(svg).toContainText("2020");
    await expect(svg).toContainText("usd per eur");
  });

  test("long-format data splits into lines", async ({ page }) => {
    await openBuilder(page, "?type=multiline");
    await page.getByTestId("file-input").setInputFiles("tests/fixtures/long-format.csv");
    await page.locator('[data-tab="chart"]').click();
    await page.locator('[data-field="group"] select').selectOption("symbol");
    const multi = page.locator('[data-field="series"] label');
    // Keep only "price" as the value column.
    const labels = await multi.allTextContents();
    for (const l of labels) if (l !== "price") await multi.filter({ hasText: l }).click();
    const svg = await posterSvg(page);
    for (const sym of ["MSFT", "AMZN", "AAPL"]) await expect(svg).toContainText(sym);
  });
});

test.describe("other exports", () => {
  test("PDF opens a print-ready page with the chart", async ({ page }) => {
    await openBuilder(page);
    await page.getByTestId("export-menu").click();
    const popup = page.waitForEvent("popup");
    await page.locator(".menu-item", { hasText: "PDF (print)" }).click();
    const win = await popup;
    await expect(win.locator("svg").first()).toBeVisible();
    await expect(win).toHaveTitle("Coffee is still the office favourite");
  });

  test("copies the chart image to the clipboard", async ({ page, context }) => {
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    await openBuilder(page);
    await page.getByTestId("export-menu").click();
    await page.locator(".menu-item", { hasText: "Copy image" }).click();
    await toast(page, /Image copied/);
    const types = await page.evaluate(async () => (await navigator.clipboard.read()).flatMap((i) => i.types));
    expect(types).toContain("image/png");
  });

  test("Plotpaper files round-trip", async ({ page }) => {
    await openBuilder(page, "?type=waterfall");
    await page.getByTestId("export-menu").click();
    const download = page.waitForEvent("download");
    await page.locator(".menu-item", { hasText: "Plotpaper file (.json)" }).click();
    const path = (await (await download).path())!;
    await page.goto("/build?type=bar");
    await page.getByTestId("export-menu").click();
    const chooser = page.waitForEvent("filechooser");
    await page.locator(".menu-item", { hasText: "Open Plotpaper file" }).click();
    await (await chooser).setFiles(path);
    await expect(page.locator('[data-chart="waterfall"]')).toHaveAttribute("aria-pressed", "true");
    await expect(await posterSvg(page)).toContainText("From revenue to net profit");
  });
});

test("Ctrl+S downloads the PNG", async ({ page }) => {
  await openBuilder(page);
  const download = page.waitForEvent("download");
  await page.keyboard.press("Control+s");
  expect((await download).suggestedFilename()).toMatch(/\.png$/);
});

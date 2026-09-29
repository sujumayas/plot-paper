import { expect, test } from "@playwright/test";

test("landing page leads to the editor", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Turn a spreadsheet into");
  await expect(page.locator(".hero-stage svg").first()).toBeVisible();
  await page.getByTestId("cta-create").click();
  await expect(page).toHaveURL(/\/build/);
  expect(errors).toEqual([]);
});

test("language switch translates the UI and is remembered", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("group", { name: "Language" }).getByRole("button", { name: "ES" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Convierte una hoja de cálculo");
  await page.goto("/explore");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Galería");
  await page.getByRole("group", { name: "Idioma" }).getByRole("button", { name: "EN" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Gallery");
});

test("gallery filters, search and remix", async ({ page }) => {
  await page.goto("/explore");
  const cards = page.locator(".gcard");
  expect(await cards.count()).toBeGreaterThanOrEqual(40);
  await page.getByRole("button", { name: "Parts of a whole" }).click();
  const filtered = await cards.count();
  expect(filtered).toBeGreaterThan(3);
  expect(filtered).toBeLessThan(40);
  await page.getByRole("button", { name: "All" }).click();
  await page.getByLabel("Search charts…").fill("Mauna Loa");
  await expect(cards.first()).toContainText("CO₂");
  await page.getByLabel("Search charts…").fill("zzzz-no-match");
  await expect(page.getByText("No charts match")).toBeVisible();
  await page.goto("/explore/co2-mauna-loa");
  await expect(page.getByRole("heading", { level: 2 })).toContainText("Atmospheric CO₂");
  await page.getByRole("button", { name: /Remix this chart/ }).click();
  await expect(page).toHaveURL(/example=co2-mauna-loa/);
  await expect(page.getByTestId("poster").locator("svg")).toContainText("Mauna Loa");
});

test("gallery detail offers PNG download", async ({ page }) => {
  await page.goto("/explore/saas-arr-bridge");
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "PNG" }).click();
  expect((await download).suggestedFilename()).toMatch(/\.png$/);
});

test("studio: validate, generate with (mock) AI, save and use", async ({ page }) => {
  await page.goto("/studio");
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await expect(page.getByTestId("spec-issues")).toContainText("Valid spec");
  // Break the JSON → errors are shown, preview keeps the last good version.
  await page.getByTestId("spec-editor").fill('{"name": "x", "layers": [');
  await expect(page.getByTestId("spec-issues")).toContainText("JSON syntax error");
  await expect(page.getByTestId("studio-preview").locator("svg")).toBeVisible();
  // AI (mock) drafts a new type.
  await page.getByTestId("ai-prompt").fill("Diverging bars for gains and losses");
  await page.getByTestId("ai-generate").click();
  await expect(page.getByTestId("spec-issues")).toContainText("Valid spec");
  await expect(page.getByTestId("studio-preview").locator("svg")).toContainText("Which prices moved most");
  await page.getByTestId("save-type").click();
  await expect(page.locator(".mytype")).toHaveCount(1);
  await page.getByRole("button", { name: "Use in editor" }).click();
  await expect(page).toHaveURL(/type=custom/);
  await expect(page.locator(".picker")).toContainText("Your types");
  await expect(page.getByTestId("poster").locator("svg")).toContainText("Which prices moved most");
});

test("guide pages render the docs", async ({ page }) => {
  await page.goto("/guide");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("User guide");
  await page.goto("/guide/plotspec");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("PlotSpec reference");
});

test("unknown pages show a friendly 404", async ({ page }) => {
  const res = await page.goto("/this-does-not-exist");
  expect(res?.status()).toBe(404);
  await expect(page.getByText("This page doesn't exist.")).toBeVisible();
});

test("AI status endpoint and input validation", async ({ request }) => {
  const status = await (await request.get("/api/ai/status")).json();
  expect(status).toMatchObject({ enabled: true, provider: "mock" });
  const bad = await request.post("/api/ai/chart-type", { data: { prompt: "" } });
  expect(bad.status()).toBe(400);
  const garbage = await request.post("/api/ai/suggest", { data: "not json", headers: { "content-type": "application/json" } });
  expect(garbage.status()).toBe(400);
});

test("security headers are set", async ({ request }) => {
  const res = await request.get("/");
  expect(res.headers()["content-security-policy"]).toContain("frame-ancestors 'none'");
  expect(res.headers()["x-content-type-options"]).toBe("nosniff");
  expect(res.headers()["x-powered-by"]).toBeUndefined();
});

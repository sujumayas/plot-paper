// Dev helper: node scripts/shot.mjs <url> <out.png> [width] [height] [fullPage]
import { chromium } from "@playwright/test";
const [url, out, w = "1440", h = "900", full = ""] = process.argv.slice(2);
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: +w, height: +h } });
const errors = [];
page.on("pageerror", (e) => errors.push("pageerror: " + e.message));
page.on("console", (m) => m.type() === "error" && errors.push("console: " + m.text()));
const res = await page.goto(url, { waitUntil: "networkidle", timeout: 120000 });
await page.waitForTimeout(800);
await page.screenshot({ path: out, fullPage: !!full });
console.log("status", res?.status(), errors.length ? errors.join("\n") : "no errors");
await browser.close();

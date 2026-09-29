// Dev helper: node scripts/contact-sheet.mjs <dir> <outPrefix> [perSheet]
import { chromium } from "@playwright/test";
import { readdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
const [dir, outPrefix, perArg] = process.argv.slice(2);
const per = Number(perArg || 6);
const files = readdirSync(dir).filter((f) => f.endsWith(".png")).sort();
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1400, height: 800 } });
for (let s = 0; s * per < files.length; s++) {
  const chunk = files.slice(s * per, (s + 1) * per);
  const imgs = chunk
    .map((f) => `<figure style="margin:0"><img style="width:100%;border:1px solid #ccc" src="data:image/png;base64,${readFileSync(join(dir, f)).toString("base64")}"/><figcaption style="font:12px sans-serif">${f}</figcaption></figure>`)
    .join("");
  await page.setContent(`<body style="margin:8px;display:grid;grid-template-columns:1fr 1fr;gap:8px">${imgs}</body>`);
  await page.screenshot({ path: resolve(`${outPrefix}${s}.png`), fullPage: true });
}
await browser.close();
console.log(Math.ceil(files.length / per), "sheets");

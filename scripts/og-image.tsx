/* Generates public/og.png (1200×630) from real example charts:  npx tsx --tsconfig tsconfig.scripts.json scripts/og-image.tsx */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { chromium } from "@playwright/test";
import { getExample } from "../src/lib/examples/server";
import { resolveDefinition } from "../src/lib/resolveDef";
import { embeddedFontCSS, posterSVG } from "../src/lib/viz/export/svg";

const load = async (url: string) => readFileSync(join(process.cwd(), "public", url)).toString("base64");
const svgFor = async (id: string) => {
  const ex = getExample(id)!;
  return (await posterSVG(ex.doc, resolveDefinition(ex.doc.chartType), { fontCSS: await embeddedFontCSS(ex.doc, load) })).replace(/^<\?xml[^>]*>/, "");
};
const font = (f: string) => `url(data:font/woff2;base64,${readFileSync(join("public/fonts", f)).toString("base64")})`;

(async () => {
  const [a, b, c] = await Promise.all(["co2-mauna-loa", "electricity-mix-by-country", "saas-monthly-kpis"].map(svgFor));
  const html = `<html><head><style>
    @font-face{font-family:SG;font-weight:700;src:${font("space-grotesk-latin-700-normal.woff2")}}
    @font-face{font-family:IN;font-weight:400;src:${font("inter-latin-400-normal.woff2")}}
    body{margin:0;width:1200px;height:630px;background:#f6f6f3;font-family:IN;overflow:hidden;position:relative}
    .t{position:absolute;left:64px;top:70px;width:520px}
    .brand{display:flex;align-items:center;gap:12px;font:700 30px SG;color:#111418;letter-spacing:-1px}
    h1{font:700 58px/1.02 SG;letter-spacing:-2.4px;color:#111418;margin:34px 0 18px}
    h1 em{font-style:normal;background:linear-gradient(100deg,#2f6bff,#ff6b3d);-webkit-background-clip:text;color:transparent}
    p{font-size:21px;line-height:1.45;color:#5b616b;margin:0}
    .card{position:absolute;border-radius:14px;overflow:hidden;box-shadow:0 24px 60px rgb(17 20 24/.18);border:1px solid #e4e4de;background:#fff;line-height:0}
    .card svg{width:100%;height:auto}
  </style></head><body>
    <div class="t">
      <div class="brand"><svg width="40" height="40" viewBox="0 0 28 28"><rect width="28" height="28" rx="8" fill="#111418"/><rect x="6.5" y="14" width="4" height="7.5" rx="1.2" fill="#FF6B3D"/><rect x="12" y="9.5" width="4" height="12" rx="1.2" fill="#2F6BFF"/><rect x="17.5" y="6" width="4" height="15.5" rx="1.2" fill="#12B886"/></svg>Plotpaper</div>
      <h1>Spreadsheet in, <em>beautiful chart</em> out.</h1>
      <p>26 chart types · 8 themes · PNG, SVG &amp; PDF sized for slides and socials · AI chart designer</p>
    </div>
    <div class="card" style="left:640px;top:60px;width:520px">${a}</div>
    <div class="card" style="left:600px;top:330px;width:330px">${b}</div>
    <div class="card" style="left:950px;top:360px;width:250px">${c}</div>
  </body></html>`;
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1200, height: 630 } });
  await page.setContent(html);
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: "public/og.png" });
  await browser.close();
  console.log("Wrote public/og.png");
})();

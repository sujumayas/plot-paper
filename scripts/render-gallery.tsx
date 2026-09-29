/*
  Renders every built-in chart (and optional example docs) to SVG + PNG.
  Used for visual QA and as a CI smoke test:

    npm run render:gallery               # → .render/<id>.svg|png
    npm run render:gallery -- --out dir  --only bar,line --theme midnight
*/
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { chromium } from "@playwright/test";
import { BUILTIN_CHARTS } from "../src/lib/viz/charts";
import { docFromSample } from "../src/lib/viz/engine";
import { embeddedFontCSS, posterSVG } from "../src/lib/viz/export/svg";
import type { ChartDoc, ChartDefinition } from "../src/lib/viz/types";
import { EXAMPLES } from "../src/lib/examples/server";
import { getBuiltinChart } from "../src/lib/viz/charts";
import { SPEC_TEMPLATES } from "../src/lib/viz/spec/templates";
import { validateSpec } from "../src/lib/viz/spec/validate";
import { specToDefinition } from "../src/lib/viz/spec/render";

const args = process.argv.slice(2);
const arg = (name: string) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : undefined;
};
const out = arg("out") ?? ".render";
const only = arg("only")?.split(",");
const theme = arg("theme");
const size = arg("size");
const includeExamples = args.includes("--examples");
const includeSpecs = args.includes("--specs");
mkdirSync(out, { recursive: true });

const nodeLoader = async (url: string) => readFileSync(join(process.cwd(), "public", url)).toString("base64");

async function main() {
  const jobs: { name: string; doc: ChartDoc; def: ChartDefinition }[] = [];
  for (const def of args.includes("--no-builtin") ? [] : BUILTIN_CHARTS) {
    if (only && !only.includes(def.id)) continue;
    const doc = docFromSample(def, theme ? { theme } : {});
    if (size) {
      const [w, h] = size.split("x").map(Number);
      doc.style.width = w;
      doc.style.height = h;
    }
    jobs.push({ name: def.id, doc, def });
  }
  if (includeExamples) {
    for (const ex of EXAMPLES) {
      if (only && !only.includes(ex.id)) continue;
      const def = getBuiltinChart(ex.doc.chartType);
      if (def) jobs.push({ name: `ex-${ex.id}`, doc: ex.doc, def });
    }
  }
  if (includeSpecs) {
    for (const t of SPEC_TEMPLATES) {
      const v = validateSpec(t.spec);
      if (!v.spec) {
        console.error(`✗ spec ${t.id}:`, v.errors);
        continue;
      }
      if (v.warnings.length) console.warn(`! spec ${t.id}:`, v.warnings);
      const def = specToDefinition(v.spec, `custom:${t.id}`);
      jobs.push({ name: `spec-${t.id}`, doc: docFromSample(def, theme ? { theme } : {}), def });
    }
  }
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
  const page = await browser.newPage();
  let failures = 0;
  const t0 = Date.now();
  for (const job of jobs) {
    try {
      const css = await embeddedFontCSS(job.doc, nodeLoader);
      const svg = posterSVG(job.doc, job.def, { fontCSS: css });
      writeFileSync(join(out, `${job.name}.svg`), svg);
      const { width, height } = job.doc.style;
      await page.setViewportSize({ width, height });
      await page.setContent(`<html><body style="margin:0">${svg.replace(/^<\?xml[^>]*>/, "")}</body></html>`);
      await page.evaluate(() => document.fonts.ready);
      await page.screenshot({ path: join(out, `${job.name}.png`), clip: { x: 0, y: 0, width, height } });
      process.stdout.write(".");
    } catch (err) {
      failures++;
      console.error(`\n✗ ${job.name}:`, err);
    }
  }
  await browser.close();
  console.log(`\nRendered ${jobs.length - failures}/${jobs.length} charts to ${out}/ in ${Date.now() - t0}ms`);
  if (failures) process.exit(1);
}

main();

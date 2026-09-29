import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { BUILTIN_CHARTS } from "@/lib/viz/charts";
import { inferColumns } from "@/lib/viz/data";
import { docFromSample, renderPoster, sanitizeDoc, switchChartType } from "@/lib/viz/engine";
import { FONT_PAIRINGS, PALETTES, SIZE_PRESETS, THEMES } from "@/lib/viz/themes";
import type { ChartDefinition, ChartDoc, DataRow } from "@/lib/viz/types";

/** Renders to markup and checks nothing non-finite leaked into attributes. */
function render(doc: ChartDoc, def: ChartDefinition) {
  const { element, issues } = renderPoster(doc, def, { uid: "t" });
  const svg = renderToStaticMarkup(element);
  expect(svg.startsWith("<svg")).toBe(true);
  const bad = svg.match(/="[^"]*(NaN|Infinity)[^"]*"/);
  expect(bad, `non-finite attribute in ${def.id}: ${bad?.[0]}`).toBeNull();
  expect(svg).not.toMatch(/>NaN<|>undefined<|>null</);
  return { svg, issues };
}

/** Replaces the sample rows with `rows`, keeping the sample's columns mapped. */
function withRows(def: ChartDefinition, make: (sample: DataRow[], cols: string[]) => DataRow[]): ChartDoc {
  const base = docFromSample(def);
  const cols = base.columns.map((c) => c.name);
  const data = make(base.data, cols);
  return { ...base, data, columns: data.length ? inferColumns(data, cols).map((c) => ({ ...c, type: base.columns.find((b) => b.name === c.name)?.type ?? c.type })) : base.columns };
}

const numericCols = (doc: ChartDoc) => doc.columns.filter((c) => c.type === "number").map((c) => c.name);

describe.each(BUILTIN_CHARTS.map((d) => [d.id, d] as const))("chart %s", (_id, def) => {
  it("renders its sample without issues", () => {
    const { issues, svg } = render(docFromSample(def), def);
    expect(issues).toEqual([]);
    expect(svg.length).toBeGreaterThan(500);
  });

  it("has complete metadata", () => {
    expect(def.name).toBeTruthy();
    expect(def.fields.length).toBeGreaterThan(0);
    expect(def.sample.rows.length).toBeGreaterThan(0);
    for (const o of def.options ?? []) {
      if (o.type === "select") expect(o.choices.map((c) => c.value)).toContain(o.default);
      if (o.type === "number") expect(o.default).toBeGreaterThanOrEqual(o.min);
    }
  });

  it("shows an empty state for no data", () => {
    const { issues } = render(withRows(def, () => []), def);
    expect(issues.length).toBeGreaterThan(0);
  });

  it("survives a single row", () => {
    render(withRows(def, (s) => s.slice(0, 1)), def);
  });

  it("survives all-zero values", () => {
    render(withRows(def, (s, _c) => s.map((r) => Object.fromEntries(Object.entries(r).map(([k, v]) => [k, typeof v === "number" ? 0 : v])))), def);
  });

  it("survives negative values", () => {
    render(withRows(def, (s) => s.map((r) => Object.fromEntries(Object.entries(r).map(([k, v]) => [k, typeof v === "number" ? -Math.abs(v) - 1 : v])))), def);
  });

  it("survives huge and tiny magnitudes", () => {
    render(withRows(def, (s) => s.map((r, i) => Object.fromEntries(Object.entries(r).map(([k, v]) => [k, typeof v === "number" ? (i % 2 ? 1e15 : 1e-9) : v])))), def);
  });

  it("survives missing and garbage cells", () => {
    render(
      withRows(def, (s) =>
        s.map((r, i) => Object.fromEntries(Object.entries(r).map(([k, v]) => [k, i % 3 === 0 ? null : i % 3 === 1 && typeof v === "number" ? "n/a" : v]))),
      ),
      def,
    );
  });

  it("survives very long unicode labels", () => {
    render(
      withRows(def, (s) =>
        s.map((r, i) => Object.fromEntries(Object.entries(r).map(([k, v]) => [k, typeof v === "string" && !/^\d{4}-/.test(v) ? `Ñandú ${"🚀".repeat(i % 3)} ${"extraordinariamente largo ".repeat(4)} ${i} <b>&amp;"'`: v]))),
      ),
      def,
    );
  });

  it("renders 5,000 rows quickly", () => {
    const doc = withRows(def, (s) => Array.from({ length: 5000 }, (_, i) => ({ ...s[i % s.length], ...Object.fromEntries(Object.entries(s[i % s.length]).map(([k, v]) => [k, typeof v === "number" ? v + (i % 97) : v])) })));
    const t0 = performance.now();
    render(doc, def);
    expect(performance.now() - t0).toBeLessThan(4000);
  });

  it("renders at every size preset and theme", () => {
    const base = docFromSample(def);
    for (const size of SIZE_PRESETS) render({ ...base, style: { ...base.style, width: size.width, height: size.height } }, def);
    for (const theme of THEMES) render({ ...base, style: { ...base.style, theme: theme.id } }, def);
    render({ ...base, style: { ...base.style, width: 320, height: 320, fontScale: 1.6 } }, def);
    render({ ...base, style: { ...base.style, width: 4000, height: 320 } }, def);
  });

  it("renders with every option combination default flipped", () => {
    const base = docFromSample(def);
    for (const o of def.options ?? []) {
      const values = o.type === "select" ? o.choices.map((c) => c.value) : o.type === "boolean" ? [true, false] : o.type === "number" ? [o.min, o.max] : ["", "Custom"];
      for (const v of values) render({ ...base, options: { ...base.options, [o.key]: v } }, def);
    }
  });

  it("reports a mapping issue when a field is unmapped", () => {
    const base = docFromSample(def);
    const required = def.fields.find((f) => f.required !== false);
    const { issues } = render({ ...base, mapping: { ...base.mapping, [required!.key]: undefined } }, def);
    expect(issues[0]?.kind).toBe("mapping");
  });

  it("keeps working when switched from every other chart's sample", () => {
    for (const other of BUILTIN_CHARTS) {
      const doc = switchChartType(docFromSample(other), def);
      render(doc, def);
    }
  });

  it("numbers in the output use the user's format", () => {
    const base = docFromSample(def);
    const cols = numericCols(base);
    if (!cols.length) return;
    const { svg } = render({ ...base, style: { ...base.style, number: { ...base.style.number, prefix: "¤", compact: false } } }, def);
    if (def.id !== "calendar" && def.id !== "histogram" && def.id !== "waffle" && def.id !== "progress") expect(svg).toContain("¤");
  });
});

describe("poster layout", () => {
  const def = BUILTIN_CHARTS[0];

  it("escapes user text", () => {
    const doc = { ...docFromSample(def), title: `<script>alert("x")</script>`, subtitle: "a & b", source: "</svg>" };
    const svg = renderToStaticMarkup(renderPoster(doc, def).element);
    expect(svg).not.toContain("<script>");
    expect(svg).toContain("&lt;script&gt;");
    expect(svg).not.toContain("</svg></svg>");
  });

  it("omits the footer when there is no source and no branding", () => {
    const doc = docFromSample(def);
    const svg = renderToStaticMarkup(renderPoster({ ...doc, source: "", style: { ...doc.style, branding: false } }, def).element);
    expect(svg).not.toContain("Made with");
  });

  it("supports every palette and font pairing", () => {
    const doc = docFromSample(def);
    for (const p of PALETTES) render({ ...doc, style: { ...doc.style, palette: p.id } }, def);
    for (const f of FONT_PAIRINGS) render({ ...doc, style: { ...doc.style, fonts: f.id } }, def);
    render({ ...doc, style: { ...doc.style, accent: "#123456", background: "transparent" } }, def);
    render({ ...doc, style: { ...doc.style, accent: "not-a-color", background: "javascript:alert(1)" } }, def);
  });

  it("sanitizeDoc repairs hostile documents", () => {
    const d = sanitizeDoc({ chartType: 5, data: "nope", style: { width: 99999, height: -4, fontScale: "big" } } as unknown as ChartDoc);
    expect(d.data).toEqual([]);
    expect(d.style.width).toBe(4000);
    expect(d.style.height).toBe(320);
    expect(d.style.fontScale).toBe(1);
    expect(d.chartType).toBe("5");
  });
});

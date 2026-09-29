import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { docFromSample, renderPoster } from "@/lib/viz/engine";
import { specToDefinition } from "@/lib/viz/spec/render";
import { SPEC_TEMPLATES } from "@/lib/viz/spec/templates";
import type { PlotSpec } from "@/lib/viz/spec/types";
import { isColorRef, parseSpecText, validateSpec } from "@/lib/viz/spec/validate";

const base = (): PlotSpec => JSON.parse(JSON.stringify(SPEC_TEMPLATES[0].spec));

function renderSpec(spec: PlotSpec, patch: Partial<ReturnType<typeof docFromSample>> = {}) {
  const def = specToDefinition(spec, "custom:test");
  const doc = { ...docFromSample(def), ...patch };
  const { element, issues } = renderPoster(doc, def, { uid: "s" });
  const svg = renderToStaticMarkup(element);
  expect(svg).not.toMatch(/="[^"]*(NaN|Infinity)[^"]*"/);
  return { svg, issues };
}

describe("templates", () => {
  it.each(SPEC_TEMPLATES.map((t) => [t.id, t.spec] as const))("%s validates without errors and renders", (_id, spec) => {
    const v = validateSpec(spec);
    expect(v.errors).toEqual([]);
    expect(v.spec).not.toBeNull();
    const { issues, svg } = renderSpec(v.spec!);
    expect(issues).toEqual([]);
    expect(svg.length).toBeGreaterThan(800);
  });

  it.each(SPEC_TEMPLATES.map((t) => [t.id, t.spec] as const))("%s survives empty and weird data", (_id, spec) => {
    const v = validateSpec(spec).spec!;
    renderSpec(v, { data: [] });
    renderSpec(v, { data: v.sample.rows.map((r) => Object.fromEntries(Object.keys(r).map((k) => [k, null]))) });
    renderSpec(v, { data: v.sample.rows.slice(0, 1) });
    renderSpec(v, { data: Array.from({ length: 3000 }, (_, i) => ({ ...v.sample.rows[i % v.sample.rows.length] })) });
  });
});

describe("validation", () => {
  it("rejects non-objects and bad JSON with readable messages", () => {
    expect(validateSpec(null).errors[0]).toMatch(/JSON object/);
    expect(validateSpec([]).errors[0]).toMatch(/JSON object/);
    expect(parseSpecText("{ nope").errors[0]).toMatch(/JSON syntax error/);
  });

  it("reports missing pieces with paths", () => {
    const v = validateSpec({ name: "", fields: [], layers: [], sample: {} });
    expect(v.errors).toEqual(
      expect.arrayContaining([expect.stringMatching(/name/), expect.stringMatching(/fields/), expect.stringMatching(/layers/), expect.stringMatching(/sample.rows/)]),
    );
  });

  it("checks field references, marks and channels", () => {
    const s = base() as unknown as Record<string, unknown>;
    (s.layers as unknown[]).push({ mark: "spline", encoding: {} });
    (s.layers as unknown[]).push({ mark: "bar", encoding: { x: { field: "ghost" }, y: { field: "label" } } });
    (s.layers as unknown[]).push({ mark: "text", encoding: { x: { field: "value" }, y: { field: "label" } } });
    (s.layers as unknown[]).push({ mark: "line", encoding: { x: { field: "$value" }, y: { field: "value" } } });
    const v = validateSpec(s);
    expect(v.errors.join("\n")).toMatch(/"spline" is not one of/);
    expect(v.errors.join("\n")).toMatch(/"ghost" is not one of the declared fields/);
    expect(v.errors.join("\n")).toMatch(/needs a text channel/);
    expect(v.errors.join("\n")).toMatch(/needs the layer to "fold"/);
  });

  it("rejects duplicate and invalid field keys", () => {
    const s = base();
    s.fields.push({ key: "label", label: "dup", type: "string" });
    s.fields.push({ key: "bad key!", label: "x", type: "string" });
    const v = validateSpec(s);
    expect(v.errors.join("\n")).toMatch(/duplicated/);
    expect(v.errors.join("\n")).toMatch(/letters, digits/);
  });

  it("enforces limits", () => {
    const s = base();
    s.layers = Array.from({ length: 13 }, () => s.layers[0]);
    expect(validateSpec(s).errors.join()).toMatch(/At most 12 layers/);
    const t = base();
    t.sample.rows = Array.from({ length: 900 }, () => t.sample.rows[0]);
    const v = validateSpec(t);
    expect(v.spec?.sample.rows).toHaveLength(500);
    expect(v.warnings.join()).toMatch(/500/);
  });

  it("drops unknown properties and clamps numbers", () => {
    const s = base() as unknown as Record<string, unknown>;
    s.evil = "<script>";
    (s.layers as Record<string, unknown>[])[0].style = { radius: 9999, opacity: 7, onClick: "alert(1)" };
    const v = validateSpec(s);
    expect(v.spec).not.toHaveProperty("evil");
    expect(v.spec!.layers[0].style).toEqual({ radius: 60, opacity: 1 });
  });

  it("only accepts color references — no CSS or URL injection", () => {
    for (const bad of ["red", "url(javascript:alert(1))", "#fff;fill:url(#x)", "expression(alert(1))", "palette:999", "", 5]) {
      expect(isColorRef(bad)).toBe(false);
      const s = base();
      s.layers[0].style = { fill: bad as string };
      expect(validateSpec(s).spec).toBeNull();
    }
    for (const ok of ["accent", "palette:3", "#1f77b4", "#FFF", "negative"]) expect(isColorRef(ok)).toBe(true);
  });

  it("string values are length-limited and text is escaped when rendered", () => {
    const s = base();
    s.layers.push({ mark: "text", encoding: { x: { value: 10 }, y: { field: "label" }, text: { value: "<img src=x onerror=alert(1)>".repeat(40) } } });
    const v = validateSpec(s);
    expect(v.spec).not.toBeNull();
    const { svg } = renderSpec(v.spec!);
    expect(svg).not.toContain("<img");
  });
});

describe("interpreter features", () => {
  it("folds multi-column fields into series", () => {
    const spec: PlotSpec = {
      version: 1,
      name: "Folded lines",
      description: "",
      category: "trend",
      fields: [
        { key: "x", label: "Year", type: "any" },
        { key: "series", label: "Series", type: "number", multiple: true },
      ],
      sample: { title: "t", rows: [{ year: 2020, a: 1, b: 2 }, { year: 2021, a: 3, b: 1 }, { year: 2022, a: 4, b: 5 }] },
      layers: [{ mark: "line", fold: "series", encoding: { x: { field: "x" }, y: { field: "$value" }, color: { field: "$series" } } }],
    };
    const v = validateSpec(spec);
    expect(v.errors).toEqual([]);
    const def = specToDefinition(v.spec!, "custom:fold");
    const doc = docFromSample(def);
    expect(doc.mapping.series).toEqual(["a", "b"]);
    const { svg } = renderSpec(v.spec!);
    expect((svg.match(/<path/g) ?? []).length).toBeGreaterThanOrEqual(2);
    // Legend shows both folded series names.
    expect(svg).toMatch(/>a<\/text>/);
    expect(svg).toMatch(/>b<\/text>/);
  });

  it("aggregates, stacks and filters", () => {
    const spec: PlotSpec = {
      version: 1,
      name: "Stacked sums",
      description: "",
      category: "composition",
      fields: [
        { key: "cat", label: "Cat", type: "string" },
        { key: "grp", label: "Group", type: "string" },
        { key: "v", label: "Value", type: "number" },
      ],
      sample: {
        title: "t",
        rows: [
          { cat: "A", grp: "x", v: 1 },
          { cat: "A", grp: "x", v: 2 },
          { cat: "A", grp: "y", v: 3 },
          { cat: "B", grp: "x", v: -1 },
        ],
      },
      layers: [
        { mark: "bar", stack: true, encoding: { x: { field: "cat" }, y: { field: "v", aggregate: "sum" }, color: { field: "grp" } } },
        { mark: "rule", encoding: { y: { value: 0 } } },
        { mark: "point", filter: { field: "v", op: ">", value: 2 }, encoding: { x: { field: "cat" }, y: { field: "v" } } },
      ],
    };
    const v = validateSpec(spec);
    expect(v.errors).toEqual([]);
    renderSpec(v.spec!);
  });

  it("renders polar arcs, log and time axes", () => {
    const arcs = validateSpec(SPEC_TEMPLATES.find((t) => t.id === "rose")!.spec).spec!;
    expect(renderSpec(arcs).svg).toContain("<path");
    const timeSpec: PlotSpec = {
      version: 1,
      name: "Time",
      description: "",
      category: "trend",
      fields: [
        { key: "d", label: "Date", type: "any" },
        { key: "v", label: "Value", type: "number" },
      ],
      sample: { title: "t", rows: [{ d: "2024-01-01", v: 10 }, { d: "2024-03-01", v: 1000 }, { d: "2024-06-01", v: 100 }] },
      y: { type: "log" },
      layers: [{ mark: "line", encoding: { x: { field: "d" }, y: { field: "v" } } }],
    };
    const v = validateSpec(timeSpec);
    expect(v.errors).toEqual([]);
    const { svg } = renderSpec(v.spec!);
    expect(svg).toMatch(/Jan|Feb|Mar/);
  });
});

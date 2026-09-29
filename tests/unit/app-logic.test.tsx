import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { en } from "@/lib/i18n/en";
import { es } from "@/lib/i18n/es";
import { translate } from "@/lib/i18n/core";
import { EXAMPLES } from "@/lib/examples/server";
import { resolveDefinition } from "@/lib/resolveDef";
import { decodeDoc, encodeDoc, shareURL } from "@/lib/share";
import { safeNext } from "@/lib/url";
import { BUILTIN_CHARTS } from "@/lib/viz/charts";
import { barChart } from "@/lib/viz/charts/bars";
import { mappingIssues } from "@/lib/viz/data";
import { addColumn, addRow, deleteColumn, deleteRow, docToCSV, renameColumn, setCell, templateCSV, withData } from "@/lib/viz/docOps";
import { docFromSample, renderPoster } from "@/lib/viz/engine";
import { embeddedFontCSS, posterSVG } from "@/lib/viz/export/svg";

type Tree = { [k: string]: string | Tree };
const at = (d: object, k: string) => k.split(".").reduce<string | Tree>((o, p) => (o as Tree)[p], d as Tree);
const keys = (o: object, p = ""): string[] =>
  Object.entries(o).flatMap(([k, v]) => (typeof v === "object" ? keys(v, `${p}${k}.`) : [`${p}${k}`]));

describe("i18n", () => {
  it("Spanish has exactly the English keys, all non-empty", () => {
    expect(keys(es).sort()).toEqual(keys(en).sort());
    for (const k of keys(es)) expect(at(es, k)).not.toBe("");
  });

  it("placeholders are preserved in both languages", () => {
    for (const k of keys(en)) {
      const get = (d: object) => at(d, k) as string;
      const ph = (s: string) => (s.match(/\{\w+\}/g) ?? []).sort();
      expect(ph(get(es)), k).toEqual(ph(get(en)));
    }
  });

  it("translates with variables and falls back", () => {
    expect(translate("es", "data.loaded", { rows: 3, cols: 2 })).toBe("Cargamos 3 filas × 2 columnas");
    expect(translate("en", "nope.missing" as never)).toBe("nope.missing");
  });

  it("every chart has names in both languages", () => {
    for (const c of BUILTIN_CHARTS) {
      expect(typeof c.name === "object" && c.name.es, c.id).toBeTruthy();
      expect(typeof c.description === "object" && c.description.es, c.id).toBeTruthy();
    }
  });
});

describe("document operations", () => {
  const doc = docFromSample(barChart);

  it("edits cells with type re-inference", () => {
    const d1 = setCell(doc, 0, "orders", "1.234,5");
    expect(d1.data[0].orders).toBeCloseTo(1234.5);
    const d2 = setCell(doc, 0, "orders", "");
    expect(d2.data[0].orders).toBeNull();
    const d3 = [0, 1, 2, 3, 4, 5].reduce((d, i) => setCell(d, i, "orders", `word${i}`), doc);
    expect(d3.columns.find((c) => c.name === "orders")?.type).toBe("string");
    expect(setCell(doc, 99, "orders", "1")).toBe(doc);
    expect(setCell(doc, 0, "ghost", "1")).toBe(doc);
  });

  it("adds, deletes and renames rows/columns, keeping the mapping in sync", () => {
    expect(addRow(doc).data).toHaveLength(doc.data.length + 1);
    expect(deleteRow(doc, 0).data).toHaveLength(doc.data.length - 1);
    const withCol = addColumn(addColumn(doc, "extra"), "extra");
    expect(withCol.columns.map((c) => c.name)).toEqual(["drink", "orders", "extra", "extra_2"]);
    const renamed = renameColumn(doc, "orders", "cups");
    expect(renamed.mapping.value).toBe("cups");
    expect(renamed.data[0].cups).toBe(412);
    expect(renameColumn(doc, "orders", "drink")).toBe(doc);
    expect(renameColumn(doc, "orders", "   ")).toBe(doc);
    const dropped = deleteColumn(doc, "orders");
    expect(dropped.mapping.value).toBeUndefined();
    expect(mappingIssues(barChart, dropped.mapping, dropped.columns)).toHaveLength(1);
  });

  it("loads new data and remaps", () => {
    const d = withData(doc, barChart, [{ name: "city", type: "string" }, { name: "pop", type: "number" }], [{ city: "Lima", pop: "10,1" }]);
    expect(d.mapping).toEqual({ label: "city", value: "pop" });
    expect(d.data[0].pop).toBeCloseTo(10.1);
  });

  it("exports CSV and templates", () => {
    expect(docToCSV(doc).split("\n")[0]).toBe("drink,orders");
    expect(templateCSV(barChart).split("\n")).toHaveLength(6);
  });
});

describe("share links", () => {
  it("round-trips a document through the URL", async () => {
    const doc = docFromSample(barChart);
    const token = await encodeDoc(doc);
    expect(token[0]).toBe("z");
    expect(await decodeDoc(token)).toEqual(doc);
    const { url, tooLong } = await shareURL(doc, "https://example.com");
    expect(url.startsWith("https://example.com/build#d=z")).toBe(true);
    expect(tooLong).toBe(false);
  });

  it("rejects broken tokens without throwing", async () => {
    for (const bad of ["", "x", "zzzz", "j" + btoa("not json"), "j" + btoa('{"data":5}'), "z" + "A".repeat(50)]) {
      expect(await decodeDoc(bad)).toBeNull();
    }
  });

  it("flags data too large for a link", async () => {
    const doc = docFromSample(barChart);
    const big = { ...doc, data: Array.from({ length: 20000 }, (_, i) => ({ drink: `item-${i}-${Math.random()}`, orders: Math.random() })) };
    expect((await shareURL(big, "https://x.y")).tooLong).toBe(true);
  });
});

describe("examples library", () => {
  it("has many unique, valid examples covering every chart type", () => {
    expect(EXAMPLES.length).toBeGreaterThanOrEqual(40);
    expect(new Set(EXAMPLES.map((e) => e.id)).size).toBe(EXAMPLES.length);
    const types = new Set(EXAMPLES.map((e) => e.doc.chartType));
    for (const c of BUILTIN_CHARTS) expect(types.has(c.id), c.id).toBe(true);
  });

  it.each(EXAMPLES.map((e) => [e.id, e] as const))("%s maps cleanly and renders", (_id, ex) => {
    const def = resolveDefinition(ex.doc.chartType);
    expect(def.id).toBe(ex.doc.chartType);
    expect(mappingIssues(def, ex.doc.mapping, ex.doc.columns)).toEqual([]);
    expect(ex.doc.title.length).toBeGreaterThan(10);
    expect(ex.doc.source).toBeTruthy();
    const { element, issues } = renderPoster(ex.doc, def, { uid: "e" });
    expect(issues).toEqual([]);
    expect(renderToStaticMarkup(element)).not.toMatch(/="[^"]*NaN[^"]*"/);
  });
});

describe("export", () => {
  it("embeds only the fonts a chart uses", async () => {
    const doc = docFromSample(barChart, { fonts: "editorial" });
    const loaded: string[] = [];
    const css = await embeddedFontCSS(doc, async (url) => {
      loaded.push(url);
      return "AAAA";
    });
    expect(css).toContain("font-family:'Fraunces'");
    expect(css).toContain("font-family:'Inter'");
    expect(loaded.every((u) => /fraunces|inter/.test(u))).toBe(true);
  });

  it("produces a standalone SVG document", () => {
    const doc = docFromSample(barChart);
    const svg = posterSVG(doc, barChart, { fontCSS: "@font-face{}" });
    expect(svg.startsWith('<?xml version="1.0"')).toBe(true);
    expect(svg).toContain('xmlns="http://www.w3.org/2000/svg"');
    expect(svg).toContain(`width="${doc.style.width}"`);
    expect(svg).toContain("<style>@font-face{}</style>");
  });

  it("tolerates font loading failures", async () => {
    const doc = docFromSample(barChart, { fonts: "technical" });
    await expect(embeddedFontCSS(doc, async () => { throw new Error("offline"); })).resolves.toBe("");
  });
});

describe("safeNext", () => {
  it("only allows same-site relative paths", () => {
    expect(safeNext("/explore")).toBe("/explore");
    for (const bad of [null, "", "https://evil.com", "//evil.com", "/\\evil.com", "javascript:alert(1)"]) expect(safeNext(bad)).toBe("/build");
  });
});

describe("guides", () => {
  it("renders docs with working cross-links and heading anchors", async () => {
    const { renderGuide, headingId } = await import("@/lib/docs");
    expect(headingId("Before you open AI to the public")).toBe("before-you-open-ai-to-the-public");
    expect(headingId("Self-hosting &amp; <code>config</code>")).toBe("self-hosting--config");
    const ai = await renderGuide("ai");
    expect(ai.html).toContain('href="/guide/self-hosting#before-you-open-ai-to-the-public"');
    const hosting = await renderGuide("self-hosting");
    expect(hosting.html).toContain('id="before-you-open-ai-to-the-public"');
  });
});

import { BUILTIN_CHARTS } from "@/lib/viz/charts";
import { autoMap } from "@/lib/viz/data";
import { SPEC_TEMPLATES } from "@/lib/viz/spec/templates";
import type { Layer, PlotSpec } from "@/lib/viz/spec/types";
import type { ColumnInfo, DataRow } from "@/lib/viz/types";
import type { AIProvider, JSONRequest } from "./provider";

/**
 * A deterministic stand-in for Claude (AI_PROVIDER=mock). It returns the same
 * schema-shaped JSON the real model does, so the whole pipeline — parsing,
 * validation, repair, UI — is exercised in demos and tests without an API key.
 */

export type SuggestMeta = { prompt: string; columns: ColumnInfo[]; rows: DataRow[]; locale: "en" | "es" };
export type SpecMeta = { prompt: string; current: PlotSpec | null; locale: "en" | "es" };

const has = (s: string, re: RegExp) => re.test(s.toLowerCase());

export function heuristicSuggestion(meta: SuggestMeta) {
  const { prompt, columns, rows } = meta;
  const nums = columns.filter((c) => c.type === "number");
  const strs = columns.filter((c) => c.type === "string");
  const dates = columns.filter((c) => c.type === "date");
  const yearLike = nums.find((c) => /^(year|año|anio|yr|fecha|date)$/i.test(c.name));
  const p = prompt ?? "";
  let chartType = "bar";
  let options: Record<string, string | number | boolean> = {};
  if (has(p, /correl|relationship|relaci|\bvs\b|versus|against/) && nums.length >= 2) {
    chartType = "scatter";
    options = { trendline: true };
  } else if (has(p, /distribu|spread|histogr|dispers/) && nums.length >= 1 && !strs.length) chartType = "histogram";
  else if (has(p, /share|percent|proporc|composi|particip|porcent|breakdown|mix/) && (strs.length || dates.length)) chartType = rows.length > 6 ? "treemap" : "donut";
  else if (has(p, /trend|over time|evolu|tendenc|growth|crecim|monthly|mensual|anual|yearly/) || dates.length || yearLike) chartType = nums.length - (yearLike ? 1 : 0) > 1 ? "multiline" : "line";
  else if (has(p, /rank|top|best|largest|mayor|mejor|leader|ranking/)) {
    chartType = "hbar";
    options = { highlight: "max" };
  } else if (!strs.length && nums.length >= 2) chartType = "scatter";
  else if (!strs.length && nums.length === 1) chartType = "histogram";
  else if (rows.length > 12) chartType = "hbar";
  if (has(p, /highlight|resalt|destac/) && ["bar", "hbar", "lollipop"].includes(chartType)) options.highlight = has(p, /smallest|lowest|menor|peor/) ? "min" : "max";

  const def = BUILTIN_CHARTS.find((c) => c.id === chartType)!;
  let cols = columns;
  if (yearLike && (chartType === "line" || chartType === "multiline")) cols = [yearLike, ...columns.filter((c) => c !== yearLike)];
  const mapping = autoMap(def, cols);
  const first = (k: string) => {
    const m = mapping[k];
    return Array.isArray(m) ? m[0] : m;
  };
  const cleanPrompt = p.trim().replace(/\s+/g, " ");
  const title = cleanPrompt
    ? (cleanPrompt.charAt(0).toUpperCase() + cleanPrompt.slice(1)).slice(0, 90)
    : meta.locale === "es"
      ? `${first("value") ?? first("y") ?? "Valores"} por ${first("label") ?? first("x") ?? "categoría"}`
      : `${first("value") ?? first("y") ?? "Values"} by ${first("label") ?? first("x") ?? "category"}`;
  return {
    chartType,
    mapping: Object.entries(mapping).map(([field, v]) => ({ field, columns: Array.isArray(v) ? v : v ? [v] : [] })),
    title,
    subtitle: "",
    options: Object.entries(options).map(([key, value]) => ({ key, value })),
    reason: `Picked ${chartType} from the column types${cleanPrompt ? " and your request" : ""}.`,
  };
}

/** PlotSpec → the schema-shaped output the model would produce. */
export function specToAIOutput(spec: PlotSpec, notes: string) {
  const cols = Array.from(new Set(spec.sample.rows.flatMap((r) => Object.keys(r))));
  return {
    name: spec.name,
    description: spec.description,
    category: spec.category,
    fields: spec.fields.map((f) => ({ key: f.key, label: f.label, type: f.type, required: f.required !== false, multiple: !!f.multiple })),
    sample_title: spec.sample.title,
    sample_subtitle: spec.sample.subtitle ?? "",
    sample_columns: cols,
    sample_rows: spec.sample.rows.map((r) => cols.map((c) => r[c] ?? null)),
    coord: spec.coord ?? "cartesian",
    ...(spec.x ? { x: spec.x } : {}),
    ...(spec.y ? { y: spec.y } : {}),
    ...(spec.legend === false ? { legend: false } : {}),
    layers: spec.layers,
    notes,
  };
}

const PICKS: [RegExp, string][] = [
  [/bullet|quota|target vs|vs target|meta|cuota|objetivo/, "bullet"],
  [/diverg|positive.*negative|gain.*loss|ganan.*p[eé]rdid|change|cambio/, "diverging"],
  [/range|min.*max|band|temperat|rango|banda/, "range-band"],
  [/strip|every (point|observation)|dots? per|puntos/, "strip"],
  [/ring|donut|dona|anillo|share|proporc/, "rose"],
  [/goal|threshold|target line|l[ií]nea meta|umbral/, "target-line"],
  [/connected|trajectory|path|trayector/, "connected-scatter"],
];

function tweak(spec: PlotSpec, prompt: string): { spec: PlotSpec; notes: string } {
  const s: PlotSpec = JSON.parse(JSON.stringify(spec));
  const done: string[] = [];
  const p = prompt.toLowerCase();
  const bars = s.layers.filter((l) => l.mark === "bar" || l.mark === "rect");
  if (/round|redonde/.test(p)) {
    bars.forEach((l) => (l.style = { ...l.style, radius: 10 }));
    done.push("rounded the bars");
  }
  if (/thin|delgad|fina/.test(p)) {
    bars.forEach((l) => (l.style = { ...l.style, size: 0.45 }));
    done.push("made the bars thinner");
  }
  if (/horizontal/.test(p)) {
    for (const l of s.layers) {
      const { x, y, x2, y2 } = l.encoding;
      l.encoding = { ...l.encoding, x: y, y: x, x2: y2, y2: x2 };
      for (const k of ["x", "y", "x2", "y2"] as const) if (!l.encoding[k]) delete l.encoding[k];
    }
    [s.x, s.y] = [s.y, s.x];
    done.push("made it horizontal");
  }
  if (/label|etiquet|values|valores/.test(p) && !s.layers.some((l) => l.mark === "text")) {
    const base = s.layers.find((l) => l.encoding.x && l.encoding.y);
    const valueCh = base && (base.encoding.y?.field && s.fields.find((f) => f.key === base.encoding.y!.field)?.type === "number" ? base.encoding.y : base.encoding.x);
    if (base && valueCh) {
      const text: Layer = { mark: "text", encoding: { x: base.encoding.x, y: base.encoding.y, text: valueCh }, style: { dy: -14, fontSize: 13 } };
      s.layers.push(text);
      done.push("added value labels");
    }
  }
  if (/smooth|suave|curv/.test(p)) {
    s.layers.filter((l) => l.mark === "line" || l.mark === "area").forEach((l) => (l.style = { ...l.style, curve: "smooth" }));
    done.push("smoothed the lines");
  }
  if (/dash|punte|discontinu/.test(p)) {
    s.layers.filter((l) => l.mark === "line" || l.mark === "rule").forEach((l) => (l.style = { ...l.style, dash: [6, 5] }));
    done.push("dashed the lines");
  }
  if (/sort|orden/.test(p)) {
    const band = s.y?.type === "band" || s.layers.some((l) => l.mark === "bar" && s.fields.find((f) => f.key === l.encoding.y?.field)?.type === "string") ? "y" : "x";
    s[band] = { ...(s[band] ?? {}), sort: "value-desc" };
    done.push("sorted by value");
  }
  return { spec: s, notes: done.length ? `Demo mode: I ${done.join(", ")}.` : "Demo mode: no change matched your request — try “rounded”, “horizontal”, “labels”, “smooth”, “dashed” or “sort”." };
}

export function mockSpec(meta: SpecMeta): { spec: PlotSpec; notes: string } {
  if (meta.current) return tweak(meta.current, meta.prompt);
  const p = meta.prompt.toLowerCase();
  const id = PICKS.find(([re]) => re.test(p))?.[1] ?? "bullet";
  const tpl = SPEC_TEMPLATES.find((t) => t.id === id)!.spec;
  const name = meta.prompt.trim() ? meta.prompt.trim().replace(/\s+/g, " ").slice(0, 40) : tpl.name;
  return {
    spec: { ...tpl, name: name.charAt(0).toUpperCase() + name.slice(1) },
    notes: `Demo mode: started from the “${tpl.name}” template. Connect an Anthropic API key for real generation.`,
  };
}

export function createMockProvider(): AIProvider {
  return {
    name: "mock",
    model: "mock",
    async json(req: JSONRequest & { meta?: unknown }) {
      await new Promise((r) => setTimeout(r, 250));
      if (req.task === "suggest") return heuristicSuggestion(req.meta as SuggestMeta);
      const { spec, notes } = mockSpec(req.meta as SpecMeta);
      return specToAIOutput(spec, notes);
    },
  };
}

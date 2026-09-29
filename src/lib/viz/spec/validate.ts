import { isHexColor } from "../scale";
import { CHART_CATEGORIES, type ChartCategory, type DataRow } from "../types";
import { AGGREGATES, CHANNELS, MARKS, type AxisSpec, type Layer, type PlotSpec, type SpecField } from "./types";

export const SPEC_LIMITS = {
  fields: 12,
  layers: 12,
  sampleRows: 500,
  name: 40,
  description: 160,
  text: 200,
};

export type SpecValidation = { spec: PlotSpec | null; errors: string[]; warnings: string[] };

const COLOR_REFS = new Set(["accent", "ink", "text", "muted", "grid", "axis", "positive", "negative", "background"]);
const SPECIAL_FIELDS = new Set(["$index", "$series", "$value"]);
const KEY_RE = /^[A-Za-z_][A-Za-z0-9_]{0,31}$/;

export function isColorRef(v: unknown): boolean {
  if (typeof v !== "string") return false;
  return COLOR_REFS.has(v) || /^palette:\d{1,2}$/.test(v) || isHexColor(v);
}

const isObj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v);
const str = (v: unknown, max: number) => (typeof v === "string" ? v.slice(0, max) : "");
const num = (v: unknown, lo: number, hi: number): number | undefined =>
  typeof v === "number" && Number.isFinite(v) ? Math.min(hi, Math.max(lo, v)) : undefined;

/**
 * Validates and normalizes an untrusted spec (from the Studio editor, an import,
 * or the AI). Unknown properties are dropped; numbers are clamped.
 */
export function validateSpec(input: unknown): SpecValidation {
  const errors: string[] = [];
  const warnings: string[] = [];
  if (!isObj(input)) return { spec: null, errors: ["The spec must be a JSON object."], warnings };

  const name = str(input.name, SPEC_LIMITS.name).trim();
  if (!name) errors.push("`name` is required.");
  const category = (CHART_CATEGORIES as string[]).includes(String(input.category))
    ? (input.category as ChartCategory)
    : "custom";
  if (input.category !== undefined && category === "custom" && input.category !== "custom")
    warnings.push(`Unknown category "${String(input.category)}" — using "custom".`);

  // Fields
  const fields: SpecField[] = [];
  if (!Array.isArray(input.fields) || !input.fields.length) errors.push("`fields` must be a non-empty array.");
  else {
    if (input.fields.length > SPEC_LIMITS.fields) errors.push(`At most ${SPEC_LIMITS.fields} fields are allowed.`);
    input.fields.slice(0, SPEC_LIMITS.fields).forEach((f, i) => {
      if (!isObj(f)) return errors.push(`fields[${i}] must be an object.`);
      const key = String(f.key ?? "");
      if (!KEY_RE.test(key)) return errors.push(`fields[${i}].key "${key}" must be letters, digits or _ (max 32).`);
      if (fields.some((x) => x.key === key)) return errors.push(`fields[${i}].key "${key}" is duplicated.`);
      const type = f.type === "number" || f.type === "string" || f.type === "any" ? f.type : null;
      if (!type) return errors.push(`fields[${i}].type must be "string", "number" or "any".`);
      fields.push({
        key,
        label: str(f.label, 60) || key,
        type,
        required: f.required === false ? false : undefined,
        multiple: f.multiple === true ? true : undefined,
      });
    });
  }
  const fieldKeys = new Set(fields.map((f) => f.key));

  // Axes
  const axis = (a: unknown, path: string): AxisSpec | undefined => {
    if (a === undefined) return undefined;
    if (!isObj(a)) {
      errors.push(`${path} must be an object.`);
      return undefined;
    }
    const out: AxisSpec = {};
    if (a.type !== undefined) {
      if (["band", "point", "linear", "log", "time"].includes(String(a.type))) out.type = a.type as AxisSpec["type"];
      else errors.push(`${path}.type must be band, point, linear, log or time.`);
    }
    if (typeof a.title === "string") out.title = a.title.slice(0, 60);
    if (typeof a.zero === "boolean") out.zero = a.zero;
    if (typeof a.grid === "boolean") out.grid = a.grid;
    if (typeof a.hidden === "boolean") out.hidden = a.hidden;
    if (["value", "percent", "raw"].includes(String(a.format))) out.format = a.format as AxisSpec["format"];
    const pad = num(a.padding, 0, 0.9);
    if (pad !== undefined) out.padding = pad;
    if (["data", "asc", "desc", "value-asc", "value-desc"].includes(String(a.sort))) out.sort = a.sort as AxisSpec["sort"];
    return out;
  };

  // Layers
  const layers: Layer[] = [];
  const foldedKeys = new Set<string>();
  if (!Array.isArray(input.layers) || !input.layers.length) errors.push("`layers` must be a non-empty array.");
  else {
    if (input.layers.length > SPEC_LIMITS.layers) errors.push(`At most ${SPEC_LIMITS.layers} layers are allowed.`);
    input.layers.slice(0, SPEC_LIMITS.layers).forEach((l, i) => {
      const p = `layers[${i}]`;
      if (!isObj(l)) return errors.push(`${p} must be an object.`);
      if (!(MARKS as readonly string[]).includes(String(l.mark))) {
        return errors.push(`${p}.mark "${String(l.mark)}" is not one of: ${MARKS.join(", ")}.`);
      }
      const layer: Layer = { mark: l.mark as Layer["mark"], encoding: {} };
      if (l.fold !== undefined) {
        const f = fields.find((x) => x.key === l.fold);
        if (!f) errors.push(`${p}.fold "${String(l.fold)}" is not a field.`);
        else {
          layer.fold = f.key;
          foldedKeys.add(f.key);
        }
      }
      if (!isObj(l.encoding)) errors.push(`${p}.encoding must be an object.`);
      else {
        for (const [ch, v] of Object.entries(l.encoding)) {
          const cp = `${p}.encoding.${ch}`;
          if (!(CHANNELS as readonly string[]).includes(ch)) {
            warnings.push(`${cp} is not a known channel and was ignored.`);
            continue;
          }
          if (!isObj(v)) {
            errors.push(`${cp} must be an object like {"field": "value"}.`);
            continue;
          }
          const channel: Layer["encoding"][keyof Layer["encoding"]] = {};
          if (v.field !== undefined) {
            const fk = String(v.field);
            const special = SPECIAL_FIELDS.has(fk);
            if (!fieldKeys.has(fk) && !special) errors.push(`${cp}.field "${fk}" is not one of the declared fields.`);
            if ((fk === "$series" || fk === "$value") && !layer.fold) errors.push(`${cp}.field "${fk}" needs the layer to "fold" a multi-column field.`);
            channel.field = fk;
          }
          if (v.value !== undefined) {
            if (typeof v.value === "number" && Number.isFinite(v.value)) channel.value = v.value;
            else if (typeof v.value === "string") {
              if (ch === "color" && !isColorRef(v.value)) errors.push(`${cp}.value "${v.value}" is not a color (use "accent", "palette:2", "#1f77b4"…).`);
              channel.value = v.value.slice(0, SPEC_LIMITS.text);
            } else errors.push(`${cp}.value must be a number or text.`);
          }
          if (channel.field === undefined && channel.value === undefined) errors.push(`${cp} needs a "field" or a "value".`);
          if (v.aggregate !== undefined) {
            if ((AGGREGATES as readonly string[]).includes(String(v.aggregate))) channel.aggregate = v.aggregate as typeof channel.aggregate;
            else errors.push(`${cp}.aggregate must be one of ${AGGREGATES.join(", ")}.`);
          }
          layer.encoding[ch as keyof Layer["encoding"]] = channel;
        }
      }
      const enc = layer.encoding;
      const need = (chs: string[]) => chs.every((c) => enc[c as keyof typeof enc]);
      if (layer.mark === "arc") {
        if (!need(["theta"])) errors.push(`${p}: an "arc" layer needs a theta channel.`);
      } else if (layer.mark === "rule") {
        if (!enc.x && !enc.y) errors.push(`${p}: a "rule" layer needs x or y.`);
      } else if (!need(["x", "y"])) {
        errors.push(`${p}: a "${layer.mark}" layer needs both x and y channels.`);
      }
      if (layer.mark === "text" && !enc.text) errors.push(`${p}: a "text" layer needs a text channel.`);
      if (l.stack === true) layer.stack = true;
      if (l.order === "data" || l.order === "x") layer.order = l.order;
      if (isObj(l.style)) layer.style = cleanStyle(l.style, `${p}.style`, errors);
      if (isObj(l.filter)) {
        const f = l.filter;
        if (!fieldKeys.has(String(f.field))) errors.push(`${p}.filter.field "${String(f.field)}" is not a field.`);
        else if (!["==", "!=", ">", ">=", "<", "<="].includes(String(f.op))) errors.push(`${p}.filter.op is invalid.`);
        else layer.filter = { field: String(f.field), op: f.op as NonNullable<Layer["filter"]>["op"], value: typeof f.value === "number" ? f.value : String(f.value ?? "") };
      }
      layers.push(layer);
    });
  }
  for (const f of fields) {
    if (f.multiple && !foldedKeys.has(f.key)) warnings.push(`Field "${f.key}" takes several columns but no layer folds it — only the first column will be used.`);
  }

  // Sample
  let rows: DataRow[] = [];
  const sample = isObj(input.sample) ? input.sample : null;
  if (!sample || !Array.isArray(sample.rows) || !sample.rows.length) errors.push("`sample.rows` must contain at least one row.");
  else {
    if (sample.rows.length > SPEC_LIMITS.sampleRows) warnings.push(`Only the first ${SPEC_LIMITS.sampleRows} sample rows are kept.`);
    rows = sample.rows
      .slice(0, SPEC_LIMITS.sampleRows)
      .filter(isObj)
      .map((r) => {
        const o: DataRow = {};
        for (const [k, v] of Object.entries(r).slice(0, 40)) {
          o[String(k).slice(0, 64)] = typeof v === "number" && Number.isFinite(v) ? v : v === null ? null : String(v).slice(0, SPEC_LIMITS.text);
        }
        return o;
      });
  }

  if (errors.length) return { spec: null, errors, warnings };
  const spec: PlotSpec = {
    version: 1,
    name,
    description: str(input.description, SPEC_LIMITS.description),
    category,
    fields,
    sample: {
      title: str(sample!.title, SPEC_LIMITS.text) || name,
      subtitle: str(sample!.subtitle, SPEC_LIMITS.text) || undefined,
      source: str(sample!.source, SPEC_LIMITS.text) || undefined,
      rows,
    },
    coord: input.coord === "polar" ? "polar" : "cartesian",
    x: axis(input.x, "x"),
    y: axis(input.y, "y"),
    layers,
    legend: input.legend === false ? false : undefined,
  };
  if (spec.coord === "polar" && !layers.some((l) => l.mark === "arc")) warnings.push(`coord "polar" only affects "arc" layers.`);
  return { spec, errors, warnings };
}

function cleanStyle(s: Record<string, unknown>, path: string, errors: string[]) {
  const out: NonNullable<Layer["style"]> = {};
  for (const key of ["fill", "stroke"] as const) {
    if (s[key] !== undefined) {
      if (isColorRef(s[key])) out[key] = s[key] as string;
      else errors.push(`${path}.${key} "${String(s[key])}" is not a color reference.`);
    }
  }
  const n = (k: string, lo: number, hi: number) => num(s[k], lo, hi);
  const assign = <K extends keyof typeof out>(k: K, v: (typeof out)[K] | undefined) => {
    if (v !== undefined) out[k] = v;
  };
  assign("strokeWidth", n("strokeWidth", 0, 40));
  assign("opacity", n("opacity", 0, 1));
  assign("radius", n("radius", 0, 60));
  assign("size", n("size", 0, 200));
  assign("fontSize", n("fontSize", 4, 120));
  assign("fontWeight", n("fontWeight", 100, 900));
  assign("dx", n("dx", -400, 400));
  assign("dy", n("dy", -400, 400));
  assign("innerRadius", n("innerRadius", 0, 0.95));
  if (["linear", "smooth", "step"].includes(String(s.curve))) out.curve = s.curve as "linear";
  if (["start", "middle", "end"].includes(String(s.anchor))) out.anchor = s.anchor as "start";
  if (["value", "percent", "raw"].includes(String(s.format))) out.format = s.format as "value";
  if (Array.isArray(s.dash)) out.dash = s.dash.filter((d): d is number => typeof d === "number" && d >= 0 && d < 100).slice(0, 6);
  return out;
}

/** Parses JSON text and validates it, with a friendly message for syntax errors. */
export function parseSpecText(text: string): SpecValidation {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { spec: null, errors: [`JSON syntax error: ${msg}`], warnings: [] };
  }
  return validateSpec(parsed);
}

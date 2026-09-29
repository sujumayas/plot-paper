import { BUILTIN_CHARTS } from "@/lib/viz/charts";
import { AGGREGATES, CHANNELS, MARKS } from "@/lib/viz/spec/types";
import { CHART_CATEGORIES } from "@/lib/viz/types";

/**
 * JSON schemas for structured outputs. Every object sets additionalProperties:false.
 * Sample rows are arrays (not objects) because row keys are dynamic.
 */

const scalar = { anyOf: [{ type: "string" }, { type: "number" }] };

export const SUGGEST_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["chartType", "mapping", "title", "subtitle", "options", "reason"],
  properties: {
    chartType: { type: "string", enum: BUILTIN_CHARTS.map((c) => c.id) },
    mapping: {
      type: "array",
      description: "One entry per chart field.",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["field", "columns"],
        properties: { field: { type: "string" }, columns: { type: "array", items: { type: "string" } } },
      },
    },
    title: { type: "string" },
    subtitle: { type: "string" },
    options: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["key", "value"],
        properties: { key: { type: "string" }, value: { anyOf: [{ type: "string" }, { type: "number" }, { type: "boolean" }] } },
      },
    },
    reason: { type: "string" },
  },
} as const;

const channel = {
  type: "object",
  additionalProperties: false,
  properties: {
    field: { type: "string" },
    value: scalar,
    aggregate: { type: "string", enum: [...AGGREGATES] },
  },
};

const axis = {
  type: "object",
  additionalProperties: false,
  properties: {
    type: { type: "string", enum: ["band", "point", "linear", "log", "time"] },
    title: { type: "string" },
    zero: { type: "boolean" },
    grid: { type: "boolean" },
    hidden: { type: "boolean" },
    format: { type: "string", enum: ["value", "percent", "raw"] },
    padding: { type: "number" },
    sort: { type: "string", enum: ["data", "asc", "desc", "value-asc", "value-desc"] },
  },
};

const style = {
  type: "object",
  additionalProperties: false,
  properties: {
    fill: { type: "string" },
    stroke: { type: "string" },
    strokeWidth: { type: "number" },
    opacity: { type: "number" },
    radius: { type: "number" },
    size: { type: "number" },
    curve: { type: "string", enum: ["linear", "smooth", "step"] },
    dash: { type: "array", items: { type: "number" } },
    fontSize: { type: "number" },
    fontWeight: { type: "number" },
    anchor: { type: "string", enum: ["start", "middle", "end"] },
    dx: { type: "number" },
    dy: { type: "number" },
    format: { type: "string", enum: ["value", "percent", "raw"] },
    innerRadius: { type: "number" },
  },
};

export const SPEC_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["name", "description", "category", "fields", "sample_title", "sample_subtitle", "sample_columns", "sample_rows", "layers", "notes"],
  properties: {
    name: { type: "string" },
    description: { type: "string" },
    category: { type: "string", enum: [...CHART_CATEGORIES] },
    fields: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["key", "label", "type", "required", "multiple"],
        properties: {
          key: { type: "string" },
          label: { type: "string" },
          type: { type: "string", enum: ["string", "number", "any"] },
          required: { type: "boolean" },
          multiple: { type: "boolean" },
        },
      },
    },
    sample_title: { type: "string" },
    sample_subtitle: { type: "string" },
    sample_columns: { type: "array", items: { type: "string" } },
    sample_rows: { type: "array", items: { type: "array", items: scalar } },
    coord: { type: "string", enum: ["cartesian", "polar"] },
    x: axis,
    y: axis,
    legend: { type: "boolean" },
    layers: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["mark", "encoding"],
        properties: {
          mark: { type: "string", enum: [...MARKS] },
          encoding: {
            type: "object",
            additionalProperties: false,
            properties: Object.fromEntries(CHANNELS.map((c) => [c, channel])),
          },
          style,
          stack: { type: "boolean" },
          fold: { type: "string" },
          order: { type: "string", enum: ["x", "data"] },
          filter: {
            type: "object",
            additionalProperties: false,
            required: ["field", "op", "value"],
            properties: { field: { type: "string" }, op: { type: "string", enum: ["==", "!=", ">", ">=", "<", "<="] }, value: scalar },
          },
        },
      },
    },
    notes: { type: "string" },
  },
} as const;

/** Model output (schema-shaped) → the PlotSpec object shape validateSpec() expects. */
export function aiOutputToSpec(out: Record<string, unknown>): { spec: Record<string, unknown>; notes: string } {
  const cols = Array.isArray(out.sample_columns) ? (out.sample_columns as unknown[]).map(String) : [];
  const rows = Array.isArray(out.sample_rows)
    ? (out.sample_rows as unknown[]).filter(Array.isArray).map((r) => Object.fromEntries(cols.map((c, i) => [c, (r as unknown[])[i] ?? null])))
    : [];
  const fields = Array.isArray(out.fields)
    ? (out.fields as Record<string, unknown>[]).map((f) => ({ ...f, required: f.required === false ? false : undefined, multiple: f.multiple === true ? true : undefined }))
    : out.fields;
  const spec: Record<string, unknown> = {
    version: 1,
    name: out.name,
    description: out.description,
    category: out.category,
    fields,
    sample: { title: out.sample_title, subtitle: out.sample_subtitle, rows },
    coord: out.coord,
    x: out.x,
    y: out.y,
    legend: out.legend,
    layers: out.layers,
  };
  return { spec, notes: typeof out.notes === "string" ? out.notes : "" };
}

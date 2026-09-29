import type { ChartCategory, DataRow, FieldType } from "../types";

/**
 * PlotSpec v1 — a small, declarative grammar for custom chart types.
 * It is pure data (JSON), never code: specs from users or AI can't run scripts.
 * See docs/plotspec.md for the full reference.
 */

export const MARKS = ["bar", "line", "area", "point", "rule", "text", "rect", "arc", "tick"] as const;
export type Mark = (typeof MARKS)[number];

export const CHANNELS = ["x", "x2", "y", "y2", "color", "size", "text", "opacity", "theta"] as const;
export type ChannelName = (typeof CHANNELS)[number];

export const AGGREGATES = ["sum", "mean", "count", "min", "max"] as const;
export type SpecAggregate = (typeof AGGREGATES)[number];

export interface Channel {
  /** A field key, or "$index" (row number), "$series"/"$value" (after fold). */
  field?: string;
  /** A constant: a number, text, or a color reference for `color`. */
  value?: number | string;
  aggregate?: SpecAggregate;
}

/** "accent", "palette:N", "ink", "text", "muted", "grid", "axis", "positive", "negative", "background" or "#RRGGBB". */
export type ColorRef = string;

export interface MarkStyle {
  fill?: ColorRef;
  stroke?: ColorRef;
  strokeWidth?: number;
  opacity?: number;
  /** Corner radius for bar/rect (px at 1×). */
  radius?: number;
  /** Point radius, or bar thickness as a fraction of the band (0–1). */
  size?: number;
  curve?: "linear" | "smooth" | "step";
  dash?: number[];
  fontSize?: number;
  fontWeight?: number;
  anchor?: "start" | "middle" | "end";
  dx?: number;
  dy?: number;
  /** How numeric text is printed. */
  format?: "value" | "percent" | "raw";
  /** Arc inner radius as a fraction of the outer radius (0 = pie). */
  innerRadius?: number;
}

export interface Layer {
  mark: Mark;
  encoding: Partial<Record<ChannelName, Channel>>;
  style?: MarkStyle;
  /** Draw line/area points in x order (default) or in data order (connected scatter). */
  order?: "x" | "data";
  /** Stack bars/areas that share an x by the color field. */
  stack?: boolean;
  /** Turns a multi-column field into rows of { $series, $value }. */
  fold?: string;
  filter?: { field: string; op: "==" | "!=" | ">" | ">=" | "<" | "<="; value: number | string };
}

export interface AxisSpec {
  type?: "band" | "point" | "linear" | "log" | "time";
  title?: string;
  zero?: boolean;
  grid?: boolean;
  hidden?: boolean;
  format?: "value" | "percent" | "raw";
  /** Band padding 0–0.9. */
  padding?: number;
  sort?: "data" | "asc" | "desc" | "value-asc" | "value-desc";
}

export interface SpecField {
  key: string;
  label: string;
  type: FieldType;
  required?: boolean;
  multiple?: boolean;
}

export interface PlotSpec {
  version: 1;
  name: string;
  description: string;
  category: ChartCategory;
  fields: SpecField[];
  sample: { title: string; subtitle?: string; source?: string; rows: DataRow[] };
  coord?: "cartesian" | "polar";
  x?: AxisSpec;
  y?: AxisSpec;
  layers: Layer[];
  legend?: boolean;
}

/** A spec saved to the user's library. */
export interface CustomType {
  id: string;
  spec: PlotSpec;
  createdAt: string;
  updatedAt: string;
  /** Where it came from: "studio", "ai" or "import". */
  origin?: string;
  prompt?: string;
}

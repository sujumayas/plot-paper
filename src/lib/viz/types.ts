import type { ReactNode } from "react";

/* ─────────────────────────────────────────────────────────────
 * Data
 * ───────────────────────────────────────────────────────────── */

export type Cell = string | number | null | undefined;
export type DataRow = Record<string, Cell>;

export type ColumnType = "string" | "number" | "date";
export type ColumnInfo = { name: string; type: ColumnType };

/** Text that can be localized. A plain string is used for every locale. */
export type LText = string | { en: string; es?: string };

/* ─────────────────────────────────────────────────────────────
 * Chart definitions (the plugin contract)
 * ───────────────────────────────────────────────────────────── */

export type ChartCategory =
  | "comparison"
  | "trend"
  | "composition"
  | "relationship"
  | "distribution"
  | "headline"
  | "planning"
  | "custom";

export const CHART_CATEGORIES: ChartCategory[] = [
  "comparison",
  "trend",
  "composition",
  "relationship",
  "distribution",
  "headline",
  "planning",
  "custom",
];

export type FieldType = "string" | "number" | "any";

/** A data "role" a chart needs, e.g. the label column and the value column. */
export interface FieldDef {
  key: string;
  label: LText;
  type: FieldType;
  /** Defaults to true. */
  required?: boolean;
  /** Accepts several columns (e.g. one per series). */
  multiple?: boolean;
  help?: LText;
}

export type OptionDef =
  | { key: string; label: LText; type: "boolean"; default: boolean; help?: LText }
  | {
      key: string;
      label: LText;
      type: "select";
      default: string;
      choices: { value: string; label: LText }[];
      help?: LText;
    }
  | {
      key: string;
      label: LText;
      type: "number";
      default: number;
      min: number;
      max: number;
      step?: number;
      help?: LText;
    }
  | { key: string; label: LText; type: "text"; default: string; help?: LText };

export type OptionValues = Record<string, string | number | boolean>;

/** Maps a field key to one column name (or several for `multiple` fields). */
export type Mapping = Record<string, string | string[] | undefined>;

export interface LegendItem {
  label: string;
  color: string;
  shape?: "square" | "line" | "circle";
}

export interface ChartSample {
  title: LText;
  subtitle?: LText;
  source?: string;
  rows: DataRow[];
}

export interface ChartDefinition {
  id: string;
  name: LText;
  description: LText;
  category: ChartCategory;
  /** 22×22 SVG glyph used in pickers. Use `currentColor`. */
  glyph: ReactNode;
  keywords?: string[];
  fields: FieldDef[];
  options?: OptionDef[];
  sample: ChartSample;
  /** Minimum number of rows needed for a meaningful chart. Default 1. */
  minRows?: number;
  /** Legend entries shown above the plot. Return null for no legend. */
  legend?: (ctx: RenderContext) => LegendItem[] | null;
  render: (ctx: RenderContext) => ReactNode;
  /** Set for types created in the Studio / by AI (declarative spec). */
  isCustom?: boolean;
}

/* ─────────────────────────────────────────────────────────────
 * Style & document
 * ───────────────────────────────────────────────────────────── */

export interface NumberFormat {
  /** null → automatic precision */
  decimals: number | null;
  compact: boolean;
  prefix: string;
  suffix: string;
  /** BCP-47 locale for separators, e.g. "en-US", "es-PE", "de-DE". */
  locale: string;
}

export type LegendPosition = "top" | "bottom" | "none";

export interface ChartStyle {
  theme: string;
  /** null → theme default palette */
  palette: string | null;
  /** Overrides the first palette color. */
  accent: string | null;
  /** null → theme background; "transparent" is allowed. */
  background: string | null;
  /** Font pairing id; null → theme default. */
  fonts: string | null;
  /** Size preset id, or "custom". */
  size: string;
  width: number;
  height: number;
  /** Multiplier for all text sizes (0.7 – 1.6). */
  fontScale: number;
  grid: boolean;
  labels: boolean;
  legend: LegendPosition;
  titleAlign: "left" | "center";
  /** Corner radius for bars and cards, in px at 1× (0 – 16). */
  corners: number;
  number: NumberFormat;
  /** Shows the small "Made with Plotpaper" credit in the footer. */
  branding: boolean;
}

export interface ChartDoc {
  version: 1;
  chartType: string;
  title: string;
  subtitle: string;
  source: string;
  note: string;
  columns: ColumnInfo[];
  data: DataRow[];
  mapping: Mapping;
  options: OptionValues;
  style: ChartStyle;
}

/* ─────────────────────────────────────────────────────────────
 * Rendering
 * ───────────────────────────────────────────────────────────── */

export interface ResolvedTheme {
  id: string;
  dark: boolean;
  background: string;
  surface: string;
  ink: string;
  text: string;
  muted: string;
  grid: string;
  axis: string;
  positive: string;
  negative: string;
  palette: string[];
  fontDisplay: string;
  fontBody: string;
  fontNumeric: string;
  /** Weight used for titles. */
  displayWeight: number;
}

export interface RenderContext {
  rows: DataRow[];
  /** Column name mapped to a field, or undefined. */
  col: (key: string) => string | undefined;
  /** All columns mapped to a `multiple` field. */
  cols: (key: string) => string[];
  /** Numeric value of a field for a row (null when missing / not a number). */
  num: (row: DataRow, key: string) => number | null;
  /** String value of a field for a row. */
  str: (row: DataRow, key: string) => string;
  width: number;
  height: number;
  /** Typography unit: 1 at 1200×675. Multiply every size by it. */
  u: number;
  theme: ResolvedTheme;
  options: OptionValues;
  opt: {
    (key: string, fallback: string): string;
    (key: string, fallback: number): number;
    (key: string, fallback: boolean): boolean;
  };
  color: (i: number) => string;
  /** Formats a data value (uses the user's number format). */
  fmt: (n: number) => string;
  /** Formats axis ticks, given the tick step. */
  fmtTick: (n: number, step: number) => string;
  grid: boolean;
  labels: boolean;
  corners: number;
  /** Unique prefix for SVG ids (gradients, clip paths). */
  uid: string;
  /** Small words charts print themselves ("Other", "Total"…), localized. */
  words: ChartWords;
}

export interface ChartWords {
  other: string;
  blank: string;
  total: string;
  average: string;
  today: string;
  more: string;
  activeDays: string;
  increase: string;
  decrease: string;
  noData: string;
}

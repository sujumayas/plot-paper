import type { ReactNode } from "react";

export type VizRow = Record<string, string | number | null | undefined>;

export type VizColumn = {
  name: string;
  type: "string" | "number";
};

export type VizCategory =
  | "Comparison"
  | "Trends"
  | "Composition"
  | "Relationships"
  | "Distribution"
  | "Headline"
  | "Planning"
  | "Custom";

export const VIZ_CATEGORIES: VizCategory[] = [
  "Comparison",
  "Trends",
  "Composition",
  "Relationships",
  "Distribution",
  "Headline",
  "Planning",
];

export type BaseRendererId =
  | "bar"
  | "hbar"
  | "line"
  | "multiline"
  | "area"
  | "pie"
  | "donut"
  | "scatter"
  | "heatmap"
  | "radar"
  | "kpi"
  | "timeline";

export const BASE_RENDERER_IDS: BaseRendererId[] = [
  "bar",
  "hbar",
  "line",
  "multiline",
  "area",
  "pie",
  "donut",
  "scatter",
  "heatmap",
  "radar",
  "kpi",
  "timeline",
];

export type VizOpts = {
  width: number;
  height: number;
  accent: string;
  grid: boolean;
  labels: boolean;
};

export type RenderFn = (data: VizRow[], cols: string[], opts: VizOpts) => ReactNode;

export type VizCatalogEntry = {
  id: string;
  name: string;
  desc: string;
  category: VizCategory;
  glyph: ReactNode;
  columns: VizColumn[];
  sample: VizRow[];
  baseRendererId: BaseRendererId;
  isCustom?: boolean;
  ownerId?: string | null;
};

import { barChart } from "./viz/charts/bars";
import { getBuiltinChart } from "./viz/charts";
import { specToDefinition } from "./viz/spec/render";
import { validateSpec } from "./viz/spec/validate";
import type { ChartDefinition } from "./viz/types";

/** Finds the definition for a stored chart (built-in id, or an embedded PlotSpec). */
export function resolveDefinition(chartType: string, spec?: unknown): ChartDefinition {
  const builtin = getBuiltinChart(chartType);
  if (builtin) return builtin;
  if (spec) {
    const v = validateSpec(spec);
    if (v.spec) return specToDefinition(v.spec, chartType);
  }
  return barChart;
}

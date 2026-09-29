import type { ChartCategory, ChartDefinition } from "../types";
import { barChart, dumbbellChart, groupedChart, hbarChart, lollipopChart, stackedChart, waterfallChart } from "./bars";
import { donutChart, funnelChart, pieChart, treemapChart, waffleChart } from "./composition";
import { calendarChart, kpiChart, progressChart, timelineChart } from "./headline";
import { areaChart, lineChart, multilineChart, slopeChart } from "./lines";
import { boxplotChart, bubbleChart, heatmapChart, histogramChart, radarChart, scatterChart } from "./relations";

/**
 * Built-in chart types, in picker order. To add a new one, create a
 * `ChartDefinition` (see docs/creating-chart-types.md) and append it here.
 */
export const BUILTIN_CHARTS: ChartDefinition[] = [
  barChart,
  hbarChart,
  groupedChart,
  lollipopChart,
  dumbbellChart,
  lineChart,
  multilineChart,
  areaChart,
  slopeChart,
  calendarChart,
  stackedChart,
  pieChart,
  donutChart,
  treemapChart,
  waffleChart,
  waterfallChart,
  funnelChart,
  scatterChart,
  bubbleChart,
  heatmapChart,
  histogramChart,
  boxplotChart,
  radarChart,
  kpiChart,
  progressChart,
  timelineChart,
];

const byId = new Map(BUILTIN_CHARTS.map((c) => [c.id, c]));

export function getBuiltinChart(id: string): ChartDefinition | undefined {
  return byId.get(id);
}

export function chartsByCategory(charts: ChartDefinition[]): Map<ChartCategory, ChartDefinition[]> {
  const map = new Map<ChartCategory, ChartDefinition[]>();
  for (const c of charts) {
    const list = map.get(c.category) ?? [];
    list.push(c);
    map.set(c.category, list);
  }
  return map;
}

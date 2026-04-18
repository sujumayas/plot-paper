import type { BaseRendererId, RenderFn } from "../types";
import { renderArea } from "./area";
import { renderBar } from "./bar";
import { renderHBar } from "./hbar";
import { renderHeatmap } from "./heatmap";
import { renderKPI } from "./kpi";
import { renderLine } from "./line";
import { renderDonut, renderPie } from "./pie";
import { renderRadar } from "./radar";
import { renderScatter } from "./scatter";
import { renderTimeline } from "./timeline";

export const RENDERERS: Record<BaseRendererId, RenderFn> = {
  bar: renderBar,
  hbar: renderHBar,
  line: renderLine,
  multiline: renderLine,
  area: renderArea,
  pie: renderPie,
  donut: renderDonut,
  scatter: renderScatter,
  heatmap: renderHeatmap,
  radar: renderRadar,
  kpi: renderKPI,
  timeline: renderTimeline,
};

export const getRenderer = (id: BaseRendererId): RenderFn => RENDERERS[id];

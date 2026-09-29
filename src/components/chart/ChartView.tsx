import type { Ref } from "react";
import { getRenderer } from "@/lib/viz/renderers";
import type { VizCatalogEntry, VizOpts, VizRow } from "@/lib/viz/types";

type Props = {
  viz: VizCatalogEntry;
  data: VizRow[];
  title?: string;
  subtitle?: string;
  opts: Pick<VizOpts, "accent" | "grid" | "labels">;
  showChrome?: boolean;
  svgRef?: Ref<SVGSVGElement>;
};

export function ChartView({
  viz,
  data,
  title,
  subtitle,
  opts,
  showChrome = true,
  svgRef,
}: Props) {
  const W = 820,
    H = 460;
  const columns = viz.columns.map((c) => c.name);
  const render = getRenderer(viz.baseRendererId);
  const content = render(data, columns, {
    width: W,
    height: H,
    accent: opts.accent,
    grid: opts.grid,
    labels: opts.labels,
  });

  return (
    <div className="chart-wrap">
      {showChrome && <h2 className="chart-title">{title}</h2>}
      {showChrome && (
        <div className="chart-subtitle">{subtitle || viz.name}</div>
      )}
      <div className="chart-svg-holder">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${W} ${H}`}
          xmlns="http://www.w3.org/2000/svg"
          preserveAspectRatio="xMidYMid meet"
        >
          {content}
        </svg>
      </div>
      {showChrome && (
        <div className="chart-footer">
          <span>Fuente · Plotpaper</span>
          <span>
            n = {data.length} · {viz.name}
          </span>
        </div>
      )}
    </div>
  );
}

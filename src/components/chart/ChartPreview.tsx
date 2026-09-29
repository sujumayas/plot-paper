import { getRenderer } from "@/lib/viz/renderers";
import type { VizCatalogEntry, VizRow } from "@/lib/viz/types";

type Props = {
  viz: VizCatalogEntry;
  data: VizRow[];
  accent?: string;
  grid?: boolean;
};

export function ChartPreview({
  viz,
  data,
  accent = "#05BE50",
  grid = true,
}: Props) {
  const W = 400,
    H = 220;
  const columns = viz.columns.map((c) => c.name);
  const render = getRenderer(viz.baseRendererId);
  const content = render(data, columns, {
    width: W,
    height: H,
    accent,
    grid,
    labels: false,
  });

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      xmlns="http://www.w3.org/2000/svg"
      style={{ width: "100%", height: "100%" }}
    >
      {content}
    </svg>
  );
}

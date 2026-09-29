"use client";

import { ChartPreview } from "@/components/chart/ChartPreview";
import { IconEye, IconFork, IconHeart } from "@/components/icons";
import type { GraphWithVizType } from "@/lib/supabase/types";
import { resolveVizFromRow } from "@/lib/viz/resolveViz";

type Props = {
  graph: GraphWithVizType;
  accent: string;
  grid: boolean;
  onOpen: (graph: GraphWithVizType) => void;
};

export function GraphCard({ graph, accent, grid, onOpen }: Props) {
  const viz = resolveVizFromRow(graph.viz_types);
  const author = graph.display_author ?? "anónimo";
  return (
    <button
      className="card"
      type="button"
      onClick={() => onOpen(graph)}
      aria-label={`Abrir ${graph.title}`}
    >
      <div className="card-head">
        <h3 className="card-title">{graph.title}</h3>
        <span className="card-type">{viz.name}</span>
      </div>
      <div className="card-preview">
        <ChartPreview
          viz={viz}
          data={graph.data}
          accent={accent}
          grid={grid}
        />
      </div>
      <div className="card-foot">
        <div className="card-author">
          <div className="avatar">{author.slice(0, 2).toUpperCase()}</div>
          <span>{author}</span>
        </div>
        <div style={{ display: "flex", gap: 12 }}>
          <span className="stat"><IconHeart /> {graph.likes}</span>
          <span className="stat"><IconFork /> {graph.remixes}</span>
          <span className="stat"><IconEye /> {graph.views}</span>
        </div>
      </div>
    </button>
  );
}

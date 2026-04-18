"use client";

import type { Ref } from "react";
import { ChartView } from "@/components/chart/ChartView";
import { IconShare } from "@/components/icons";
import { Button } from "@/components/ui/Button";
import type { Tweaks } from "@/lib/tweaks";
import type { VizCatalogEntry, VizRow } from "@/lib/viz/types";

type Props = {
  viz: VizCatalogEntry;
  data: VizRow[];
  title: string;
  onTitleChange: (title: string) => void;
  tweaks: Tweaks;
  svgRef: Ref<SVGSVGElement>;
  onOpenData: () => void;
  onPublish: () => void;
  publishGated: boolean;
};

const EMPTY_ASCII = `┌──────────────────────────────────┐
│                                  │
│     No data yet. Pick a type,    │
│     then open Data & export.     │
│                                  │
└──────────────────────────────────┘`;

export function BuilderCanvas({
  viz,
  data,
  title,
  onTitleChange,
  tweaks,
  svgRef,
  onOpenData,
  onPublish,
  publishGated,
}: Props) {
  return (
    <section className="builder-main">
      <header className="canvas-head">
        <div className="canvas-title">
          <input
            className="canvas-title-input"
            value={title}
            onChange={(e) => onTitleChange(e.target.value)}
            placeholder="Untitled graph"
            aria-label="Graph title"
          />
          <span className="small mono">{viz.name}</span>
        </div>
        <div className="canvas-actions">
          <Button onClick={onOpenData}>Data &amp; export</Button>
          <Button
            variant="primary"
            onClick={onPublish}
            disabled={publishGated || data.length === 0}
            title={
              publishGated
                ? "Sign in to publish"
                : data.length === 0
                  ? "Load some data first"
                  : undefined
            }
          >
            <IconShare /> Publish
          </Button>
        </div>
      </header>
      <div className="canvas-body">
        {data.length === 0 ? (
          <div className="canvas-empty">
            <div className="box">
              <pre className="ascii-box">{EMPTY_ASCII}</pre>
              <h3>Drop a CSV or load a sample.</h3>
              <p>
                Every viz has its own template. Grab yours from{" "}
                <em>Data &amp; export</em> and you&rsquo;re off.
              </p>
              <Button onClick={onOpenData}>Open Data &amp; export…</Button>
            </div>
          </div>
        ) : (
          <ChartView
            viz={viz}
            data={data}
            title={title || "Untitled graph"}
            subtitle={`n = ${data.length} · ${viz.columns
              .map((c) => `${c.name}:${c.type}`)
              .join("  ·  ")}`}
            opts={tweaks}
            svgRef={svgRef}
          />
        )}
      </div>
    </section>
  );
}

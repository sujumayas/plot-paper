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
            placeholder="Gráfico sin título"
            aria-label="Título del gráfico"
          />
          <span className="small mono">{viz.name}</span>
        </div>
        <div className="canvas-actions">
          <Button onClick={onOpenData}>Datos y exportar</Button>
          <Button
            variant="primary"
            onClick={onPublish}
            disabled={publishGated || data.length === 0}
            title={
              publishGated
                ? "Inicia sesión para publicar"
                : data.length === 0
                  ? "Primero carga datos"
                  : undefined
            }
          >
            <IconShare /> Publicar
          </Button>
        </div>
      </header>
      <div className="canvas-body">
        {data.length === 0 ? (
          <div className="canvas-empty">
            <div className="box">
              <h3>Arrastra un CSV o usa una muestra.</h3>
              <p>
                Cada visualización tiene su propia plantilla. Descárgala desde{" "}
                <strong>Datos y exportar</strong> y empieza desde ahí.
              </p>
              <Button variant="primary" onClick={onOpenData}>
                Abrir Datos y exportar…
              </Button>
            </div>
          </div>
        ) : (
          <ChartView
            viz={viz}
            data={data}
            title={title || "Gráfico sin título"}
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

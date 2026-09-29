"use client";

import { clsx } from "clsx";
import { IconSparkle } from "@/components/icons";
import type { VizCatalogEntry, VizCategory } from "@/lib/viz/types";
import { VIZ_CATEGORIES } from "@/lib/viz/types";

type Props = {
  seedTypes: VizCatalogEntry[];
  ownedTypes: VizCatalogEntry[];
  selectedId: string;
  onSelect: (viz: VizCatalogEntry) => void;
  onOpenAI: () => void;
  onOpenData: () => void;
  rows: number;
  aiGated: boolean;
};

const CATEGORY_LABEL: Record<string, string> = {
  comparison: "Comparación",
  composition: "Composición",
  trend: "Tendencia",
  distribution: "Distribución",
  relationship: "Relación",
  geo: "Geográficos",
  flow: "Flujo",
  hierarchy: "Jerarquía",
};

const labelFor = (cat: string) => CATEGORY_LABEL[cat] ?? cat;

export function BuilderSidebar({
  seedTypes,
  ownedTypes,
  selectedId,
  onSelect,
  onOpenAI,
  onOpenData,
  rows,
  aiGated,
}: Props) {
  return (
    <aside className="builder-side">
      <div className="side-section">
        <div className="side-title">
          <span>Tipo de visualización</span>
          <span className="num">1</span>
        </div>

        {ownedTypes.length > 0 && (
          <>
            <div className="side-category">Tus tipos</div>
            <div className="viz-list">
              {ownedTypes.map((viz) => (
                <VizButton
                  key={viz.id}
                  viz={viz}
                  selected={viz.id === selectedId}
                  onClick={() => onSelect(viz)}
                />
              ))}
            </div>
          </>
        )}

        {VIZ_CATEGORIES.map((cat) => {
          const items = seedTypes.filter((v) => v.category === cat);
          if (!items.length) return null;
          const heading = ownedTypes.length > 0
            ? `Base · ${labelFor(cat)}`
            : labelFor(cat);
          return (
            <div key={cat}>
              <div className="side-category">{heading}</div>
              <div className="viz-list">
                {items.map((viz) => (
                  <VizButton
                    key={viz.id}
                    viz={viz}
                    selected={viz.id === selectedId}
                    onClick={() => onSelect(viz)}
                  />
                ))}
              </div>
            </div>
          );
        })}

        <button
          type="button"
          className="btn block accent"
          style={{ marginTop: 16 }}
          onClick={onOpenAI}
          disabled={aiGated}
          title={aiGated ? "Inicia sesión para generar con IA" : undefined}
        >
          <IconSparkle /> Generar con IA
        </button>
      </div>

      <div className="side-section">
        <div className="side-title">
          <span>Datos y exportar</span>
          <span className="num">2</span>
        </div>
        <button
          type="button"
          className="btn block primary"
          onClick={onOpenData}
        >
          Datos y exportar…
        </button>
        <div
          className="small"
          style={{
            marginTop: 10,
            fontFamily: "var(--num)",
          }}
        >
          Filas cargadas · {rows}
        </div>
      </div>
    </aside>
  );
}

function VizButton({
  viz,
  selected,
  onClick,
}: {
  viz: VizCatalogEntry;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className={clsx("viz-option", selected && "on")}
      onClick={onClick}
    >
      <span className="glyph">
        <svg viewBox="0 0 22 22" width="20" height="20">
          {viz.glyph}
        </svg>
      </span>
      <span>
        <span className="name">{viz.name}</span>
        <span className="desc">
          {viz.desc || labelFor(viz.category as VizCategory)}
        </span>
      </span>
      <span className="radio">{selected ? "●" : "○"}</span>
    </button>
  );
}

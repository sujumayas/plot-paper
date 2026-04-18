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
          <span>Visualization type</span>
          <span className="num">1</span>
        </div>

        {ownedTypes.length > 0 && (
          <>
            <div className="side-category">Your types</div>
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
          return (
            <div key={cat}>
              <div className="side-category">
                {ownedTypes.length > 0 ? `Seed · ${cat}` : cat}
              </div>
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
          title={aiGated ? "Sign in to generate with AI" : undefined}
        >
          <IconSparkle /> Generate with AI
        </button>
      </div>

      <div className="side-section">
        <div className="side-title">
          <span>Data &amp; export</span>
          <span className="num">2</span>
        </div>
        <button
          type="button"
          className="btn block primary"
          onClick={onOpenData}
        >
          Data &amp; export…
        </button>
        <div
          className="mono small"
          style={{
            marginTop: 10,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
          }}
        >
          Rows loaded · {rows}
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
          {viz.desc || (viz.category as VizCategory)}
        </span>
      </span>
      <span className="radio">{selected ? "●" : "○"}</span>
    </button>
  );
}

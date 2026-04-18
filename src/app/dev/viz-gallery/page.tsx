import { ChartView } from "@/components/chart/ChartView";
import { SEED_CATALOG } from "@/lib/viz/catalog";

const OPTS = {
  accent: "oklch(64% 0.16 48)",
  grid: true,
  labels: true,
};

export default function VizGalleryPage() {
  return (
    <section style={{ padding: "32px 0" }}>
      <div className="eyebrow">dev · all 13 renderers</div>
      <h1 className="serif" style={{ fontSize: 48, margin: "0 0 32px" }}>
        Viz gallery
      </h1>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(540px, 1fr))",
          gap: 24,
        }}
      >
        {SEED_CATALOG.map((viz) => (
          <div key={viz.id} style={{ border: "1px solid var(--color-rule)" }}>
            <ChartView
              viz={viz}
              data={viz.sample}
              title={viz.name}
              subtitle={`${viz.category} · ${viz.id}`}
              opts={OPTS}
            />
          </div>
        ))}
      </div>
    </section>
  );
}

import { ChartView } from "@/components/chart/ChartView";
import { SEED_CATALOG } from "@/lib/viz/catalog";

const OPTS = {
  accent: "#05BE50",
  grid: true,
  labels: true,
};

export default function VizGalleryPage() {
  return (
    <section style={{ padding: "32px 0" }}>
      <div className="eyebrow">Dev · todos los renderizadores</div>
      <h1
        style={{
          fontFamily: "var(--display)",
          fontWeight: 500,
          fontSize: 32,
          letterSpacing: "-0.6px",
          color: "var(--ibk-blue)",
          margin: "0 0 32px",
        }}
      >
        Galería de tipos
      </h1>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(540px, 1fr))",
          gap: 24,
        }}
      >
        {SEED_CATALOG.map((viz) => (
          <div
            key={viz.id}
            style={{
              border: "1px solid var(--line)",
              borderRadius: 12,
              overflow: "hidden",
              background: "#fff",
            }}
          >
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

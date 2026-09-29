"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { GraphCard } from "@/components/explore/GraphCard";
import { DetailModal } from "@/components/explore/DetailModal";
import { SignInModal } from "@/components/auth/SignInModal";
import { IconPlus, IconSearch } from "@/components/icons";
import { useToasts } from "@/hooks/useToasts";
import type { GraphWithVizType } from "@/lib/supabase/types";

type Sort = "trending" | "new" | "liked";

type Props = {
  graphs: GraphWithVizType[];
};

const SORT_LABEL: Record<Sort, string> = {
  trending: "Populares",
  new: "Nuevos",
  liked: "Más gustados",
};

export function ExploreView({ graphs }: Props) {
  const [filter, setFilter] = useState("all");
  const [sort, setSort] = useState<Sort>("trending");
  const [query, setQuery] = useState("");
  const [active, setActive] = useState<GraphWithVizType | null>(null);
  const [signInReason, setSignInReason] = useState<string | null>(null);
  const { toast, node: toastNode } = useToasts();

  const types = useMemo(() => {
    const unique = new Map<string, string>();
    for (const g of graphs) unique.set(g.viz_types.slug, g.viz_types.name);
    return Array.from(unique.entries()).map(([slug, name]) => ({ slug, name }));
  }, [graphs]);

  const filtered = useMemo(() => {
    let list = graphs.slice();
    if (filter !== "all") list = list.filter((g) => g.viz_types.slug === filter);
    if (query.trim()) {
      const q = query.toLowerCase();
      list = list.filter(
        (g) =>
          g.title.toLowerCase().includes(q) ||
          (g.display_author ?? "").toLowerCase().includes(q) ||
          (g.tags ?? []).some((t) => t.toLowerCase().includes(q)),
      );
    }
    if (sort === "trending")
      list.sort(
        (a, b) => b.likes + b.remixes * 5 - (a.likes + a.remixes * 5),
      );
    if (sort === "new")
      list.sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at));
    if (sort === "liked") list.sort((a, b) => b.likes - a.likes);
    return list;
  }, [graphs, filter, sort, query]);

  const totalViews = graphs.reduce((a, g) => a + g.views, 0);

  return (
    <>
      <div className="page-head">
        <div>
          <div className="eyebrow">Galería pública</div>
          <h1>
            Una guía para <em>leer</em> la forma de los datos.
          </h1>
          <p>
            Plotpaper es un patio de juegos para visualizar datos. Explora
            gráficos publicados por otros, copia su data o empieza desde tu
            propia plantilla CSV.
          </p>
        </div>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "flex-end",
            gap: 10,
          }}
        >
          <div className="small">
            {graphs.length} gráficos públicos · {totalViews.toLocaleString("es-PE")} vistas
          </div>
          <Link href="/build" prefetch={false}>
            <button className="btn primary" type="button">
              <IconPlus /> Construye un gráfico
            </button>
          </Link>
        </div>
      </div>

      <div className="explore-filter">
        <button
          className={`chip ${filter === "all" ? "on" : ""}`}
          onClick={() => setFilter("all")}
          type="button"
        >
          Todos
        </button>
        {types.map((t) => (
          <button
            key={t.slug}
            className={`chip ${filter === t.slug ? "on" : ""}`}
            onClick={() => setFilter(t.slug)}
            type="button"
          >
            {t.name}
          </button>
        ))}
        <div style={{ flex: 1 }} />
        <div className="search-pill">
          <IconSearch />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar..."
            aria-label="Buscar gráficos"
          />
        </div>
      </div>

      <div className="sort-bar">
        <span>
          {filtered.length} de {graphs.length} resultados
        </span>
        <div style={{ display: "flex", gap: 14 }}>
          {(["trending", "new", "liked"] as Sort[]).map((s) => (
            <button
              key={s}
              className={`sort-btn ${sort === s ? "on" : ""}`}
              onClick={() => setSort(s)}
              type="button"
            >
              {SORT_LABEL[s]}
            </button>
          ))}
        </div>
      </div>

      {graphs.length === 0 ? (
        <div
          style={{
            padding: "80px 0",
            textAlign: "center",
            color: "var(--fg-3)",
          }}
        >
          <p className="small">
            Aún no hay gráficos. Ve a <Link href="/build">Construir</Link> y
            publica el primero.
          </p>
        </div>
      ) : (
        <div className="grid">
          {filtered.map((g) => (
            <GraphCard
              key={g.id}
              graph={g}
              accent="#05BE50"
              grid
              onOpen={setActive}
            />
          ))}
        </div>
      )}

      {active && (
        <DetailModal
          graph={active}
          accent="#05BE50"
          grid
          labels
          onClose={() => setActive(null)}
          toast={toast}
          onRequireAuth={() =>
            setSignInReason("Inicia sesión para copiar, dar like o guardar.")
          }
        />
      )}

      <SignInModal
        open={signInReason !== null}
        onClose={() => setSignInReason(null)}
        reason={signInReason ?? undefined}
      />

      {toastNode}
    </>
  );
}

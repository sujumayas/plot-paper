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
          <div className="eyebrow">Vol. 01 · Spring 2026</div>
          <h1>
            A field guide to <em>reading</em>
            <br />
            the shape of things.
          </h1>
          <p>
            Plotpaper is a visualization playground. Browse graphs other people
            published, fork their data, or start from a CSV template of your
            own.
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
          <div className="mono small">
            {graphs.length} public graphs · {totalViews.toLocaleString()} views
          </div>
          <Link href="/build" prefetch={false}>
            <button className="btn primary" type="button">
              <IconPlus /> Build a new graph
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
          All types
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
            placeholder="search..."
            aria-label="Search graphs"
          />
        </div>
      </div>

      <div className="sort-bar">
        <span>
          {filtered.length} / {graphs.length} results
        </span>
        <div style={{ display: "flex", gap: 14 }}>
          {(["trending", "new", "liked"] as Sort[]).map((s) => (
            <button
              key={s}
              className={`sort-btn ${sort === s ? "on" : ""}`}
              onClick={() => setSort(s)}
              type="button"
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {graphs.length === 0 ? (
        <div
          style={{
            padding: "80px 0",
            textAlign: "center",
            color: "var(--ink-3)",
          }}
        >
          <p className="small">
            No graphs yet. Head to <Link href="/build">Build</Link> and publish
            one.
          </p>
        </div>
      ) : (
        <div className="grid">
          {filtered.map((g) => (
            <GraphCard
              key={g.id}
              graph={g}
              accent="oklch(64% 0.16 48)"
              grid
              onOpen={setActive}
            />
          ))}
        </div>
      )}

      {active && (
        <DetailModal
          graph={active}
          accent="oklch(64% 0.16 48)"
          grid
          labels
          onClose={() => setActive(null)}
          toast={toast}
          onRequireAuth={() =>
            setSignInReason("Sign in to fork, like, or save.")
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

"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ChartView } from "@/components/chart/ChartView";
import {
  IconClose,
  IconDownload,
  IconFile,
  IconFork,
  IconHeart,
  IconImage,
  IconJson,
  IconSparkle,
} from "@/components/icons";
import { Button } from "@/components/ui/Button";
import { getBrowserClient } from "@/lib/supabase/client";
import { exportJSON, exportPDF, exportPNG, exportSVG } from "@/lib/export";
import type { GraphWithVizType } from "@/lib/supabase/types";
import { resolveVizFromRow } from "@/lib/viz/resolveViz";

type Props = {
  graph: GraphWithVizType;
  accent: string;
  grid: boolean;
  labels: boolean;
  onClose: () => void;
  toast: (msg: string) => void;
  onRequireAuth: () => void;
};

export function DetailModal({
  graph,
  accent,
  grid,
  labels,
  onClose,
  toast,
  onRequireAuth,
}: Props) {
  const viz = resolveVizFromRow(graph.viz_types);
  const svgRef = useRef<SVGSVGElement>(null);
  const router = useRouter();
  const [liked, setLiked] = useState(false);
  const [likes, setLikes] = useState(graph.likes);
  const [userId, setUserId] = useState<string | null>(null);

  // Fire view increment once + get current session + current like state.
  useEffect(() => {
    const supa = getBrowserClient();
    void supa.rpc("increment_views", { graph_id: graph.id });
    supa.auth.getUser().then(async ({ data }) => {
      const uid = data.user?.id ?? null;
      setUserId(uid);
      if (uid) {
        const { data: likeRow } = await supa
          .from("likes")
          .select("user_id")
          .eq("graph_id", graph.id)
          .eq("user_id", uid)
          .maybeSingle();
        setLiked(!!likeRow);
      }
    });
  }, [graph.id]);

  // Close on Escape.
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  const doLike = async () => {
    if (!userId) {
      onRequireAuth();
      return;
    }
    const supa = getBrowserClient();
    const { data, error } = await supa.rpc("toggle_like", {
      graph_id: graph.id,
    });
    if (error) {
      toast("Could not update like");
      return;
    }
    const nowLiked = !!data;
    setLiked(nowLiked);
    setLikes((n) => n + (nowLiked ? 1 : -1));
  };

  const doFork = async () => {
    if (!userId) {
      onRequireAuth();
      return;
    }
    const supa = getBrowserClient();
    const { data, error } = await supa.rpc("fork_graph", {
      source_id: graph.id,
    });
    if (error || !data) {
      toast("Could not fork graph");
      return;
    }
    onClose();
    router.push(`/build?draft=${encodeURIComponent(String(data))}`);
  };

  const doUseData = () => {
    onClose();
    router.push(`/build?useData=${encodeURIComponent(graph.id)}`);
  };

  const doSaveType = async () => {
    if (!userId) {
      onRequireAuth();
      return;
    }
    const supa = getBrowserClient();
    const { error } = await supa
      .from("saved_types")
      .insert({ user_id: userId, viz_type_id: viz.id })
      .select();
    if (error && !error.message.includes("duplicate")) {
      toast("Could not save type");
      return;
    }
    toast(`Saved "${viz.name}" to your types`);
  };

  const fileBase = graph.title.toLowerCase().replace(/[^a-z0-9]+/g, "-");

  return (
    <div
      className="modal-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="modal"
        style={{ maxWidth: 1100 }}
        role="dialog"
        aria-modal="true"
        aria-label={graph.title}
      >
        <div className="detail">
          <div className="detail-chart">
            <ChartView
              viz={viz}
              data={graph.data}
              title={graph.title}
              subtitle={`by ${graph.display_author ?? "anon"} · n = ${graph.data.length}`}
              opts={{ accent, grid, labels }}
              svgRef={svgRef}
            />
          </div>
          <div className="detail-meta">
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "start",
              }}
            >
              <span className="pill">{viz.name}</span>
              <button className="close-x" onClick={onClose} aria-label="Close">
                <IconClose />
              </button>
            </div>
            <h2 style={{ marginTop: 12 }}>{graph.title}</h2>
            <div className="by">
              <div className="avatar">
                {(graph.display_author ?? "anon").slice(0, 2).toUpperCase()}
              </div>
              {graph.display_author ?? "anon"}
              {graph.tags && graph.tags.length > 0 && (
                <span style={{ color: "var(--ink-4)" }}>
                  · {graph.tags.join(" · ")}
                </span>
              )}
            </div>
            {graph.description && <p>{graph.description}</p>}

            <div className="meta-stats">
              <div className="meta-stat">
                <div className="k">Views</div>
                <div className="v">{graph.views.toLocaleString()}</div>
              </div>
              <div className="meta-stat">
                <div className="k">Likes</div>
                <div className="v">{likes.toLocaleString()}</div>
              </div>
              <div className="meta-stat">
                <div className="k">Forks</div>
                <div className="v">{graph.remixes.toLocaleString()}</div>
              </div>
            </div>

            <div className="action-stack">
              <Button variant="primary" onClick={doFork}>
                <IconFork /> Fork this graph
              </Button>
              <Button onClick={doUseData}>
                <IconSparkle /> Use data in new graph
              </Button>
              <Button onClick={doSaveType}>
                <IconDownload /> Save this type
              </Button>
              <Button
                variant={liked ? "accent" : "default"}
                onClick={doLike}
                aria-pressed={liked}
              >
                <IconHeart /> {liked ? "Liked" : "Like"}
              </Button>
            </div>

            <div className="export-grid">
              <Button
                size="sm"
                onClick={() => svgRef.current && exportPNG(svgRef.current, `${fileBase}.png`)}
                title="Export PNG"
              >
                <IconImage /> PNG
              </Button>
              <Button
                size="sm"
                onClick={() => svgRef.current && exportSVG(svgRef.current, `${fileBase}.svg`)}
                title="Export SVG"
              >
                <IconFile /> SVG
              </Button>
              <Button
                size="sm"
                onClick={() => svgRef.current && exportPDF(svgRef.current, `${fileBase}.pdf`, graph.title)}
                title="Export PDF"
              >
                <IconFile /> PDF
              </Button>
              <Button
                size="sm"
                onClick={() =>
                  exportJSON(`${fileBase}.json`, {
                    title: graph.title,
                    vizId: viz.id,
                    vizSlug: viz.baseRendererId,
                    columns: viz.columns,
                    data: graph.data,
                    tags: graph.tags,
                    exportedAt: new Date().toISOString(),
                  })
                }
                title="Export JSON"
              >
                <IconJson /> JSON
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

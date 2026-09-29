import { resolveDefinition } from "./resolveDef";
import { getServerClient } from "./supabase/server";
import { sanitizeDoc } from "./viz/engine";
import type { PlotSpec } from "./viz/spec/types";
import { validateSpec } from "./viz/spec/validate";
import type { ChartDefinition, ChartDoc, DataRow } from "./viz/types";

export type CommunityChart = {
  id: string;
  doc: ChartDoc;
  def: ChartDefinition;
  /** The PlotSpec of a custom chart type (validated), or null for built-ins. */
  spec: PlotSpec | null;
  author: string;
  likes: number;
  views: number;
  createdAt: string;
};

export type Row = {
  id: string;
  title: string;
  description: string | null;
  chart_type: string | null;
  config: Record<string, unknown> | null;
  data: DataRow[];
  display_author: string | null;
  likes: number;
  views: number;
  created_at: string;
};

/** Same cap as publishing (and the database constraint). */
export const MAX_COMMUNITY_ROWS = 5000;

/** Turns a database row into a chart; null when the row is unusable (never throws). */
export function toChart(r: Row): CommunityChart | null {
  try {
    const cfg = (r.config && typeof r.config === "object" ? r.config : {}) as Partial<ChartDoc> & { spec?: unknown };
    const chartType = r.chart_type ?? String(cfg.chartType ?? "bar");
    const data = Array.isArray(r.data) ? r.data.slice(0, MAX_COMMUNITY_ROWS) : [];
    const doc = sanitizeDoc({ ...(cfg as ChartDoc), chartType, title: cfg.title ?? r.title, subtitle: cfg.subtitle ?? r.description ?? "", data });
    const spec = cfg.spec ? (validateSpec(cfg.spec).spec ?? null) : null;
    return {
      id: String(r.id),
      doc,
      def: resolveDefinition(chartType, spec),
      spec,
      author: typeof r.display_author === "string" && r.display_author ? r.display_author : "community",
      likes: Number(r.likes) || 0,
      views: Number(r.views) || 0,
      createdAt: String(r.created_at ?? ""),
    };
  } catch {
    return null;
  }
}

/** Latest published community charts; [] when Supabase isn't configured or fails. */
export async function listCommunityCharts(limit = 60): Promise<CommunityChart[]> {
  try {
    const supa = await getServerClient();
    if (!supa) return [];
    const { data, error } = await supa
      .from("graphs")
      .select("id,title,description,chart_type,config,data,display_author,likes,views,created_at")
      .eq("is_published", true)
      .order("created_at", { ascending: false })
      .limit(limit);
    if (error || !data) return [];
    return (data as Row[]).map(toChart).filter((c): c is CommunityChart => c !== null);
  } catch {
    return [];
  }
}

export async function getCommunityChart(id: string): Promise<CommunityChart | null> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  try {
    const supa = await getServerClient();
    if (!supa) return null;
    const { data } = await supa
      .from("graphs")
      .select("id,title,description,chart_type,config,data,display_author,likes,views,created_at")
      .eq("id", id)
      .eq("is_published", true)
      .maybeSingle();
    return data ? toChart(data as Row) : null;
  } catch {
    return null;
  }
}

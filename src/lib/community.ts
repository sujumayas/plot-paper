import { resolveDefinition } from "./resolveDef";
import { getServerClient } from "./supabase/server";
import { sanitizeDoc } from "./viz/engine";
import type { ChartDefinition, ChartDoc, DataRow } from "./viz/types";

export type CommunityChart = {
  id: string;
  doc: ChartDoc;
  def: ChartDefinition;
  author: string;
  likes: number;
  views: number;
  createdAt: string;
};

type Row = {
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

function toChart(r: Row): CommunityChart {
  const cfg = (r.config ?? {}) as Partial<ChartDoc> & { spec?: unknown };
  const chartType = r.chart_type ?? String(cfg.chartType ?? "bar");
  const doc = sanitizeDoc({ ...(cfg as ChartDoc), chartType, title: cfg.title ?? r.title, subtitle: cfg.subtitle ?? r.description ?? "", data: Array.isArray(r.data) ? r.data : [] });
  return { id: r.id, doc, def: resolveDefinition(chartType, cfg.spec), author: r.display_author ?? "community", likes: r.likes, views: r.views, createdAt: r.created_at };
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
    return (data as Row[]).map(toChart);
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

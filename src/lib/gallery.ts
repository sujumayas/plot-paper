"use client";

import { getBrowserClient } from "./supabase/client";
import type { PlotSpec } from "./viz/spec/types";
import type { ChartDoc } from "./viz/types";

export const MAX_PUBLISH_ROWS = 5000;

/** Stores the chart in `graphs` as a published row. */
export async function publishGraph(doc: ChartDoc, spec: PlotSpec | null): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const supa = getBrowserClient();
  if (!supa) return { ok: false, error: "Supabase is not configured" };
  const { data: auth } = await supa.auth.getUser();
  if (!auth.user) return { ok: false, error: "Not signed in" };
  if (doc.data.length > MAX_PUBLISH_ROWS) return { ok: false, error: `Charts with more than ${MAX_PUBLISH_ROWS} rows can't be published` };
  const { data: body, ...rest } = doc;
  const { data, error } = await supa
    .from("graphs")
    .insert({
      title: doc.title.slice(0, 200) || "Untitled chart",
      description: doc.subtitle.slice(0, 500) || null,
      chart_type: doc.chartType,
      config: { ...rest, spec },
      data: body,
      author_id: auth.user.id,
      is_published: true,
    })
    .select("id")
    .single();
  if (error || !data) return { ok: false, error: error?.message ?? "Unknown error" };
  return { ok: true, id: (data as { id: string }).id };
}

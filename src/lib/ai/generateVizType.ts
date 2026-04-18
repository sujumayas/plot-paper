"use client";

import { getBrowserClient } from "@/lib/supabase/client";
import { resolveVizFromRow } from "@/lib/viz/resolveViz";
import type { VizCatalogEntry } from "@/lib/viz/types";

export async function uploadReferenceImage(
  file: File,
  userId: string,
): Promise<string | null> {
  const supa = getBrowserClient();
  const ext = file.name.split(".").pop() ?? "png";
  const path = `${userId}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supa.storage
    .from("ai-refs")
    .upload(path, file, { contentType: file.type || "image/png" });
  if (error) return null;
  const { data } = await supa.storage
    .from("ai-refs")
    .createSignedUrl(path, 60 * 60 * 24); // 24h
  return data?.signedUrl ?? null;
}

export async function generateVizType(params: {
  prompt: string;
  referenceImageUrl?: string;
}): Promise<
  | { ok: true; viz: VizCatalogEntry }
  | { ok: false; error: string }
> {
  const supa = getBrowserClient();
  const { data, error } = await supa.functions.invoke(
    "generate-viz-type",
    { body: params },
  );
  if (error) return { ok: false, error: error.message };
  const payload = data as { vizType?: unknown; error?: string } | null;
  if (!payload) return { ok: false, error: "Empty response" };
  if (payload.error) return { ok: false, error: payload.error };
  if (!payload.vizType) return { ok: false, error: "No vizType returned" };
  try {
    const viz = resolveVizFromRow(payload.vizType as never);
    return { ok: true, viz };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Could not resolve viz",
    };
  }
}

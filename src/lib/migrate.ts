"use client";

import { getBrowserClient } from "./supabase/client";
import { clearDraft, loadDraft } from "./draft";

/**
 * Runs once after the user signs in for the first time on a given device.
 * Copies localStorage state (draft + custom vizzes + liked graphs) into their account,
 * then clears those keys. Keeps `pp-tweaks` (UI preference).
 */
export async function migrateLocalState(userId: string): Promise<void> {
  if (typeof window === "undefined") return;
  const supa = getBrowserClient();

  // 1. Draft → insert as unpublished graph if it has real data.
  const draft = loadDraft();
  if (draft && draft.data.length > 0) {
    try {
      // Resolve draft.vizId → viz_types row. Draft vizId might be either a seed slug or a UUID.
      let vizTypeId: string | null = null;
      const { data: bySlug } = await supa
        .from("viz_types")
        .select("id")
        .eq("slug", draft.vizId)
        .is("owner_id", null)
        .maybeSingle();
      if (bySlug) {
        vizTypeId = (bySlug as { id: string }).id;
      } else {
        const { data: byId } = await supa
          .from("viz_types")
          .select("id")
          .eq("id", draft.vizId)
          .maybeSingle();
        if (byId) vizTypeId = (byId as { id: string }).id;
      }
      if (vizTypeId) {
        await supa.from("graphs").insert({
          title: draft.title || "Untitled graph",
          viz_type_id: vizTypeId,
          data: draft.data,
          author_id: userId,
          is_published: false,
        });
      }
    } catch {
      /* swallow — migration best-effort */
    }
  }

  // 2. Custom viz types cached locally (future — Phase 7 writes these).
  try {
    const raw = localStorage.getItem("pp-custom-vizzes");
    if (raw) {
      const items = JSON.parse(raw);
      if (Array.isArray(items)) {
        for (const v of items) {
          if (!v || typeof v !== "object") continue;
          try {
            const { data: inserted } = await supa
              .from("viz_types")
              .insert({
                slug: v.slug ?? `custom-${crypto.randomUUID().slice(0, 7)}`,
                name: v.name ?? "Untitled type",
                description: v.desc ?? null,
                category: v.category ?? "Custom",
                base_renderer_id: v.baseRendererId ?? "bar",
                columns: v.columns ?? [],
                sample: v.sample ?? [],
                owner_id: userId,
                is_public: false,
              })
              .select("id")
              .single();
            const insertedRow = inserted as { id: string } | null;
            if (insertedRow) {
              await supa.from("saved_types").insert({
                user_id: userId,
                viz_type_id: insertedRow.id,
              });
            }
          } catch {
            /* continue */
          }
        }
      }
      localStorage.removeItem("pp-custom-vizzes");
    }
  } catch {
    /* ignore */
  }

  // 3. Liked graphs cached locally.
  try {
    const raw = localStorage.getItem("pp-liked-graphs");
    if (raw) {
      const ids = JSON.parse(raw);
      if (Array.isArray(ids)) {
        for (const id of ids) {
          if (typeof id !== "string") continue;
          try {
            await supa.rpc("toggle_like", { graph_id: id });
          } catch {
            /* continue */
          }
        }
      }
      localStorage.removeItem("pp-liked-graphs");
    }
  } catch {
    /* ignore */
  }

  // 4. Clear draft (it's now a graph row).
  clearDraft();
}

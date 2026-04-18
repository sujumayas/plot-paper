import { glyphForRenderer, SEED_CATALOG } from "./catalog";
import type { VizTypeRow } from "@/lib/supabase/types";
import type { BaseRendererId, VizCatalogEntry, VizCategory } from "./types";

const ALLOWED_CATEGORIES: VizCategory[] = [
  "Comparison",
  "Trends",
  "Composition",
  "Relationships",
  "Distribution",
  "Headline",
  "Planning",
  "Custom",
];

function coerceCategory(c: string): VizCategory {
  return (ALLOWED_CATEGORIES as string[]).includes(c)
    ? (c as VizCategory)
    : "Custom";
}

export function resolveVizFromRow(row: VizTypeRow): VizCatalogEntry {
  const baseRendererId = row.base_renderer_id as BaseRendererId;
  const glyph = glyphForRenderer(baseRendererId);
  return {
    id: row.id,
    name: row.name,
    desc: row.description ?? "",
    category: coerceCategory(row.category),
    glyph,
    columns: row.columns,
    sample: row.sample,
    baseRendererId,
    isCustom: row.owner_id !== null,
    ownerId: row.owner_id,
  };
}

export { SEED_CATALOG };

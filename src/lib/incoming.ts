import { sanitizeDoc } from "./viz/engine";
import { validateSpec } from "./viz/spec/validate";
import type { PlotSpec } from "./viz/spec/types";
import type { ChartDoc } from "./viz/types";

/**
 * Hands a chart from another page (e.g. a community remix) to the editor without
 * touching the autosaved draft. Uses sessionStorage so it never outlives the tab.
 */
const KEY = "pp-incoming-v1";

export function stashIncoming(doc: ChartDoc, spec?: unknown): boolean {
  try {
    window.sessionStorage.setItem(KEY, JSON.stringify({ doc, spec: spec ?? null }));
    return true;
  } catch {
    return false;
  }
}

export function takeIncoming(): { doc: ChartDoc; spec: PlotSpec | null } | null {
  try {
    const raw = window.sessionStorage.getItem(KEY);
    window.sessionStorage.removeItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { doc?: unknown; spec?: unknown };
    if (!parsed?.doc || typeof parsed.doc !== "object" || !Array.isArray((parsed.doc as ChartDoc).data)) return null;
    return { doc: sanitizeDoc(parsed.doc as ChartDoc), spec: parsed.spec ? validateSpec(parsed.spec).spec ?? null : null };
  } catch {
    return null;
  }
}

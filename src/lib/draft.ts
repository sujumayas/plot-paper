import type { VizRow } from "@/lib/viz/types";

export type Draft = {
  vizId: string;
  title: string;
  data: VizRow[];
};

const KEY = "pp-draft";

export function loadDraft(): Draft | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (
      parsed &&
      typeof parsed.vizId === "string" &&
      Array.isArray(parsed.data) &&
      typeof parsed.title === "string"
    ) {
      return parsed as Draft;
    }
  } catch {
    /* ignore */
  }
  return null;
}

export function saveDraft(draft: Draft): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(KEY, JSON.stringify(draft));
  } catch {
    /* ignore */
  }
}

export function clearDraft(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}

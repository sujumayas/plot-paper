/** Tiny, crash-proof localStorage helpers (private mode, quota, SSR). */

export const KEYS = {
  doc: "pp-doc-v2",
  /** The draft that an opened link/example replaced, until restored or dismissed. */
  docPrev: "pp-doc-prev-v1",
  /** Set while the saved draft is a link/example the user hasn't edited yet. */
  docPristine: "pp-doc-pristine-v1",
  customTypes: "pp-custom-types-v1",
  myCharts: "pp-my-charts-v1",
  studioDraft: "pp-studio-draft-v1",
} as const;

export function readJSON<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

/** Returns false when the value could not be stored (e.g. quota exceeded). */
export function writeJSON(key: string, value: unknown): boolean {
  if (typeof window === "undefined") return false;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

export function removeKey(key: string) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(key);
  } catch {
    /* ignore */
  }
}

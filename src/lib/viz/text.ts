/**
 * Text measurement without a DOM (works on the server and in exports).
 * Uses per-character width classes averaged over common sans fonts; good to
 * within ~8%, which is enough for truncation and layout decisions.
 */
const NARROW = new Set("iljtfrI.,:;'!|()[]{} ");
const WIDE = new Set("mwMWO@%&QGDHNU");

/**
 * Relative width of the active font vs. the Inter-like baseline. The poster sets
 * it for the duration of a (synchronous) render; see `withMeasureFactor`.
 */
let measureFactor = 1;

export function withMeasureFactor<T>(factor: number, fn: () => T): T {
  const prev = measureFactor;
  measureFactor = factor;
  try {
    return fn();
  } finally {
    measureFactor = prev;
  }
}

export function textWidth(text: string, fontSize: number, weight = 400, mono = false): number {
  if (mono) return text.length * fontSize * 0.6;
  return rawWidth(text, fontSize, weight) * measureFactor;
}

function rawWidth(text: string, fontSize: number, weight: number): number {
  let w = 0;
  for (const ch of text) {
    if (NARROW.has(ch)) w += 0.3;
    else if (WIDE.has(ch)) w += 0.82;
    else if (ch >= "A" && ch <= "Z") w += 0.66;
    else if (ch >= "0" && ch <= "9") w += 0.57;
    else if (ch.charCodeAt(0) > 0x2e80) w += 1; // CJK
    else w += 0.54;
  }
  return w * fontSize * (weight >= 600 ? 1.06 : 1);
}

/** Truncates with an ellipsis so the text fits `maxWidth`. */
export function truncate(text: string, maxWidth: number, fontSize: number, weight = 400): string {
  const s = String(text ?? "");
  if (maxWidth <= 0) return "";
  if (textWidth(s, fontSize, weight) <= maxWidth + 0.5) return s;
  const chars = Array.from(s);
  let lo = 0;
  let hi = chars.length;
  while (lo < hi) {
    const mid = Math.ceil((lo + hi) / 2);
    if (textWidth(chars.slice(0, mid).join("") + "…", fontSize, weight) <= maxWidth) lo = mid;
    else hi = mid - 1;
  }
  return lo <= 0 ? "…" : chars.slice(0, lo).join("").trimEnd() + "…";
}

/** Greedy word wrap into at most `maxLines` lines (last line truncated). */
export function wrapText(text: string, maxWidth: number, fontSize: number, maxLines = 2, weight = 400): string[] {
  const words = String(text ?? "").split(/\s+/).filter(Boolean);
  if (!words.length) return [];
  const lines: string[] = [];
  let cur = "";
  for (let i = 0; i < words.length; i++) {
    const w = words[i];
    const next = cur ? cur + " " + w : w;
    if (textWidth(next, fontSize, weight) <= maxWidth || !cur) {
      cur = next;
    } else {
      lines.push(cur);
      cur = w;
      if (lines.length === maxLines - 1) {
        cur = words.slice(i).join(" ");
        break;
      }
    }
  }
  if (cur) lines.push(cur);
  if (lines.length > maxLines) lines.length = maxLines;
  lines[lines.length - 1] = truncate(lines[lines.length - 1], maxWidth, fontSize, weight);
  return lines.map((l) => (textWidth(l, fontSize, weight) > maxWidth ? truncate(l, maxWidth, fontSize, weight) : l));
}

/** Makes column names readable: "gdp_per_capita" → "gdp per capita". */
export function pretty(name: string | undefined): string {
  return String(name ?? "").replace(/[_]+/g, " ").replace(/\s+/g, " ").trim();
}

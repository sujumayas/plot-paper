import type { ChartDoc } from "../types";

/** A safe, readable file name from the chart title ("Año 2024: ventas" → "ano-2024-ventas"). */
export function fileBase(doc: Pick<ChartDoc, "title">): string {
  const base = (doc.title || "chart")
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
  return base || "chart";
}

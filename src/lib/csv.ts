import type { VizCatalogEntry, VizRow } from "@/lib/viz/types";

type ParseResult = { headers: string[]; data: VizRow[] };

export const CSVUtil = {
  parse(text: string): ParseResult {
    const rows: string[][] = [];
    let cur: string[] = [];
    let field = "";
    let inQuotes = false;
    for (let i = 0; i < text.length; i++) {
      const c = text[i];
      const n = text[i + 1];
      if (inQuotes) {
        if (c === '"' && n === '"') {
          field += '"';
          i++;
        } else if (c === '"') {
          inQuotes = false;
        } else {
          field += c;
        }
      } else {
        if (c === '"') inQuotes = true;
        else if (c === ",") {
          cur.push(field);
          field = "";
        } else if (c === "\n") {
          cur.push(field);
          rows.push(cur);
          cur = [];
          field = "";
        } else if (c === "\r") {
          /* skip */
        } else field += c;
      }
    }
    if (field.length || cur.length) {
      cur.push(field);
      rows.push(cur);
    }
    if (!rows.length) return { headers: [], data: [] };
    const headers = rows[0].map((h) => h.trim());
    const data = rows
      .slice(1)
      .filter((r) => r.some((c) => c && c.trim() !== ""))
      .map((r) => {
        const o: VizRow = {};
        headers.forEach((h, i) => {
          const v = (r[i] ?? "").trim();
          const n = parseFloat(v);
          const stripped = v.replace(/^0+(?=\d)/, "");
          o[h] =
            v !== "" && !isNaN(n) && String(n) === stripped
              ? n
              : v !== "" && !isNaN(n)
                ? n
                : v;
        });
        return o;
      });
    return { headers, data };
  },

  stringify(headers: string[], data: VizRow[]): string {
    const escape = (v: unknown) => {
      if (v === null || v === undefined) return "";
      const s = String(v);
      if (s.includes(",") || s.includes('"') || s.includes("\n")) {
        return '"' + s.replace(/"/g, '""') + '"';
      }
      return s;
    };
    const lines = [headers.map(escape).join(",")];
    for (const row of data) {
      lines.push(headers.map((h) => escape(row[h])).join(","));
    }
    return lines.join("\n");
  },

  templateFor(viz: VizCatalogEntry): string {
    const headers = viz.columns.map((c) => c.name);
    const sample = viz.sample.slice(0, 3);
    return CSVUtil.stringify(headers, sample);
  },

  /** Coerce a parsed row into the viz's declared schema (numeric columns → number). */
  coerceToSchema(viz: VizCatalogEntry, rows: VizRow[]): VizRow[] {
    return rows.map((row) => {
      const o: VizRow = { ...row };
      viz.columns.forEach((c) => {
        if (c.type === "number" && o[c.name] !== undefined) {
          const n = parseFloat(
            String(o[c.name]).replace(/[,\s$€£]/g, ""),
          );
          if (!isNaN(n)) o[c.name] = n;
        }
      });
      return o;
    });
  },
};

import { autoMap, coerceRows, inferType, parseNumber, safeKey, toCSV } from "./data";
import type { Cell, ChartDefinition, ChartDoc, ColumnInfo, DataRow, Mapping } from "./types";

/** Pure, immutable operations on a chart document (used by the editor + tests). */

export function withData(doc: ChartDoc, def: ChartDefinition, columns: ColumnInfo[], rows: DataRow[]): ChartDoc {
  return { ...doc, columns, data: coerceRows(rows, columns), mapping: autoMap(def, columns, doc.mapping) };
}

function retype(doc: ChartDoc, colName: string): ChartDoc {
  const type = inferType(doc.data.map((r) => r[colName]));
  const columns = doc.columns.map((c) => (c.name === colName ? { ...c, type } : c));
  const data = type === "number" ? doc.data.map((r) => ({ ...r, [colName]: parseNumber(r[colName]) ?? r[colName] })) : doc.data;
  return { ...doc, columns, data };
}

export function setCell(doc: ChartDoc, rowIndex: number, colName: string, raw: string): ChartDoc {
  if (rowIndex < 0 || rowIndex >= doc.data.length) return doc;
  const col = doc.columns.find((c) => c.name === colName);
  if (!col) return doc;
  const trimmed = raw.trim();
  let value: Cell = trimmed === "" ? null : trimmed;
  if (col.type === "number" && trimmed !== "") value = parseNumber(trimmed) ?? trimmed;
  const data = doc.data.slice();
  data[rowIndex] = { ...data[rowIndex], [colName]: value };
  return retype({ ...doc, data }, colName);
}

export function addRow(doc: ChartDoc): ChartDoc {
  const row: DataRow = {};
  for (const c of doc.columns) row[c.name] = null;
  return { ...doc, data: [...doc.data, row] };
}

export function deleteRow(doc: ChartDoc, index: number): ChartDoc {
  return { ...doc, data: doc.data.filter((_, i) => i !== index) };
}

export function uniqueColumnName(doc: ChartDoc, raw: string): string {
  const base = safeKey(raw);
  const names = new Set(doc.columns.map((c) => c.name));
  if (!names.has(base)) return base;
  let i = 2;
  while (names.has(`${base}_${i}`)) i++;
  return `${base}_${i}`;
}

export function addColumn(doc: ChartDoc, base = "column"): ChartDoc {
  const name = uniqueColumnName(doc, base);
  return {
    ...doc,
    columns: [...doc.columns, { name, type: "string" }],
    data: doc.data.map((r) => ({ ...r, [name]: null })),
  };
}

function mapMapping(mapping: Mapping, fn: (name: string) => string | null): Mapping {
  const out: Mapping = {};
  for (const [k, v] of Object.entries(mapping)) {
    if (Array.isArray(v)) {
      const list = v.map(fn).filter((x): x is string => !!x);
      if (list.length) out[k] = list;
    } else if (v) {
      const n = fn(v);
      if (n) out[k] = n;
    }
  }
  return out;
}

export function deleteColumn(doc: ChartDoc, name: string): ChartDoc {
  return {
    ...doc,
    columns: doc.columns.filter((c) => c.name !== name),
    data: doc.data.map((r) => {
      const { [name]: _drop, ...rest } = r;
      return rest;
    }),
    mapping: mapMapping(doc.mapping, (n) => (n === name ? null : n)),
  };
}

export function renameColumn(doc: ChartDoc, from: string, toRaw: string): ChartDoc {
  const to = safeKey(toRaw.trim());
  if (!to || to === from) return doc;
  if (doc.columns.some((c) => c.name === to)) return doc;
  return {
    ...doc,
    columns: doc.columns.map((c) => (c.name === from ? { ...c, name: to } : c)),
    data: doc.data.map((r) => {
      const o: DataRow = {};
      for (const [k, v] of Object.entries(r)) o[k === from ? to : k] = v;
      return o;
    }),
    mapping: mapMapping(doc.mapping, (n) => (n === from ? to : n)),
  };
}

export function docToCSV(doc: ChartDoc): string {
  return toCSV(
    doc.columns.map((c) => c.name),
    doc.data,
  );
}

/** A small CSV with the chart's sample columns and a few rows — a fill-in template. */
export function templateCSV(def: ChartDefinition): string {
  const rows = def.sample.rows.slice(0, 5);
  const cols = Object.keys(rows[0] ?? {});
  return toCSV(cols, rows);
}

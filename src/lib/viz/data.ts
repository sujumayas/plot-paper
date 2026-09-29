import type {
  Cell,
  ChartDefinition,
  ColumnInfo,
  ColumnType,
  DataRow,
  FieldDef,
  Mapping,
} from "./types";

/* ─────────────────────────────────────────────────────────────
 * Numbers
 * ───────────────────────────────────────────────────────────── */

const NULL_TOKENS = new Set(["", "-", "—", "–", "na", "n/a", "nan", "null", "none", "nil", "#n/a", "?"]);

/**
 * Parses messy human numbers: "1,234.5", "1.234,5", "$ 1 200", "12%", "(300)",
 * "−4", "1e6", "2.5k". Returns null when the value is not a number.
 */
export function parseNumber(v: Cell | boolean, decimal?: "." | ","): number | null {
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  if (typeof v === "boolean") return v ? 1 : 0;
  if (v === null || v === undefined) return null;
  let s = String(v).trim();
  if (NULL_TOKENS.has(s.toLowerCase())) return null;

  let negative = false;
  if (/^\(.*\)$/.test(s)) {
    negative = true;
    s = s.slice(1, -1);
  }
  s = s.replace(/[−‒–]/g, "-"); // unicode minus / dashes
  // Currency symbols and known ISO codes (USD, PEN, EUR…), before or after, then
  // whitespace (incl. non-breaking & thin spaces).
  s = s.replace(CURRENCY_PREFIX, "").replace(CURRENCY_SUFFIX, "");
  s = s.replace(/[\s\u00a0\u2009\u202f]/g, "");
  if (s.startsWith("-")) {
    negative = !negative;
    s = s.slice(1);
  } else if (s.startsWith("+")) {
    s = s.slice(1);
  }
  s = s.replace(CURRENCY_PREFIX, "");

  let mult = 1;
  const suffix = s.match(/([kmbt%])$/i);
  if (suffix) {
    const c = suffix[1].toLowerCase();
    mult = c === "k" ? 1e3 : c === "m" ? 1e6 : c === "b" ? 1e9 : c === "t" ? 1e12 : 1;
    s = s.slice(0, -1);
  }
  if (s === "" || !/^[\d.,]*\d[\d.,]*(?:e[+-]?\d+)?$/i.test(s)) return null;

  const exp = s.match(/e[+-]?\d+$/i)?.[0] ?? "";
  const body = s.slice(0, s.length - exp.length);
  // The column's separator wins; values that contradict it fall back to a per-value guess.
  const plain = (decimal ? toPlainNumber(body, decimal) : null) ?? toPlainNumber(body, guessDecimal(body));
  if (plain === null) return null;
  const n = Number(plain + exp);
  if (!Number.isFinite(n)) return null;
  const out = n * mult;
  return negative ? -out : out;
}

const CURRENCY_CODES =
  "USD|EUR|GBP|JPY|CNY|RMB|CHF|CAD|AUD|NZD|HKD|SGD|TWD|INR|PKR|BDT|LKR|IDR|MYR|PHP|THB|VND|KRW|RUB|UAH|TRY|ILS|AED|SAR|QAR|KWD|EGP|NGN|KES|GHS|MAD|ZAR|SEK|NOK|DKK|ISK|PLN|CZK|HUF|RON|BGN|MXN|BRL|ARS|CLP|COP|PEN|UYU|BOB|PYG|VES|DOP|GTQ|CRC|HNL|NIO|PAB|CUP|JMD|TTD|BTC|ETH";
const CURRENCY_SYMBOLS = "$€£¥₹₩₽₺₫₱฿";
const CURRENCY_PREFIX = new RegExp(`^(?:US\\$|R\\$|S\\/\\.?|(?:${CURRENCY_CODES})(?![A-Za-z])|[${CURRENCY_SYMBOLS}])\\s*`);
const CURRENCY_SUFFIX = new RegExp(`\\s*(?:[${CURRENCY_SYMBOLS}]|(?<![A-Za-z])(?:${CURRENCY_CODES}))$`);

/** Picks the decimal separator of a lone value ("1,234" → thousands, "1,5" → decimal). */
function guessDecimal(body: string): "." | "," {
  const comma = body.includes(",");
  const dot = body.includes(".");
  if (comma && dot) return body.lastIndexOf(",") > body.lastIndexOf(".") ? "," : ".";
  if (comma) {
    const parts = body.split(",");
    return parts.length > 2 || (parts.length === 2 && /^\d{1,3}$/.test(parts[0]) && /^\d{3}$/.test(parts[1])) ? "." : ",";
  }
  if (dot && body.split(".").length > 2) return ","; // 1.234.567
  return ".";
}

/**
 * "1.234.567,5" with decimal "," → "1234567.5". Thousand separators must form
 * proper groups of three, so "1.2.3" or "12,34,5" are rejected (null).
 */
function toPlainNumber(body: string, decimal: "." | ","): string | null {
  const thousands = decimal === "." ? "," : ".";
  const at = body.lastIndexOf(decimal);
  let int = at < 0 ? body : body.slice(0, at);
  const frac = at < 0 ? "" : body.slice(at + 1);
  if (frac && !/^\d+$/.test(frac)) return null;
  if (int.includes(thousands)) {
    // 1,234,567 · 1.234.567 · Indian 12,34,567
    const grouped = thousands === "," ? /^(?:\d{1,3}(?:,\d{3})+|\d{1,2}(?:,\d{2})*,\d{3})$/ : /^\d{1,3}(?:\.\d{3})+$/;
    if (!grouped.test(int)) return null;
    int = int.split(thousands).join("");
  } else if (int && !/^\d+$/.test(int)) return null;
  if (!int && !frac) return null;
  return `${int || "0"}${frac ? `.${frac}` : ""}`;
}

/**
 * Detects a column's decimal separator from unambiguous values
 * ("1.234,5" or "980,40" → comma; "1,234.5" or "12.75" → dot).
 */
export function detectDecimal(values: Cell[]): "." | "," | null {
  let comma = 0;
  let dot = 0;
  for (const v of values.slice(0, 2000)) {
    if (typeof v !== "string") continue;
    const s = v.replace(/[^\d.,]/g, "");
    if (/\d\.\d{3},\d/.test(s) || /,\d{1,2}$/.test(s) || /,\d{4,}$/.test(s)) comma++;
    else if (/\d,\d{3}\.\d/.test(s) || /\.\d{1,2}$/.test(s) || /\.\d{4,}$/.test(s)) dot++;
  }
  if (comma > dot) return ",";
  if (dot > comma) return ".";
  return null;
}

/* ─────────────────────────────────────────────────────────────
 * CSV / TSV
 * ───────────────────────────────────────────────────────────── */

export type ParsedTable = {
  headers: string[];
  rows: string[][];
  delimiter: string;
  warnings: string[];
};

export const MAX_ROWS = 50_000;
/** Delimiter returned for single-column text; it never appears in real data. */
export const SINGLE_COLUMN = "\u001f";
export const MAX_COLUMNS = 200;

export function detectDelimiter(text: string): string {
  const sample = text.slice(0, 10_000).split(/\r?\n/).slice(0, 20).filter((l) => l.trim());
  if (!sample.length) return ",";
  const candidates = [",", ";", "\t", "|"];
  // No candidate in the header → a single column (don't split "1,234" values).
  let best = SINGLE_COLUMN;
  let bestScore = -1;
  for (const d of candidates) {
    const counts = sample.map((line) => countOutsideQuotes(line, d));
    const first = counts[0];
    if (first === 0) continue;
    const consistent = counts.filter((c) => c === first).length / counts.length;
    const score = first * consistent;
    if (score > bestScore) {
      bestScore = score;
      best = d;
    }
  }
  return best;
}

function countOutsideQuotes(line: string, d: string): number {
  let n = 0;
  let q = false;
  for (const c of line) {
    if (c === '"') q = !q;
    else if (c === d && !q) n++;
  }
  return n;
}

/** RFC-4180-ish parser with delimiter detection, BOM stripping and quoted newlines. */
export function parseDelimited(input: string, delimiter?: string): ParsedTable {
  const warnings: string[] = [];
  const text = input.replace(/^﻿/, "");
  const d = delimiter ?? detectDelimiter(text);
  const rows: string[][] = [];
  let cur: string[] = [];
  let field = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else inQuotes = false;
      } else field += c;
      continue;
    }
    if (c === '"' && field.trim() === "") {
      field = "";
      inQuotes = true;
    } else if (c === d) {
      cur.push(field);
      field = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      cur.push(field);
      rows.push(cur);
      cur = [];
      field = "";
    } else field += c;
  }
  if (inQuotes) warnings.push("unterminated-quote");
  if (field.length || cur.length) {
    cur.push(field);
    rows.push(cur);
  }
  const nonEmpty = rows.filter((r) => r.some((c) => c.trim() !== ""));
  if (!nonEmpty.length) return { headers: [], rows: [], delimiter: d, warnings };

  let headers = nonEmpty[0].map((h) => h.trim());
  if (headers.length > MAX_COLUMNS) {
    warnings.push("too-many-columns");
    headers = headers.slice(0, MAX_COLUMNS);
  }
  headers = dedupeHeaders(headers);
  let body = nonEmpty.slice(1);
  if (body.length > MAX_ROWS) {
    warnings.push("truncated-rows");
    body = body.slice(0, MAX_ROWS);
  }
  const width = headers.length;
  let ragged = false;
  const out = body.map((r) => {
    if (r.length !== width) ragged = true;
    const row = r.slice(0, width).map((c) => c.trim());
    while (row.length < width) row.push("");
    return row;
  });
  if (ragged) warnings.push("ragged-rows");
  return { headers, rows: out, delimiter: d, warnings };
}

/** Keys that would clash with JavaScript object internals if used as column names. */
export const RESERVED_KEYS: ReadonlySet<string> = new Set(["__proto__", "constructor", "prototype"]);

/** Makes a column name safe to use as an object key ("__proto__" → "__proto___col"). */
export const safeKey = (name: string) => (RESERVED_KEYS.has(name) ? `${name}_col` : name);

/** Unique, non-empty, safe column names: ["a", "a", "a_2"] → ["a", "a_2", "a_2_2"]. */
export function dedupeHeaders(headers: string[]): string[] {
  const used = new Set<string>();
  return headers.map((h, i) => {
    const base = safeKey(h || `column_${i + 1}`);
    let name = base;
    for (let n = 2; used.has(name); n++) name = `${base}_${n}`;
    used.add(name);
    return name;
  });
}

export function toCSV(columns: string[], rows: DataRow[], delimiter = ","): string {
  const esc = (v: Cell) => {
    if (v === null || v === undefined) return "";
    const s = String(v);
    return /[",\n\r;\t|]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [columns.map(esc).join(delimiter), ...rows.map((r) => columns.map((c) => esc(r[c])).join(delimiter))].join("\n");
}

/* ─────────────────────────────────────────────────────────────
 * Type inference
 * ───────────────────────────────────────────────────────────── */

const DATE_RE =
  /^(?:\d{4}-\d{1,2}(?:-\d{1,2})?(?:[T ]\d{1,2}:\d{2}(?::\d{2})?(?:\.\d+)?(?:Z|[+-]\d{2}:?\d{2})?)?|\d{1,2}[/.]\d{1,2}[/.]\d{2,4})$/;

export function inferType(values: Cell[]): ColumnType {
  const present = values.filter((v) => v !== null && v !== undefined && String(v).trim() !== "");
  if (!present.length) return "string";
  const sample = present.length > 500 ? present.filter((_, i) => i % Math.ceil(present.length / 500) === 0) : present;
  let nums = 0;
  let dates = 0;
  for (const v of sample) {
    if (typeof v === "string" && DATE_RE.test(v.trim())) dates++;
    else if (parseNumber(v) !== null) nums++;
  }
  if (dates / sample.length >= 0.8) return "date";
  if (nums / sample.length >= 0.8) return "number";
  return "string";
}

/** Turns a parsed table into typed rows (numbers become numbers, blanks become null). */
export function typeTable(table: { headers: string[]; rows: Cell[][] }): {
  columns: ColumnInfo[];
  rows: DataRow[];
} {
  const columns: ColumnInfo[] = table.headers.map((name, i) => ({
    name,
    type: inferType(table.rows.map((r) => r[i])),
  }));
  const decimals = columns.map((c, i) => (c.type === "number" ? detectDecimal(table.rows.map((r) => r[i])) ?? undefined : undefined));
  const rows = table.rows.map((r) => {
    const o: DataRow = {};
    columns.forEach((c, i) => {
      const raw = r[i];
      if (c.type === "number") o[c.name] = parseNumber(raw, decimals[i]);
      else o[c.name] = raw === undefined || raw === null || String(raw).trim() === "" ? null : String(raw).trim();
    });
    return o;
  });
  return { columns, rows };
}

/** Infers columns from existing row objects (e.g. imported JSON). */
export function inferColumns(rows: DataRow[], order?: string[]): ColumnInfo[] {
  const names: string[] = order ? [...order] : [];
  const seen = new Set(names);
  for (const r of rows.slice(0, 1000)) {
    for (const k of Object.keys(r)) {
      if (!seen.has(k) && !RESERVED_KEYS.has(k)) {
        seen.add(k);
        names.push(k);
      }
    }
  }
  return names.map((name) => ({ name, type: inferType(rows.map((r) => r[name])) }));
}

export function parseTextToTable(text: string): {
  columns: ColumnInfo[];
  rows: DataRow[];
  warnings: string[];
} {
  const trimmed = text.trim();
  if (trimmed.startsWith("[") || trimmed.startsWith("{")) {
    const fromJson = parseJSONRows(trimmed);
    if (fromJson) return { ...fromJson, warnings: [] };
  }
  const parsed = parseDelimited(text);
  const typed = typeTable(parsed);
  return { ...typed, warnings: parsed.warnings };
}

/** Accepts `[{...}]`, `{data:[...]}` or `{columns:[...], rows:[[...]]}`. */
export function parseJSONRows(text: string): { columns: ColumnInfo[]; rows: DataRow[] } | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return null;
  }
  let rows: unknown = parsed;
  if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
    const o = parsed as Record<string, unknown>;
    if (Array.isArray(o.data)) rows = o.data;
    else if (Array.isArray(o.rows) && Array.isArray(o.columns)) {
      const cols = dedupeHeaders(
        (o.columns as unknown[]).slice(0, MAX_COLUMNS).map((c) => (typeof c === "string" ? c : String((c as { name?: string })?.name ?? ""))),
      );
      rows = (o.rows as unknown[]).map((r) =>
        Array.isArray(r) ? Object.fromEntries(cols.map((c, i) => [c, r[i]])) : r,
      );
    }
  }
  if (!Array.isArray(rows)) return null;
  const clean: DataRow[] = rows
    .filter((r): r is Record<string, unknown> => !!r && typeof r === "object" && !Array.isArray(r))
    .slice(0, MAX_ROWS)
    .map((r) => {
      const o: DataRow = {};
      for (const [k, v] of Object.entries(r).slice(0, MAX_COLUMNS)) {
        o[safeKey(k)] = typeof v === "number" || typeof v === "string" || v === null ? v : v === undefined ? null : String(v);
      }
      return o;
    });
  const columns = inferColumns(clean);
  return { columns, rows: coerceRows(clean, columns) };
}

/** Coerces values of numeric columns to numbers. */
export function coerceRows(rows: DataRow[], columns: ColumnInfo[]): DataRow[] {
  const numeric = columns.filter((c) => c.type === "number").map((c) => c.name);
  if (!numeric.length) return rows;
  return rows.map((r) => {
    const o = { ...r };
    for (const n of numeric) o[n] = parseNumber(o[n]);
    return o;
  });
}

/* ─────────────────────────────────────────────────────────────
 * Mapping (columns → chart fields)
 * ───────────────────────────────────────────────────────────── */

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");

function fits(field: FieldDef, col: ColumnInfo): boolean {
  if (field.type === "any") return true;
  if (field.type === "number") return col.type === "number";
  return true; // string fields accept any column (numbers become labels)
}

/**
 * Picks sensible columns for each field: exact name matches first, then the
 * first unused column of a compatible type. `multiple` fields take every
 * remaining numeric column (up to 8).
 */
export function autoMap(def: Pick<ChartDefinition, "fields">, columns: ColumnInfo[], prev?: Mapping): Mapping {
  const used = new Set<string>();
  const mapping: Mapping = {};
  const byName = new Map(columns.map((c) => [norm(c.name), c]));
  const colNames = new Set(columns.map((c) => c.name));

  // 1. keep previous choices that are still valid
  if (prev) {
    for (const f of def.fields) {
      const p = prev[f.key];
      if (f.multiple) {
        const list = (Array.isArray(p) ? p : p ? [p] : []).filter((n) => colNames.has(n));
        const valid = list.filter((n) => fits(f, columns.find((c) => c.name === n)!));
        if (valid.length) {
          mapping[f.key] = valid;
          valid.forEach((n) => used.add(n));
        }
      } else if (typeof p === "string" && colNames.has(p) && fits(f, columns.find((c) => c.name === p)!)) {
        mapping[f.key] = p;
        used.add(p);
      }
    }
  }
  // 2. exact name matches
  for (const f of def.fields) {
    if (mapping[f.key] !== undefined) continue;
    const exact = byName.get(norm(f.key));
    if (exact && !used.has(exact.name) && fits(f, exact)) {
      mapping[f.key] = f.multiple ? [exact.name] : exact.name;
      used.add(exact.name);
    }
  }
  // 3. first compatible (strings prefer string/date columns); required fields first
  const ordered = [...def.fields.filter((f) => f.required !== false), ...def.fields.filter((f) => f.required === false)];
  for (const f of ordered) {
    if (f.multiple) continue;
    if (mapping[f.key] !== undefined) continue;
    const pref =
      f.type === "string"
        ? columns.find((c) => !used.has(c.name) && c.type !== "number") ??
          columns.find((c) => !used.has(c.name))
        : columns.find((c) => !used.has(c.name) && fits(f, c));
    if (!pref) continue;
    // Optional fields never steal columns from a multi-series field.
    if (f.required === false && def.fields.some((g) => g.multiple)) continue;
    mapping[f.key] = pref.name;
    used.add(pref.name);
  }
  // 4. multiple fields take remaining numeric columns
  for (const f of def.fields) {
    if (!f.multiple) continue;
    const current = (mapping[f.key] as string[] | undefined) ?? [];
    if (current.length && prev?.[f.key]) continue;
    const extra = columns.filter((c) => !used.has(c.name) && fits(f, c)).map((c) => c.name);
    const all = [...current, ...extra].slice(0, 8);
    all.forEach((n) => used.add(n));
    if (all.length) mapping[f.key] = all;
  }
  return mapping;
}

export type MappingIssue = { field: string; kind: "missing" | "type" };

export function mappingIssues(def: Pick<ChartDefinition, "fields">, mapping: Mapping, columns: ColumnInfo[]): MappingIssue[] {
  const issues: MappingIssue[] = [];
  for (const f of def.fields) {
    const m = mapping[f.key];
    const list = Array.isArray(m) ? m : m ? [m] : [];
    const existing = list.filter((n) => columns.some((c) => c.name === n));
    if (!existing.length) {
      if (f.required !== false) issues.push({ field: f.key, kind: "missing" });
      continue;
    }
    if (f.type === "number" && existing.some((n) => columns.find((c) => c.name === n)?.type !== "number")) {
      issues.push({ field: f.key, kind: "type" });
    }
  }
  return issues;
}

/* ─────────────────────────────────────────────────────────────
 * Aggregation helpers used by category charts
 * ───────────────────────────────────────────────────────────── */

export type Aggregate = "sum" | "mean" | "max" | "min" | "count" | "first";

export function aggregate(values: number[], how: Aggregate): number {
  if (how === "count") return values.length;
  if (!values.length) return 0;
  switch (how) {
    case "sum":
      return values.reduce((a, b) => a + b, 0);
    case "mean":
      return values.reduce((a, b) => a + b, 0) / values.length;
    case "max":
      return values.reduce((a, b) => (b > a ? b : a), -Infinity);
    case "min":
      return values.reduce((a, b) => (b < a ? b : a), Infinity);
    default:
      return values[0];
  }
}

/** Groups rows by a label, aggregating each value column. Preserves first-seen order. */
export function groupRows(
  rows: DataRow[],
  label: (r: DataRow) => string,
  values: ((r: DataRow) => number | null)[],
  how: Aggregate = "sum",
): { label: string; values: number[]; count: number }[] {
  const order: string[] = [];
  const buckets = new Map<string, (number | null)[][]>();
  for (const r of rows) {
    const k = label(r);
    let b = buckets.get(k);
    if (!b) {
      b = values.map(() => []);
      buckets.set(k, b);
      order.push(k);
    }
    values.forEach((fn, i) => b![i].push(fn(r)));
  }
  return order.map((k) => {
    const b = buckets.get(k)!;
    return {
      label: k,
      values: b.map((vals) => (how === "count" ? vals.length : aggregate(vals.filter((v): v is number => v !== null), how))),
      count: b[0]?.length ?? 0,
    };
  });
}

/** Keeps the top `n` items and folds the rest into an "Other" bucket. */
export function topN<T extends { label: string; values: number[] }>(items: T[], n: number, otherLabel = "Other"): T[] {
  if (items.length <= n || n <= 0) return items;
  const sorted = [...items].sort((a, b) => Math.abs(b.values[0] ?? 0) - Math.abs(a.values[0] ?? 0));
  const keep = new Set(sorted.slice(0, n - 1));
  const rest = sorted.slice(n - 1);
  const other = {
    ...rest[0],
    label: otherLabel,
    values: rest[0].values.map((_, i) => rest.reduce((a, r) => a + (r.values[i] ?? 0), 0)),
  } as T;
  return [...items.filter((i) => keep.has(i)), other];
}

export function isNum(v: unknown): v is number {
  return typeof v === "number" && Number.isFinite(v);
}

/**
 * Whether a column's slash dates are day-first: true when some value can only be
 * day-first ("18/01/2025") and none can only be month-first ("01/18/2025");
 * undefined when the column doesn't say.
 */
export function detectDayFirst(values: readonly unknown[]): boolean | undefined {
  let day = false;
  let month = false;
  for (const v of values.slice(0, 5000)) {
    if (typeof v !== "string") continue;
    const m = v.trim().match(/^(\d{1,2})\/(\d{1,2})\/\d{2,4}$/);
    if (!m) continue;
    if (Number(m[1]) > 12) day = true;
    if (Number(m[2]) > 12) month = true;
  }
  return day && !month ? true : month && !day ? false : undefined;
}

/** parseDate bound to one column's day/month order, so "03/01" and "18/01" agree. */
export function dateParserFor(values: readonly unknown[]): (v: Cell) => number | null {
  const dayFirst = detectDayFirst(values);
  return (v) => parseDate(v, dayFirst);
}

/**
 * Tries to parse a date-ish string. Returns ms timestamp or null. `dayFirst`
 * resolves "03/01/2025" (see dateParserFor); without it, slash dates are
 * month-first unless the first part is over 12.
 */
export function parseDate(v: Cell, dayFirst?: boolean): number | null {
  if (v === null || v === undefined) return null;
  if (typeof v === "number") return v > 1000 && v < 3000 ? Date.UTC(v, 0, 1) : null;
  const s = v.trim();
  if (/^\d{4}$/.test(s)) return Date.UTC(Number(s), 0, 1);
  if (/^\d{4}-\d{1,2}$/.test(s)) {
    const [y, m] = s.split("-").map(Number);
    return Date.UTC(y, m - 1, 1);
  }
  // 31/12/2024, 12/31/2024, 31.12.2024 (dots are day-first, as in Europe).
  const dm = s.match(/^(\d{1,2})([/.])(\d{1,2})\2(\d{2,4})$/);
  if (dm) {
    const [a, b] = [Number(dm[1]), Number(dm[3])];
    const first = dm[2] === "." || (dayFirst ?? a > 12);
    const [day, month] = first ? [a, b] : [b, a];
    const y = Number(dm[4]);
    const year = dm[4].length === 2 ? (y < 50 ? 2000 : 1900) + y : y;
    if (month < 1 || month > 12 || day < 1 || day > 31) return null;
    return Date.UTC(year, month - 1, day);
  }
  const t = Date.parse(s);
  return Number.isNaN(t) ? null : t;
}

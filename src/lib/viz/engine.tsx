import type { ReactElement, ReactNode } from "react";
import { autoMap, inferColumns, mappingIssues, parseNumber, type MappingIssue } from "./data";
import { formatTick, formatValue } from "./format";
import { EmptyState } from "./parts";
import { textWidth, truncate, withMeasureFactor, wrapText } from "./text";
import { defaultStyle, resolveTheme, widthFactorFor } from "./themes";
import type {
  ChartWords,
  ChartDefinition,
  ChartDoc,
  ChartStyle,
  DataRow,
  LegendItem,
  LText,
  OptionValues,
  RenderContext,
  ResolvedTheme,
} from "./types";

export type Locale = "en" | "es";

export const lt = (t: LText | undefined, locale: Locale = "en"): string =>
  t === undefined ? "" : typeof t === "string" ? t : (t[locale] ?? t.en);

export const CHART_WORDS: Record<Locale, ChartWords> = {
  en: { other: "Other", blank: "(blank)", total: "Total", average: "avg", today: "today", more: "more", activeDays: "active days", increase: "Increase", decrease: "Decrease", noData: "No data to show" },
  es: { other: "Otros", blank: "(vacío)", total: "Total", average: "prom.", today: "hoy", more: "más", activeDays: "días activos", increase: "Aumento", decrease: "Disminución", noData: "No hay datos para mostrar" },
};

export function defaultOptions(def: ChartDefinition): OptionValues {
  const o: OptionValues = {};
  for (const opt of def.options ?? []) o[opt.key] = opt.default;
  return o;
}

/** A new document showing the chart's sample data. */
export function docFromSample(def: ChartDefinition, style?: Partial<ChartStyle>, locale: Locale = "en"): ChartDoc {
  const rows = def.sample.rows.map((r) => ({ ...r }));
  const columns = inferColumns(rows);
  return {
    version: 1,
    chartType: def.id,
    title: lt(def.sample.title, locale),
    subtitle: lt(def.sample.subtitle, locale),
    source: def.sample.source ?? "",
    note: "",
    columns,
    data: rows,
    mapping: autoMap(def, columns),
    options: defaultOptions(def),
    style: defaultStyle(style),
  };
}

/** Switches chart type while keeping data, text and style. */
export function switchChartType(doc: ChartDoc, def: ChartDefinition): ChartDoc {
  return {
    ...doc,
    chartType: def.id,
    mapping: autoMap(def, doc.columns, doc.mapping),
    options: { ...defaultOptions(def), ...pickKnown(doc.options, def) },
  };
}

function pickKnown(options: OptionValues, def: ChartDefinition): OptionValues {
  const keys = new Set((def.options ?? []).map((o) => o.key));
  return Object.fromEntries(Object.entries(options).filter(([k]) => keys.has(k)));
}

/** Typography unit: 1.0 at 1200×675. */
export function unitFor(width: number, height: number): number {
  return Math.sqrt(width * height) / 900;
}

let uidCounter = 0;

export function buildContext(
  doc: ChartDoc,
  def: ChartDefinition,
  theme: ResolvedTheme,
  size: { width: number; height: number; u: number },
  uid?: string,
  locale: Locale = "en",
): RenderContext {
  const mapped = new Set<string>();
  for (const v of Object.values(doc.mapping)) {
    if (Array.isArray(v)) v.forEach((x) => mapped.add(x));
    else if (v) mapped.add(v);
  }
  const rows: DataRow[] = doc.data.filter((r) =>
    [...mapped].some((c) => r[c] !== null && r[c] !== undefined && String(r[c]).trim() !== ""),
  );
  const options = { ...defaultOptions(def), ...doc.options };
  const col = (key: string) => {
    const m = doc.mapping[key];
    const name = Array.isArray(m) ? m[0] : m;
    return name && doc.columns.some((c) => c.name === name) ? name : undefined;
  };
  const cols = (key: string) => {
    const m = doc.mapping[key];
    const list = Array.isArray(m) ? m : m ? [m] : [];
    return list.filter((n) => doc.columns.some((c) => c.name === n));
  };
  const nf = doc.style.number;
  return {
    rows,
    col,
    cols,
    num: (row, key) => {
      const c = col(key);
      return c ? parseNumber(row[c]) : null;
    },
    str: (row, key) => {
      const c = col(key);
      const v = c ? row[c] : undefined;
      return v === null || v === undefined ? "" : String(v);
    },
    width: size.width,
    height: size.height,
    u: size.u,
    theme,
    options,
    opt: ((key: string, fallback: string | number | boolean) => {
      const v = options[key];
      return typeof v === typeof fallback ? v : fallback;
    }) as RenderContext["opt"],
    color: (i: number) => theme.palette[((i % theme.palette.length) + theme.palette.length) % theme.palette.length],
    fmt: (n) => formatValue(n, nf),
    fmtTick: (n, step) => formatTick(n, step, nf),
    grid: doc.style.grid,
    labels: doc.style.labels,
    corners: doc.style.corners * size.u,
    uid: uid ?? `pp${++uidCounter}`,
    words: CHART_WORDS[locale] ?? CHART_WORDS.en,
  };
}

export type RenderIssue =
  | { kind: "mapping"; issues: MappingIssue[] }
  | { kind: "rows"; needed: number; got: number }
  | { kind: "error"; message: string };

export type PosterResult = {
  element: ReactElement;
  issues: RenderIssue[];
};

type PosterOptions = {
  locale?: Locale;
  /** Stable id prefix (use for SSR/hydration). */
  uid?: string;
  /** Messages for empty states. */
  messages?: { mapField: (field: string) => string; needRows: (n: number) => string; error: string };
  /** Extra <defs> content, e.g. embedded @font-face rules. */
  defs?: ReactNode;
  className?: string;
  /** Override the credit text. */
  credit?: string;
};

const DEFAULT_MESSAGES = {
  mapField: (f: string) => `Choose a column for “${f}” to draw this chart`,
  needRows: (n: number) => `This chart needs at least ${n} rows of data`,
  error: "This chart could not be drawn with the current data",
};

/**
 * Renders the complete chart "poster": background, title, subtitle, legend,
 * plot, note and footer. The same SVG is used for preview and export.
 */
export function renderPoster(doc: ChartDoc, def: ChartDefinition, opts: PosterOptions = {}): PosterResult {
  return withMeasureFactor(widthFactorFor(doc.style), () => renderPosterInner(doc, def, opts));
}

function renderPosterInner(doc: ChartDoc, def: ChartDefinition, opts: PosterOptions): PosterResult {
  const locale = opts.locale ?? "en";
  const messages = opts.messages ?? DEFAULT_MESSAGES;
  const style = doc.style;
  const W = Math.round(style.width);
  const H = Math.round(style.height);
  const base = unitFor(W, H);
  const u = base * (style.fontScale || 1);
  const theme = resolveTheme(style);
  const pad = Math.round(Math.min(W, H) * 0.06 + 8 * base);
  const innerW = W - pad * 2;
  const issues: RenderIssue[] = [];

  // ── Title block
  const titleSize = 38 * u;
  const subSize = 19 * u;
  const titleLines = doc.title.trim() ? wrapText(doc.title.trim(), innerW, titleSize, H > W * 0.9 ? 4 : 3, theme.displayWeight) : [];
  const subLines = doc.subtitle.trim() ? wrapText(doc.subtitle.trim(), innerW, subSize, 2) : [];
  const anchor = style.titleAlign === "center" ? "middle" : "start";
  const tx = style.titleAlign === "center" ? W / 2 : pad;
  let y = pad;
  const header: ReactNode[] = [];
  titleLines.forEach((line, i) => {
    header.push(
      <text
        key={`t${i}`}
        x={tx}
        y={y + titleSize * 0.8}
        textAnchor={anchor}
        fontFamily={theme.fontDisplay}
        fontWeight={theme.displayWeight}
        fontSize={titleSize}
        fill={theme.ink}
        letterSpacing={-0.01 * titleSize}
      >
        {line}
      </text>,
    );
    y += titleSize * 1.14;
  });
  if (subLines.length) y += 6 * u;
  subLines.forEach((line, i) => {
    header.push(
      <text
        key={`s${i}`}
        x={tx}
        y={y + subSize * 0.8}
        textAnchor={anchor}
        fontFamily={theme.fontBody}
        fontSize={subSize}
        fill={theme.text}
      >
        {line}
      </text>,
    );
    y += subSize * 1.35;
  });
  if (titleLines.length || subLines.length) y += 22 * u;

  // ── Footer block (bottom-up)
  const footSize = 13 * u;
  const credit = opts.credit ?? "Made with Plotpaper";
  const hasFooter = !!doc.source.trim() || style.branding;
  let bottom = H - pad;
  const footer: ReactNode[] = [];
  if (hasFooter) {
    const creditW = style.branding ? textWidth(credit, footSize) + 32 * u : 0;
    const src = doc.source.trim()
      ? truncate((locale === "es" ? "Fuente: " : "Source: ") + doc.source.trim(), innerW - creditW, footSize)
      : "";
    footer.push(
      <text key="src" x={pad} y={bottom} fontFamily={theme.fontBody} fontSize={footSize} fill={theme.muted}>
        {src}
      </text>,
    );
    if (style.branding) {
      footer.push(
        <text
          key="credit"
          x={W - pad}
          y={bottom}
          textAnchor="end"
          fontFamily={theme.fontBody}
          fontSize={footSize}
          fill={theme.muted}
          opacity={0.85}
        >
          {credit}
        </text>,
      );
    }
    bottom -= footSize * 1.9;
  }
  if (doc.note.trim()) {
    const noteSize = 14 * u;
    const lines = wrapText(doc.note.trim(), innerW, noteSize, 3);
    for (let i = lines.length - 1; i >= 0; i--) {
      footer.push(
        <text
          key={`n${i}`}
          x={pad}
          y={bottom}
          fontFamily={theme.fontBody}
          fontSize={noteSize}
          fill={theme.text}
          fontStyle="italic"
        >
          {lines[i]}
        </text>,
      );
      bottom -= noteSize * 1.35;
    }
    bottom -= 6 * u;
  }
  if (hasFooter || doc.note.trim()) bottom -= 14 * u;

  // ── Plot context (legend needs it)
  const mapIssues = mappingIssues(def, doc.mapping, doc.columns);
  const provisional = buildContext(doc, def, theme, { width: innerW, height: Math.max(10, bottom - y), u }, opts.uid, locale);
  let legendItems: LegendItem[] | null = null;
  if (style.legend !== "none" && def.legend && !mapIssues.length) {
    try {
      legendItems = def.legend(provisional);
    } catch {
      legendItems = null;
    }
  }
  const legendSize = 14 * u;
  const legendRows = legendItems?.length ? layoutLegend(legendItems, innerW, legendSize, u) : [];
  const legendH = legendRows.length * legendSize * 1.8;
  let legendY = 0;
  if (legendRows.length) {
    if (style.legend === "bottom") {
      legendY = bottom - legendH + legendSize * 0.9;
      bottom -= legendH + 10 * u;
    } else {
      legendY = y + legendSize * 0.5;
      y += legendH + 12 * u;
    }
  }

  const plotH = Math.max(40 * u, bottom - y);
  const ctx: RenderContext = { ...provisional, width: innerW, height: plotH };

  let plot: ReactNode;
  const minRows = def.minRows ?? 1;
  if (mapIssues.length) {
    issues.push({ kind: "mapping", issues: mapIssues });
    const f = def.fields.find((x) => x.key === mapIssues[0].field);
    plot = <EmptyState c={ctx} message={messages.mapField(lt(f?.label ?? mapIssues[0].field, locale))} />;
  } else if (ctx.rows.length < minRows) {
    issues.push({ kind: "rows", needed: minRows, got: ctx.rows.length });
    plot = <EmptyState c={ctx} message={messages.needRows(minRows)} />;
  } else {
    try {
      plot = def.render(ctx);
    } catch (err) {
      issues.push({ kind: "error", message: err instanceof Error ? err.message : String(err) });
      plot = <EmptyState c={ctx} message={messages.error} />;
    }
  }

  const bg = theme.background;
  const element = (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={W}
      height={H}
      viewBox={`0 0 ${W} ${H}`}
      className={opts.className}
      role="img"
      aria-label={doc.title || lt(def.name, locale)}
    >
      {opts.defs ? <defs>{opts.defs}</defs> : null}
      {bg !== "transparent" && <rect width={W} height={H} fill={bg} />}
      <g>{header}</g>
      {legendRows.length > 0 && (
        <g>
          {legendRows.map((row, ri) => {
            const rowW = row.reduce((a, it) => a + it.w, 0);
            const startX = style.titleAlign === "center" ? (W - rowW) / 2 : pad;
            let x = startX;
            return (
              <g key={ri} transform={`translate(0,${legendY + ri * legendSize * 1.8})`}>
                {row.map((it, i) => {
                  const node = (
                    <g key={i} transform={`translate(${x},0)`}>
                      <LegendSwatch item={it.item} size={legendSize} />
                      <text
                        x={legendSize * 1.25}
                        y={0}
                        dy="0.35em"
                        fontFamily={theme.fontBody}
                        fontSize={legendSize}
                        fill={theme.text}
                      >
                        {it.label}
                      </text>
                    </g>
                  );
                  x += it.w;
                  return node;
                })}
              </g>
            );
          })}
        </g>
      )}
      <g transform={`translate(${pad},${y})`}>{plot}</g>
      <g>{footer}</g>
    </svg>
  );
  return { element, issues };
}

function LegendSwatch({ item, size }: { item: LegendItem; size: number }) {
  const s = size * 0.8;
  if (item.shape === "line")
    return <rect x={0} y={-s * 0.12} width={s} height={s * 0.24} rx={s * 0.12} fill={item.color} />;
  if (item.shape === "circle") return <circle cx={s / 2} cy={0} r={s / 2} fill={item.color} />;
  return <rect x={0} y={-s / 2} width={s} height={s} rx={s * 0.2} fill={item.color} />;
}

function layoutLegend(items: LegendItem[], maxW: number, size: number, u: number) {
  const rows: { item: LegendItem; label: string; w: number }[][] = [[]];
  let rowW = 0;
  const maxRows = 3;
  for (const item of items.slice(0, 24)) {
    const label = truncate(item.label, Math.min(maxW * 0.5, 260 * u), size);
    const w = size * 1.25 + textWidth(label, size) + 22 * u;
    if (rowW + w > maxW && rows[rows.length - 1].length) {
      if (rows.length === maxRows) break;
      rows.push([]);
      rowW = 0;
    }
    rows[rows.length - 1].push({ item, label, w });
    rowW += w;
  }
  return rows.filter((r) => r.length);
}

/** Convenience: ensures a doc has valid dimensions and known fields. */
export function sanitizeDoc(doc: ChartDoc): ChartDoc {
  const style = { ...defaultStyle(), ...doc.style, number: { ...defaultStyle().number, ...(doc.style?.number ?? {}) } };
  style.width = clampInt(style.width, 320, 4000, 1200);
  style.height = clampInt(style.height, 320, 4000, 675);
  style.fontScale = Math.min(1.6, Math.max(0.6, Number(style.fontScale) || 1));
  style.corners = Math.min(24, Math.max(0, Number(style.corners) || 0));
  const data = Array.isArray(doc.data) ? doc.data : [];
  return {
    version: 1,
    chartType: String(doc.chartType ?? "bar"),
    title: String(doc.title ?? ""),
    subtitle: String(doc.subtitle ?? ""),
    source: String(doc.source ?? ""),
    note: String(doc.note ?? ""),
    columns: Array.isArray(doc.columns) && doc.columns.length ? doc.columns : inferColumns(data),
    data,
    mapping: doc.mapping && typeof doc.mapping === "object" ? doc.mapping : {},
    options: doc.options && typeof doc.options === "object" ? doc.options : {},
    style,
  };
}

function clampInt(v: unknown, lo: number, hi: number, fallback: number): number {
  const n = Math.round(Number(v));
  return Number.isFinite(n) ? Math.min(hi, Math.max(lo, n)) : fallback;
}

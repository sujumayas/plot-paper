import { dateParserFor, parseNumber } from "../data";
import { linear, maxOf, minOf, point, tickStep } from "../scale";
import { CategoryLabels, EmptyState, HaloText, YAxis, fs, layoutCategoryLabels, linePath, tickLabelWidth } from "../parts";
import { pretty, textWidth, truncate } from "../text";
import type { ChartDefinition, LegendItem, RenderContext } from "../types";
import { curveOption, dim } from "./common";
import { G } from "./glyphs";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

type Series = { name: string; values: (number | null)[] };
type XAxisModel =
  | { kind: "category"; labels: string[] }
  | { kind: "number"; values: number[]; year: boolean }
  | { kind: "date"; values: number[] };

export type LineData = { x: XAxisModel; series: Series[] };

/** Builds series from wide data (one column per series) or long data (split by a group column). */
export function lineData(c: RenderContext): LineData | null {
  const xCol = c.col("x");
  const valueCols = c.cols("series");
  const groupCol = c.col("group");
  if (!xCol || !valueCols.length) return null;

  // Unique x keys in data order.
  const keys: string[] = [];
  const index = new Map<string, number>();
  for (const r of c.rows) {
    const k = r[xCol] === null || r[xCol] === undefined ? "" : String(r[xCol]);
    if (!index.has(k)) {
      index.set(k, keys.length);
      keys.push(k);
    }
  }
  let series: Series[];
  if (groupCol) {
    const vc = valueCols[0];
    const groups = new Map<string, (number | null)[]>();
    for (const r of c.rows) {
      const g = String(r[groupCol] ?? "");
      if (!groups.has(g)) {
        if (groups.size >= 12) continue;
        groups.set(g, new Array(keys.length).fill(null));
      }
      const v = parseNumber(r[vc]);
      const arr = groups.get(g)!;
      const i = index.get(String(r[xCol] ?? ""))!;
      if (v !== null) arr[i] = (arr[i] ?? 0) + v;
    }
    series = [...groups.entries()].map(([name, values]) => ({ name, values }));
  } else {
    series = valueCols.map((vc) => {
      const values: (number | null)[] = new Array(keys.length).fill(null);
      for (const r of c.rows) {
        const v = parseNumber(r[vc]);
        const i = index.get(String(r[xCol] ?? ""))!;
        if (v !== null) values[i] = (values[i] ?? 0) + v;
      }
      return { name: pretty(vc), values };
    });
  }

  // Continuous x if every key is a number or a date.
  const nums = keys.map((k) => (/^-?\d+(\.\d+)?$/.test(k.trim()) ? Number(k) : null));
  const isYear = nums.every((n) => n !== null && Number.isInteger(n) && n >= 1000 && n <= 2999);
  let x: XAxisModel;
  let order = keys.map((_, i) => i);
  if (keys.length > 1 && nums.every((n) => n !== null)) {
    order.sort((a, b) => nums[a]! - nums[b]!);
    x = { kind: "number", values: order.map((i) => nums[i]!), year: isYear };
  } else {
    const toDate = dateParserFor(keys);
    const dates = keys.map((k) => (/\d/.test(k) && /[-/]/.test(k) ? toDate(k) : null));
    if (keys.length > 1 && dates.every((d) => d !== null)) {
      order.sort((a, b) => dates[a]! - dates[b]!);
      x = { kind: "date", values: order.map((i) => dates[i]!) };
    } else {
      order = keys.map((_, i) => i);
      x = { kind: "category", labels: keys };
    }
  }
  if (x.kind !== "category") series = series.map((s) => ({ ...s, values: order.map((i) => s.values[i]) }));
  return { x, series };
}

function xLabel(xm: XAxisModel, i: number): string {
  if (xm.kind === "category") return xm.labels[i];
  if (xm.kind === "number") return String(xm.values[i]);
  return new Date(xm.values[i]).toISOString().slice(0, 10);
}

export function dateTicks(min: number, max: number, maxTicks: number): { ticks: number[]; fmt: (t: number) => string } {
  const DAY = 86_400_000;
  const span = max - min;
  const y0 = new Date(min).getUTCFullYear();
  const y1 = new Date(max).getUTCFullYear();
  if (span > DAY * 365 * 2) {
    const step = Math.max(1, Math.ceil(tickStep(y0, y1, maxTicks)));
    const ticks: number[] = [];
    for (let y = Math.ceil(y0 / step) * step; y <= y1; y += step) {
      const t = Date.UTC(y, 0, 1);
      if (t >= min - DAY) ticks.push(t);
    }
    return { ticks, fmt: (t) => String(new Date(t).getUTCFullYear()) };
  }
  if (span > DAY * 60) {
    const months = (y1 - y0) * 12 + new Date(max).getUTCMonth() - new Date(min).getUTCMonth();
    const step = [1, 2, 3, 6, 12].find((s) => months / s <= maxTicks) ?? 12;
    const ticks: number[] = [];
    const d = new Date(min);
    let y = d.getUTCFullYear();
    let m = Math.ceil(d.getUTCMonth() / step) * step;
    for (let i = 0; i < 60; i++) {
      const t = Date.UTC(y + Math.floor(m / 12), m % 12, 1);
      if (t > max) break;
      if (t >= min) ticks.push(t);
      m += step;
      if (m >= 12) {
        y += Math.floor(m / 12);
        m %= 12;
      }
    }
    return {
      ticks,
      fmt: (t) => {
        const dt = new Date(t);
        return dt.getUTCMonth() === 0 || ticks[0] === t ? `${MONTHS[dt.getUTCMonth()]} ${dt.getUTCFullYear()}` : MONTHS[dt.getUTCMonth()];
      },
    };
  }
  const stepDays = Math.max(1, Math.ceil(span / DAY / maxTicks));
  const ticks: number[] = [];
  const start = Math.ceil(min / DAY) * DAY;
  for (let t = start; t <= max; t += stepDays * DAY) ticks.push(t);
  return { ticks, fmt: (t) => `${MONTHS[new Date(t).getUTCMonth()]} ${new Date(t).getUTCDate()}` };
}

function renderLines(c: RenderContext, mode: "line" | "area") {
  const ld = lineData(c);
  if (!ld || !ld.series.length) return null;
  const { x: xm, series } = ld;
  const n = xm.kind === "category" ? xm.labels.length : xm.values.length;
  if (n === 0) return <EmptyState c={c} message={c.words.noData} />;
  const stacked = mode === "area" && c.opt("stacked", false) && series.length > 1;
  const curve = c.opt("curve", "smooth") as "smooth" | "linear" | "step";

  // Values (stacked cumulates).
  const plotted: (number | null)[][] = stacked
    ? (() => {
        const acc = new Array(n).fill(0);
        return series.map((s) => s.values.map((v, i) => (acc[i] += v ?? 0)));
      })()
    : series.map((s) => s.values);
  const all = plotted.flat().filter((v): v is number => v !== null);
  if (!all.length) return <EmptyState c={c} message="No numeric values" />;
  const zeroOpt = c.opt("yZero", "auto");
  const min = minOf(all);
  const max = maxOf(all);
  const zero = mode === "area" || zeroOpt === "yes" || (zeroOpt === "auto" && (min <= 0 || min / (max || 1) < 0.45));

  // End labels on the right.
  const endLabels = c.opt("endLabels", true) && series.length > 1 && series.length <= 10;
  const lSize = fs.label(c);
  const vSize = fs.value(c);
  const lastVals = plotted.map((vals) => {
    for (let i = vals.length - 1; i >= 0; i--) if (vals[i] !== null) return { i, v: vals[i]! };
    return null;
  });
  const endText = (si: number) => {
    const lv = lastVals[si];
    const name = truncate(series[si].name, c.width * 0.18, lSize);
    return endLabels ? (c.labels && lv ? `${name}  ${c.fmt(series[si].values[lv.i] ?? lv.v)}` : name) : c.labels && lv ? c.fmt(lv.v) : "";
  };
  const rightW = Math.max(0, ...series.map((_, si) => textWidth(endText(si), endLabels ? lSize : vSize))) + (endLabels || c.labels ? 14 * c.u : 8 * c.u);

  const top = 8 * c.u;
  let y = linear(all, [c.height, top], { zero });
  const left = tickLabelWidth(c, y) + 14 * c.u;
  const right = c.width - rightW;
  const tickSize = fs.tick(c);

  // X positions and axis labels.
  let xFor: (i: number) => number;
  let bottom: number;
  let xAxis: React.ReactNode;
  if (xm.kind === "category") {
    const px = point(xm.labels, [left, right]);
    xFor = px;
    const slot = n > 1 ? (right - left) / (n - 1) : right - left;
    const layout = layoutCategoryLabels(c, xm.labels, slot);
    // Too many points: keep ~10 evenly spaced labels without rotation.
    const every = n > 14 ? Math.ceil(n / 10) : layout.every;
    const lay = n > 14 ? { ...layout, rotate: false, every, height: lSize * 1.9, maxWidth: slot * every } : layout;
    bottom = c.height - lay.height;
    xAxis = <CategoryLabels c={c} labels={xm.labels} xFor={xFor} y={bottom} layout={lay} />;
  } else {
    const vals = xm.values;
    const lo = vals[0];
    const hi = vals[vals.length - 1];
    const span = hi - lo || 1;
    xFor = (i: number) => (n === 1 ? (left + right) / 2 : left + ((vals[i] - lo) / span) * (right - left));
    const maxTicks = Math.max(2, Math.floor((right - left) / (tickSize * 6)));
    let ticks: number[];
    let fmtX: (t: number) => string;
    if (xm.kind === "date") {
      const dt = dateTicks(lo, hi, maxTicks);
      ticks = dt.ticks;
      fmtX = dt.fmt;
    } else {
      const s = linear([lo, hi], [left, right], { zero: false, nice: false, ticks: maxTicks });
      ticks = s.ticks.filter((t) => t >= lo && t <= hi);
      if (xm.year) ticks = ticks.filter((t) => Number.isInteger(t));
      fmtX = (t) => (xm.year ? String(t) : c.fmtTick(t, s.step));
    }
    const xPos = (t: number) => left + ((t - lo) / span) * (right - left);
    bottom = c.height - tickSize * 2.2;
    xAxis = (
      <g>
        {ticks.map((t) => (
          <text key={t} x={xPos(t)} y={bottom + tickSize * 0.6} dy="0.8em" textAnchor="middle" fontSize={tickSize} fill={c.theme.muted} fontFamily={c.theme.fontNumeric}>
            {fmtX(t)}
          </text>
        ))}
      </g>
    );
  }
  y = linear(all, [bottom, top], { zero });

  const markers = c.opt("markers", "auto");
  const showMarkers = markers === "yes" || (markers === "auto" && n <= 24);
  const strokeW = (series.length > 5 ? 2.2 : 3) * c.u;
  const highlight = c.opt("highlightSeries", "") as string;
  const hiIdx = highlight ? series.findIndex((s) => s.name === highlight) : -1;

  // Resolve end label collisions.
  const labelYs = placeLabels(
    lastVals.map((lv) => (lv ? y(lv.v) : null)),
    (endLabels ? lSize : vSize) * 1.2,
    top,
    bottom,
  );

  return (
    <g>
      <YAxis c={c} scale={y} x0={left} x1={right} />
      {xAxis}
      {mode === "area" && (
        <defs>
          {series.map((_, si) => (
            <linearGradient key={si} id={`${c.uid}-a${si}`} x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor={c.color(si)} stopOpacity={stacked ? 0.85 : 0.32} />
              <stop offset="100%" stopColor={c.color(si)} stopOpacity={stacked ? 0.7 : 0.03} />
            </linearGradient>
          ))}
        </defs>
      )}
      {(stacked ? [...plotted.keys()].reverse() : [...plotted.keys()]).map((si) => {
        const vals = plotted[si];
        const color = hiIdx >= 0 && si !== hiIdx ? dim(c, c.color(si), 0.65) : c.color(si);
        // Split into segments at gaps (null values).
        const segs: { pts: [number, number][]; idx: number[] }[] = [{ pts: [], idx: [] }];
        vals.forEach((v, i) => {
          if (v === null) {
            if (segs[segs.length - 1].pts.length) segs.push({ pts: [], idx: [] });
          } else {
            segs[segs.length - 1].pts.push([xFor(i), y(v)]);
            segs[segs.length - 1].idx.push(i);
          }
        });
        const live = segs.filter((s) => s.pts.length);
        const base = (i: number) => (stacked && si > 0 ? y(plotted[si - 1][i] ?? 0) : y(Math.max(0, y.domain[0])));
        return (
          <g key={si}>
            {mode === "area" &&
              live.map((s, k) => {
                const lower = s.idx.map((i, j) => [s.pts[j][0], base(i)] as [number, number]).reverse();
                const d = linePath(s.pts, curve) + "L" + linePath(lower, curve).slice(1) + "Z";
                return <path key={k} d={d} fill={`url(#${c.uid}-a${si})`} />;
              })}
            {live.map((s, k) => (
              <path key={k} d={linePath(s.pts, curve)} fill="none" stroke={color} strokeWidth={si === hiIdx ? strokeW * 1.4 : strokeW} strokeLinejoin="round" strokeLinecap="round" />
            ))}
            {showMarkers &&
              vals.map((v, i) =>
                v === null ? null : (
                  <circle key={i} cx={xFor(i)} cy={y(v)} r={3.6 * c.u} fill={c.theme.background === "transparent" ? c.theme.surface : c.theme.background} stroke={color} strokeWidth={2 * c.u}>
                    <title>{`${series[si].name} · ${xLabel(xm, i)}: ${c.fmt(series[si].values[i] ?? v)}`}</title>
                  </circle>
                ),
              )}
            {lastVals[si] && (
              <circle cx={xFor(lastVals[si]!.i)} cy={y(lastVals[si]!.v)} r={5 * c.u} fill={color} />
            )}
          </g>
        );
      })}
      {series.map((s, si) => {
        const lv = lastVals[si];
        const ly = labelYs[si];
        if (!lv || ly === null) return null;
        const text = endText(si);
        if (!text) return null;
        return (
          <HaloText key={si} c={c} x={xFor(lv.i) + 12 * c.u} y={ly} dy="0.35em" fontSize={endLabels ? lSize : vSize} fontWeight={600} fill={c.color(si)} fontFamily={c.theme.fontBody}>
            {text}
          </HaloText>
        );
      })}
    </g>
  );
}

/** Spreads labels vertically so they don't overlap. */
export function placeLabels(ys: (number | null)[], gap: number, min: number, max: number): (number | null)[] {
  const items = ys.map((y, i) => ({ i, y })).filter((d): d is { i: number; y: number } => d.y !== null).sort((a, b) => a.y - b.y);
  for (let pass = 0; pass < 20; pass++) {
    let moved = false;
    for (let k = 1; k < items.length; k++) {
      const overlap = items[k - 1].y + gap - items[k].y;
      if (overlap > 0) {
        items[k - 1].y -= overlap / 2;
        items[k].y += overlap / 2;
        moved = true;
      }
    }
    for (const it of items) it.y = Math.min(max - gap / 2, Math.max(min + gap / 2, it.y));
    if (!moved) break;
  }
  const out: (number | null)[] = ys.map(() => null);
  for (const it of items) out[it.i] = it.y;
  return out;
}

const lineLegend = (c: RenderContext): LegendItem[] | null => {
  const ld = lineData(c);
  if (!ld || ld.series.length < 2) return null;
  if (c.opt("endLabels", true) && ld.series.length <= 10 && c.opt("legendToo", false) === false) return null;
  return ld.series.map((s, i) => ({ label: s.name, color: c.color(i), shape: "line" as const }));
};

const xField = { key: "x", label: { en: "X axis (time or category)", es: "Eje X (tiempo o categoría)" }, type: "any" as const };
const seriesField = {
  key: "series",
  label: { en: "Lines (numeric columns)", es: "Líneas (columnas numéricas)" },
  type: "number" as const,
  multiple: true,
};
const groupField = {
  key: "group",
  label: { en: "Split by (long data)", es: "Separar por (datos largos)" },
  type: "string" as const,
  required: false,
  help: { en: "Use when one column says which line a row belongs to", es: "Úsalo cuando una columna indica a qué línea pertenece cada fila" },
};

const lineOptions = [
  curveOption,
  {
    key: "yZero",
    label: { en: "Y axis from zero", es: "Eje Y desde cero" },
    type: "select" as const,
    default: "auto",
    choices: [
      { value: "auto", label: { en: "Automatic", es: "Automático" } },
      { value: "yes", label: { en: "Always", es: "Siempre" } },
      { value: "no", label: { en: "Never", es: "Nunca" } },
    ],
  },
  { key: "endLabels", label: { en: "Label lines at the end", es: "Etiquetar líneas al final" }, type: "boolean" as const, default: true },
  {
    key: "markers",
    label: { en: "Point markers", es: "Marcadores" },
    type: "select" as const,
    default: "auto",
    choices: [
      { value: "auto", label: { en: "Automatic", es: "Automático" } },
      { value: "yes", label: { en: "Show", es: "Mostrar" } },
      { value: "no", label: { en: "Hide", es: "Ocultar" } },
    ],
  },
  { key: "highlightSeries", label: { en: "Highlight line (name)", es: "Resaltar línea (nombre)" }, type: "text" as const, default: "" },
];

export const lineChart: ChartDefinition = {
  id: "line",
  name: { en: "Line chart", es: "Líneas" },
  description: { en: "Trends over time, one or many series", es: "Tendencias en el tiempo, una o varias series" },
  category: "trend",
  glyph: G.line,
  keywords: ["time series", "trend", "evolution", "tendencia"],
  fields: [xField, seriesField, groupField],
  options: lineOptions,
  sample: {
    title: { en: "Atmospheric CO₂ keeps climbing", es: "El CO₂ atmosférico sigue subiendo" },
    subtitle: { en: "Annual mean at Mauna Loa, parts per million", es: "Promedio anual en Mauna Loa, partes por millón" },
    source: "NOAA Global Monitoring Laboratory",
    rows: [
      { year: 1960, co2: 316.9 },
      { year: 1970, co2: 325.7 },
      { year: 1980, co2: 338.8 },
      { year: 1990, co2: 354.5 },
      { year: 2000, co2: 369.7 },
      { year: 2010, co2: 389.9 },
      { year: 2015, co2: 401.0 },
      { year: 2020, co2: 414.2 },
      { year: 2024, co2: 424.6 },
    ],
  },
  legend: lineLegend,
  render: (c) => renderLines(c, "line"),
};

export const multilineChart: ChartDefinition = {
  ...lineChart,
  id: "multiline",
  name: { en: "Multi-line", es: "Multilínea" },
  description: { en: "Compare several series over time", es: "Compara varias series en el tiempo" },
  glyph: G.multiline,
  keywords: ["compare", "series", "multiple lines"],
  sample: {
    title: { en: "Streaming ate the music business", es: "El streaming se comió la industria musical" },
    subtitle: { en: "US recorded music revenues by format, $ billions", es: "Ingresos de música grabada en EE. UU. por formato, miles de millones de $" },
    source: "RIAA",
    rows: [
      { year: 2005, physical: 10.5, downloads: 1.1, streaming: 0.1 },
      { year: 2008, physical: 6.1, downloads: 2.4, streaming: 0.3 },
      { year: 2011, physical: 3.8, downloads: 3.0, streaming: 0.6 },
      { year: 2014, physical: 2.8, downloads: 2.6, streaming: 1.9 },
      { year: 2017, physical: 1.9, downloads: 1.4, streaming: 5.7 },
      { year: 2020, physical: 1.2, downloads: 0.6, streaming: 10.1 },
      { year: 2023, physical: 1.9, downloads: 0.4, streaming: 14.4 },
    ],
  },
};

export const areaChart: ChartDefinition = {
  id: "area",
  name: { en: "Area chart", es: "Área" },
  description: { en: "Volume over time; can stack series", es: "Volumen en el tiempo; puede apilar series" },
  category: "trend",
  glyph: G.area,
  keywords: ["volume", "stacked area", "cumulative"],
  fields: [xField, seriesField, groupField],
  options: [{ key: "stacked", label: { en: "Stack series", es: "Apilar series" }, type: "boolean", default: false }, ...lineOptions],
  sample: {
    title: { en: "Solar is growing faster than anyone predicted", es: "La solar crece más rápido de lo previsto" },
    subtitle: { en: "Global electricity generation from solar and wind, TWh", es: "Generación eléctrica mundial solar y eólica, TWh" },
    source: "Ember / Energy Institute",
    rows: [
      { year: 2014, wind: 706, solar: 190 },
      { year: 2016, wind: 959, solar: 329 },
      { year: 2018, wind: 1270, solar: 570 },
      { year: 2020, wind: 1596, solar: 846 },
      { year: 2022, wind: 2100, solar: 1310 },
      { year: 2024, wind: 2494, solar: 2131 },
    ],
  },
  legend: lineLegend,
  render: (c) => renderLines(c, "area"),
};

/* ───────────────────────── Slope chart ───────────────────────── */

export const slopeChart: ChartDefinition = {
  id: "slope",
  name: { en: "Slope chart", es: "Pendiente" },
  description: { en: "Who rose and who fell between two moments", es: "Quién subió y quién bajó entre dos momentos" },
  category: "trend",
  glyph: G.slope,
  keywords: ["before after", "change", "rank change"],
  fields: [
    { key: "label", label: { en: "Labels", es: "Etiquetas" }, type: "string" },
    { key: "start", label: { en: "Start value", es: "Valor inicial" }, type: "number" },
    { key: "end", label: { en: "End value", es: "Valor final" }, type: "number" },
  ],
  options: [
    {
      key: "colorBy",
      label: { en: "Colors", es: "Colores" },
      type: "select",
      default: "direction",
      choices: [
        { value: "direction", label: { en: "Up / down", es: "Sube / baja" } },
        { value: "category", label: { en: "One per item", es: "Uno por elemento" } },
        { value: "single", label: { en: "One color", es: "Un color" } },
      ],
    },
  ],
  sample: {
    title: { en: "Life expectancy rose almost everywhere", es: "La esperanza de vida subió casi en todas partes" },
    subtitle: { en: "Life expectancy at birth, years", es: "Esperanza de vida al nacer, años" },
    source: "UN World Population Prospects",
    rows: [
      { country: "Japan", "1990": 78.8, "2023": 84.7 },
      { country: "Peru", "1990": 66.7, "2023": 77.7 },
      { country: "India", "1990": 58.6, "2023": 72.0 },
      { country: "United States", "1990": 75.3, "2023": 78.4 },
      { country: "Nigeria", "1990": 45.9, "2023": 54.5 },
      { country: "Russia", "1990": 68.9, "2023": 73.2 },
    ],
  },
  render: (c) => {
    const items = c.rows
      .map((r) => ({ label: c.str(r, "label"), a: c.num(r, "start"), b: c.num(r, "end") }))
      .filter((d): d is { label: string; a: number; b: number } => d.a !== null && d.b !== null)
      .slice(0, 30);
    if (!items.length) return <EmptyState c={c} message={c.words.noData} />;
    const lSize = fs.label(c) * (items.length > 12 ? 0.85 : 1);
    const headSize = fs.label(c);
    const text = (it: (typeof items)[number], side: "a" | "b") => `${side === "a" ? it.label + "  " : ""}${c.fmt(side === "a" ? it.a : it.b)}${side === "b" ? "  " + it.label : ""}`;
    const sideW = Math.min(c.width * 0.32, Math.max(...items.map((it) => Math.max(textWidth(text(it, "a"), lSize), textWidth(text(it, "b"), lSize)))) + 12 * c.u);
    const x0 = sideW;
    const x1 = c.width - sideW;
    const top = headSize * 2.6;
    const y = linear(items.flatMap((i) => [i.a, i.b]), [c.height - lSize, top], { zero: false, nice: false });
    const ya = placeLabels(items.map((i) => y(i.a)), lSize * 1.25, top - lSize, c.height);
    const yb = placeLabels(items.map((i) => y(i.b)), lSize * 1.25, top - lSize, c.height);
    const by = c.opt("colorBy", "direction");
    const colorFor = (i: number) =>
      by === "category" ? c.color(i) : by === "single" ? c.color(0) : items[i].b >= items[i].a ? c.theme.positive : c.theme.negative;
    return (
      <g>
        <line x1={x0} x2={x0} y1={top - lSize} y2={c.height} stroke={c.theme.axis} strokeWidth={1.2 * c.u} />
        <line x1={x1} x2={x1} y1={top - lSize} y2={c.height} stroke={c.theme.axis} strokeWidth={1.2 * c.u} />
        <text x={x0} y={headSize} textAnchor="middle" fontSize={headSize} fontWeight={700} fill={c.theme.ink} fontFamily={c.theme.fontBody}>
          {pretty(c.col("start"))}
        </text>
        <text x={x1} y={headSize} textAnchor="middle" fontSize={headSize} fontWeight={700} fill={c.theme.ink} fontFamily={c.theme.fontBody}>
          {pretty(c.col("end"))}
        </text>
        {items.map((it, i) => (
          <g key={i}>
            <line x1={x0} x2={x1} y1={y(it.a)} y2={y(it.b)} stroke={colorFor(i)} strokeWidth={2.6 * c.u} strokeLinecap="round">
              <title>{`${it.label}: ${c.fmt(it.a)} → ${c.fmt(it.b)}`}</title>
            </line>
            <circle cx={x0} cy={y(it.a)} r={4.5 * c.u} fill={colorFor(i)} />
            <circle cx={x1} cy={y(it.b)} r={4.5 * c.u} fill={colorFor(i)} />
            <text x={x0 - 10 * c.u} y={ya[i]!} dy="0.35em" textAnchor="end" fontSize={lSize} fill={c.theme.text} fontFamily={c.theme.fontBody}>
              {truncate(text(it, "a"), sideW - 12 * c.u, lSize)}
            </text>
            <text x={x1 + 10 * c.u} y={yb[i]!} dy="0.35em" fontSize={lSize} fill={c.theme.text} fontFamily={c.theme.fontBody}>
              {truncate(text(it, "b"), sideW - 12 * c.u, lSize)}
            </text>
          </g>
        ))}
      </g>
    );
  },
};

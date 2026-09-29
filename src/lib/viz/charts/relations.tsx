import { parseNumber } from "../data";
import { formatTick } from "../format";
import { band, linear, logScale, mixHex, readableOn, tickStep } from "../scale";
import { CategoryLabels, EmptyState, HaloText, XAxis, YAxis, fs, layoutCategoryLabels, tickLabelWidth } from "../parts";
import { pretty, textWidth, truncate } from "../text";
import type { ChartDefinition, LegendItem, OptionDef, RenderContext } from "../types";
import { dim } from "./common";
import { G } from "./glyphs";

/* ───────────────────────── Scatter & bubble ───────────────────────── */

type Pt = { x: number; y: number; s: number | null; label: string; group: string; i: number };

function points(c: RenderContext): Pt[] {
  const logX = c.opt("logX", false);
  const logY = c.opt("logY", false);
  const out: Pt[] = [];
  c.rows.forEach((r, i) => {
    const x = c.num(r, "x");
    const y = c.num(r, "y");
    if (x === null || y === null) return;
    if ((logX && x <= 0) || (logY && y <= 0)) return;
    out.push({ x, y, s: c.col("size") ? c.num(r, "size") : null, label: c.str(r, "label"), group: c.str(r, "group"), i });
  });
  return out;
}

function groups(c: RenderContext, pts: Pt[]): string[] {
  if (!c.col("group")) return [];
  const seen: string[] = [];
  for (const p of pts) if (!seen.includes(p.group) && seen.length < 12) seen.push(p.group);
  return seen;
}

function renderScatter(c: RenderContext) {
  const pts = points(c);
  if (!pts.length) return <EmptyState c={c} message="No numeric x/y pairs" />;
  const gs = groups(c, pts);
  const tSize = fs.tick(c);
  const logX = c.opt("logX", false);
  const logY = c.opt("logY", false);
  const zero = c.opt("zero", false);
  const xs = pts.map((p) => p.x);
  const ys = pts.map((p) => p.y);
  const sizes = pts.map((p) => p.s ?? 0).filter((s) => s > 0);
  const sMax = sizes.length ? Math.max(...sizes) : 1;
  const rMax = Math.min(c.width, c.height) * 0.07;
  const baseR = pts.length > 3000 ? 1.6 * c.u : pts.length > 600 ? 2.6 * c.u : pts.length > 150 ? 4 * c.u : 6 * c.u;
  const radius = (p: Pt) => (p.s !== null && p.s > 0 && c.col("size") ? Math.max(2.5 * c.u, Math.sqrt(p.s / sMax) * rMax) : baseR);
  const pad = c.col("size") ? rMax * 0.6 : baseR + 2 * c.u;
  const fmtLog = (t: number) => formatTick(t, t < 1 ? t : 1, { decimals: null, compact: true, prefix: "", suffix: "", locale: "en-US" });
  const mkY = (range: [number, number]) => (logY ? logScale(ys, range) : linear(ys, range, { zero }));
  let y = mkY([c.height, pad]);
  const tickW = logY ? Math.max(...y.ticks.map((t) => textWidth(fmtLog(t), tSize))) : tickLabelWidth(c, y);
  const left = tickW + 16 * c.u + tSize * 1.4;
  const bottom = c.height - tSize * 3.4;
  y = mkY([bottom - pad * 0.3, pad]);
  const x = logX ? logScale(xs, [left + pad, c.width - pad]) : linear(xs, [left + pad, c.width - pad], { zero });
  const colorOf = (p: Pt) => (gs.length ? c.color(Math.max(0, gs.indexOf(p.group))) : c.color(0));
  const bg = c.theme.background === "transparent" ? c.theme.surface : c.theme.background;
  const drawOrder = c.col("size") ? [...pts].sort((a, b) => (b.s ?? 0) - (a.s ?? 0)) : pts;

  // Trendline (least squares on the plotted scale).
  let trend: [number, number, number, number] | null = null;
  if (c.opt("trendline", false) && pts.length > 2) {
    const tx = pts.map((p) => (logX ? Math.log10(p.x) : p.x));
    const ty = pts.map((p) => (logY ? Math.log10(p.y) : p.y));
    const mx = tx.reduce((a, b) => a + b, 0) / tx.length;
    const my = ty.reduce((a, b) => a + b, 0) / ty.length;
    const num = tx.reduce((a, v, i) => a + (v - mx) * (ty[i] - my), 0);
    const den = tx.reduce((a, v) => a + (v - mx) ** 2, 0) || 1;
    const slope = num / den;
    const x0 = Math.min(...tx);
    const x1 = Math.max(...tx);
    const f = (v: number) => my + slope * (v - mx);
    const inv = (v: number, log: boolean) => (log ? Math.pow(10, v) : v);
    trend = [x(inv(x0, logX)), y(inv(f(x0), logY)), x(inv(x1, logX)), y(inv(f(x1), logY))];
  }

  // Point labels: all when few, else the most extreme ones.
  const labelMode = c.opt("pointLabels", "auto");
  const labelled = new Set<number>();
  if (c.col("label") && labelMode !== "none") {
    const limit = labelMode === "all" ? 200 : pts.length <= 15 ? pts.length : 8;
    const ranked = [...pts].sort((a, b) => (b.s ?? b.y) - (a.s ?? a.y));
    ranked.slice(0, limit).forEach((p) => labelled.add(p.i));
  }
  const lSize = fs.value(c) * 0.95;

  return (
    <g>
      {logY ? (
        <g>
          {y.ticks.map((t) => (
            <g key={t}>
              {c.grid && <line x1={left} x2={c.width} y1={y(t)} y2={y(t)} stroke={c.theme.grid} strokeWidth={c.u} />}
              <text x={left - 10 * c.u} y={y(t)} dy="0.35em" textAnchor="end" fontSize={tSize} fill={c.theme.muted} fontFamily={c.theme.fontNumeric}>
                {fmtLog(t)}
              </text>
            </g>
          ))}
        </g>
      ) : (
        <YAxis c={c} scale={y} x0={left} x1={c.width} />
      )}
      {logX ? (
        <g>
          {x.ticks.map((t) => (
            <g key={t}>
              {c.grid && <line x1={x(t)} x2={x(t)} y1={0} y2={bottom} stroke={c.theme.grid} strokeWidth={c.u} />}
              <text x={x(t)} y={bottom + 6 * c.u} dy="0.8em" textAnchor="middle" fontSize={tSize} fill={c.theme.muted} fontFamily={c.theme.fontNumeric}>
                {fmtLog(t)}
              </text>
            </g>
          ))}
        </g>
      ) : (
        <XAxis c={c} scale={x} y0={0} y1={bottom} labelY={bottom + 6 * c.u} />
      )}
      <text x={c.width} y={c.height - 2 * c.u} textAnchor="end" fontSize={tSize} fontWeight={700} fill={c.theme.text} fontFamily={c.theme.fontBody}>
        {pretty(c.col("x")) + (logX ? " (log)" : "")} →
      </text>
      <text transform={`translate(${tSize},${pad}) rotate(-90)`} textAnchor="end" fontSize={tSize} fontWeight={700} fill={c.theme.text} fontFamily={c.theme.fontBody}>
        {pretty(c.col("y")) + (logY ? " (log)" : "")} →
      </text>
      {trend && <line x1={trend[0]} y1={trend[1]} x2={trend[2]} y2={trend[3]} stroke={c.theme.ink} strokeWidth={2 * c.u} strokeDasharray={`${6 * c.u} ${5 * c.u}`} opacity={0.6} />}
      {drawOrder.map((p) => (
        <circle
          key={p.i}
          cx={x(p.x)}
          cy={y(p.y)}
          r={radius(p)}
          fill={colorOf(p)}
          fillOpacity={pts.length > 600 ? 0.6 : 0.78}
          stroke={pts.length > 600 ? "none" : bg}
          strokeWidth={c.u}
        >
          <title>
            {`${p.label ? p.label + " · " : ""}${c.col("x")}: ${c.fmt(p.x)} · ${c.col("y")}: ${c.fmt(p.y)}${p.s !== null && c.col("size") ? ` · ${c.col("size")}: ${c.fmt(p.s)}` : ""}`}
          </title>
        </circle>
      ))}
      {pts
        .filter((p) => labelled.has(p.i))
        .map((p) => (
          <HaloText key={`l${p.i}`} c={c} x={x(p.x) + radius(p) + 4 * c.u} y={y(p.y)} dy="0.35em" fontSize={lSize} fontWeight={600} fill={c.theme.ink} fontFamily={c.theme.fontBody}>
            {truncate(p.label, 160 * c.u, lSize)}
          </HaloText>
        ))}
    </g>
  );
}

const scatterFields = [
  { key: "x", label: { en: "X axis", es: "Eje X" }, type: "number" as const },
  { key: "y", label: { en: "Y axis", es: "Eje Y" }, type: "number" as const },
  { key: "size", label: { en: "Bubble size", es: "Tamaño de burbuja" }, type: "number" as const, required: false },
  { key: "label", label: { en: "Point labels", es: "Etiquetas de puntos" }, type: "string" as const, required: false },
  { key: "group", label: { en: "Color by", es: "Color por" }, type: "string" as const, required: false },
];

const scatterOptions: OptionDef[] = [
  { key: "trendline", label: { en: "Trend line", es: "Línea de tendencia" }, type: "boolean" as const, default: false },
  { key: "logX", label: { en: "Log scale X", es: "Escala log X" }, type: "boolean" as const, default: false },
  { key: "logY", label: { en: "Log scale Y", es: "Escala log Y" }, type: "boolean" as const, default: false },
  { key: "zero", label: { en: "Axes from zero", es: "Ejes desde cero" }, type: "boolean" as const, default: false },
  {
    key: "pointLabels",
    label: { en: "Point labels", es: "Etiquetas" },
    type: "select" as const,
    default: "auto",
    choices: [
      { value: "auto", label: { en: "Automatic", es: "Automático" } },
      { value: "all", label: { en: "All", es: "Todas" } },
      { value: "none", label: { en: "None", es: "Ninguna" } },
    ],
  },
];

const scatterLegend = (c: RenderContext): LegendItem[] | null => {
  const gs = groups(c, points(c));
  return gs.length > 1 ? gs.map((g, i) => ({ label: g || c.words.blank, color: c.color(i), shape: "circle" as const })) : null;
};

export const scatterChart: ChartDefinition = {
  id: "scatter",
  name: { en: "Scatter plot", es: "Dispersión" },
  description: { en: "Relationship between two numbers", es: "Relación entre dos números" },
  category: "relationship",
  glyph: G.scatter,
  keywords: ["correlation", "xy", "dots", "dispersion"],
  fields: scatterFields,
  options: scatterOptions,
  sample: {
    title: { en: "Richer countries live longer", es: "Los países más ricos viven más" },
    subtitle: { en: "GDP per capita (PPP, $) vs life expectancy (years), 2022", es: "PIB per cápita (PPA, $) vs. esperanza de vida (años), 2022" },
    source: "World Bank",
    rows: [
      { country: "Norway", gdp_per_capita: 114900, life_expectancy: 83.2, region: "Europe" },
      { country: "Germany", gdp_per_capita: 63100, life_expectancy: 80.7, region: "Europe" },
      { country: "Japan", gdp_per_capita: 45600, life_expectancy: 84.0, region: "Asia" },
      { country: "Chile", gdp_per_capita: 29900, life_expectancy: 79.5, region: "Americas" },
      { country: "Mexico", gdp_per_capita: 21500, life_expectancy: 74.8, region: "Americas" },
      { country: "China", gdp_per_capita: 21400, life_expectancy: 78.6, region: "Asia" },
      { country: "Peru", gdp_per_capita: 15000, life_expectancy: 76.7, region: "Americas" },
      { country: "Indonesia", gdp_per_capita: 14000, life_expectancy: 70.9, region: "Asia" },
      { country: "India", gdp_per_capita: 8400, life_expectancy: 70.2, region: "Asia" },
      { country: "Kenya", gdp_per_capita: 5700, life_expectancy: 62.1, region: "Africa" },
      { country: "Nigeria", gdp_per_capita: 5500, life_expectancy: 53.6, region: "Africa" },
      { country: "Ethiopia", gdp_per_capita: 2800, life_expectancy: 65.0, region: "Africa" },
    ],
  },
  legend: scatterLegend,
  render: renderScatter,
};

export const bubbleChart: ChartDefinition = {
  id: "bubble",
  name: { en: "Bubble chart", es: "Burbujas" },
  description: { en: "Scatter with a third number as bubble size", es: "Dispersión con un tercer número como tamaño" },
  category: "relationship",
  glyph: G.bubble,
  keywords: ["gapminder", "size", "three variables"],
  fields: scatterFields.map((f) => (f.key === "size" ? { ...f, required: true } : f)),
  options: scatterOptions.map((o) => (o.key === "logX" ? ({ ...o, default: true } as OptionDef) : o)),
  sample: {
    title: { en: "Population, wealth and health", es: "Población, riqueza y salud" },
    subtitle: { en: "GDP per capita (log) vs life expectancy; bubble = population", es: "PIB per cápita (log) vs. esperanza de vida; burbuja = población" },
    source: "World Bank, 2022",
    rows: [
      { country: "China", gdp_per_capita: 21400, life_expectancy: 78.6, population: 1412, region: "Asia" },
      { country: "India", gdp_per_capita: 8400, life_expectancy: 70.2, population: 1417, region: "Asia" },
      { country: "United States", gdp_per_capita: 76400, life_expectancy: 77.4, population: 333, region: "Americas" },
      { country: "Indonesia", gdp_per_capita: 14000, life_expectancy: 70.9, population: 276, region: "Asia" },
      { country: "Brazil", gdp_per_capita: 17800, life_expectancy: 73.4, population: 215, region: "Americas" },
      { country: "Nigeria", gdp_per_capita: 5500, life_expectancy: 53.6, population: 219, region: "Africa" },
      { country: "Japan", gdp_per_capita: 45600, life_expectancy: 84.0, population: 125, region: "Asia" },
      { country: "Germany", gdp_per_capita: 63100, life_expectancy: 80.7, population: 84, region: "Europe" },
      { country: "Ethiopia", gdp_per_capita: 2800, life_expectancy: 65.0, population: 123, region: "Africa" },
      { country: "Peru", gdp_per_capita: 15000, life_expectancy: 76.7, population: 34, region: "Americas" },
    ],
  },
  legend: scatterLegend,
  render: renderScatter,
};

/* ───────────────────────── Heatmap ───────────────────────── */

export const heatmapChart: ChartDefinition = {
  id: "heatmap",
  name: { en: "Heatmap", es: "Mapa de calor" },
  description: { en: "A grid of values: rows × columns", es: "Una matriz de valores: filas × columnas" },
  category: "relationship",
  glyph: G.heatmap,
  keywords: ["matrix", "grid", "calendar", "intensity"],
  fields: [
    { key: "row", label: { en: "Rows", es: "Filas" }, type: "string" },
    { key: "column", label: { en: "Columns", es: "Columnas" }, type: "string" },
    { key: "value", label: { en: "Values", es: "Valores" }, type: "number" },
  ],
  options: [
    {
      key: "scheme",
      label: { en: "Color scale", es: "Escala de color" },
      type: "select",
      default: "sequential",
      choices: [
        { value: "sequential", label: { en: "Low → high", es: "Bajo → alto" } },
        { value: "diverging", label: { en: "Negative ↔ positive", es: "Negativo ↔ positivo" } },
      ],
    },
  ],
  sample: {
    title: { en: "When the café is busiest", es: "Cuándo está más lleno el café" },
    subtitle: { en: "Average customers per hour", es: "Clientes promedio por hora" },
    source: "Point-of-sale data, 12 weeks",
    rows: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].flatMap((d, di) =>
      ["8am", "10am", "12pm", "2pm", "4pm", "6pm"].map((h, hi) => ({
        day: d,
        hour: h,
        customers: Math.round((di >= 5 ? 30 : 18) + [10, 4, 22, 8, 12, 16][hi] * (di >= 5 ? 1.4 : 1) + ((di * 7 + hi * 3) % 9)),
      })),
    ),
  },
  render: (c) => {
    const rowsKeys: string[] = [];
    const colKeys: string[] = [];
    const cells = new Map<string, number>();
    for (const r of c.rows) {
      const rk = c.str(r, "row");
      const ck = c.str(r, "column");
      const v = c.num(r, "value");
      if (v === null) continue;
      if (!rowsKeys.includes(rk)) {
        if (rowsKeys.length >= 60) continue;
        rowsKeys.push(rk);
      }
      if (!colKeys.includes(ck)) {
        if (colKeys.length >= 60) continue;
        colKeys.push(ck);
      }
      const key = rk + "\u0000" + ck;
      cells.set(key, (cells.get(key) ?? 0) + v);
    }
    if (!cells.size) return <EmptyState c={c} message={c.words.noData} />;
    const values = [...cells.values()];
    const vMin = Math.min(...values);
    const vMax = Math.max(...values);
    const diverging = c.opt("scheme", "sequential") === "diverging";
    const bg = c.theme.background === "transparent" ? c.theme.surface : c.theme.background;
    const base = /^#/.test(bg) ? bg : "#FFFFFF";
    const low = mixHex(c.color(0), base, 0.9);
    const colorFor = (v: number) => {
      if (diverging) {
        const m = Math.max(Math.abs(vMin), Math.abs(vMax)) || 1;
        return v >= 0 ? mixHex(base, c.color(0), v / m) : mixHex(base, c.theme.negative, -v / m);
      }
      return mixHex(low, c.color(0), (v - vMin) / (vMax - vMin || 1));
    };
    const lSize = fs.label(c);
    const labelW = Math.min(c.width * 0.25, Math.max(...rowsKeys.map((k) => textWidth(k, lSize)))) + 12 * c.u;
    const legendH = 34 * c.u;
    const xb = band(colKeys, [labelW, c.width], 0.06, 0);
    const layout = layoutCategoryLabels(c, colKeys, xb.step);
    const top = layout.rotate ? 0 : 0;
    const yb = band(rowsKeys, [top, c.height - layout.height - legendH], 0.06, 0);
    const vSize = Math.min(fs.value(c), yb.bandwidth * 0.45);
    const r = Math.min(c.corners * 0.6, xb.bandwidth / 4, yb.bandwidth / 4);
    const gradId = `${c.uid}-hm`;
    const lw = Math.min(260 * c.u, c.width - labelW);
    const ly = c.height - legendH * 0.45;
    return (
      <g>
        <defs>
          <linearGradient id={gradId}>
            {[0, 0.25, 0.5, 0.75, 1].map((t) => (
              <stop key={t} offset={`${t * 100}%`} stopColor={colorFor(vMin + (vMax - vMin) * t)} />
            ))}
          </linearGradient>
        </defs>
        {rowsKeys.map((rk) => (
          <text key={rk} x={labelW - 10 * c.u} y={yb.center(rk)} dy="0.35em" textAnchor="end" fontSize={Math.min(lSize, yb.step * 0.75)} fill={c.theme.text} fontFamily={c.theme.fontBody}>
            {truncate(rk, labelW - 12 * c.u, lSize)}
          </text>
        ))}
        {rowsKeys.map((rk) =>
          colKeys.map((ck) => {
            const v = cells.get(rk + "\u0000" + ck);
            const fill = v === undefined ? c.theme.grid : colorFor(v);
            const text = v === undefined ? "" : c.fmt(v);
            const fits = c.labels && v !== undefined && textWidth(text, vSize) < xb.bandwidth - 4 * c.u && yb.bandwidth > vSize * 1.3;
            return (
              <g key={rk + ck}>
                <rect x={xb(ck)} y={yb(rk)} width={xb.bandwidth} height={yb.bandwidth} rx={r} fill={fill} opacity={v === undefined ? 0.4 : 1}>
                  <title>{`${rk} · ${ck}: ${v === undefined ? "–" : c.fmt(v)}`}</title>
                </rect>
                {fits && (
                  <text x={xb.center(ck)} y={yb.center(rk)} dy="0.35em" textAnchor="middle" fontSize={vSize} fill={readableOn(fill)} fontFamily={c.theme.fontNumeric}>
                    {text}
                  </text>
                )}
              </g>
            );
          }),
        )}
        <CategoryLabels c={c} labels={colKeys} xFor={(i) => xb.center(colKeys[i])} y={c.height - layout.height - legendH} layout={layout} />
        <rect x={labelW} y={ly - 6 * c.u} width={lw} height={10 * c.u} rx={5 * c.u} fill={`url(#${gradId})`} />
        <text x={labelW} y={ly + 16 * c.u} fontSize={fs.tick(c)} fill={c.theme.muted} fontFamily={c.theme.fontNumeric}>
          {c.fmt(vMin)}
        </text>
        <text x={labelW + lw} y={ly + 16 * c.u} textAnchor="end" fontSize={fs.tick(c)} fill={c.theme.muted} fontFamily={c.theme.fontNumeric}>
          {c.fmt(vMax)}
        </text>
      </g>
    );
  },
};

/* ───────────────────────── Histogram ───────────────────────── */

export function binValues(values: number[], requested: number): { x0: number; x1: number; count: number }[] {
  if (!values.length) return [];
  const min = Math.min(...values);
  const max = Math.max(...values);
  if (min === max) return [{ x0: min - 0.5, x1: max + 0.5, count: values.length }];
  const target = requested > 0 ? requested : Math.min(40, Math.max(5, Math.ceil(Math.log2(values.length) + 1)));
  const step = tickStep(min, max, target);
  const start = Math.floor(min / step) * step;
  const n = Math.max(1, Math.ceil((max - start) / step + 1e-9));
  const bins = Array.from({ length: n }, (_, i) => ({ x0: +(start + i * step).toPrecision(12), x1: +(start + (i + 1) * step).toPrecision(12), count: 0 }));
  for (const v of values) {
    const i = Math.min(n - 1, Math.floor((v - start) / step + 1e-9));
    bins[i].count++;
  }
  return bins;
}

export const histogramChart: ChartDefinition = {
  id: "histogram",
  name: { en: "Histogram", es: "Histograma" },
  description: { en: "How values are distributed", es: "Cómo se distribuyen los valores" },
  category: "distribution",
  glyph: G.histogram,
  keywords: ["distribution", "frequency", "bins", "spread"],
  fields: [{ key: "value", label: { en: "Values", es: "Valores" }, type: "number" }],
  options: [
    { key: "bins", label: { en: "Bins (0 = auto)", es: "Intervalos (0 = auto)" }, type: "number", default: 0, min: 0, max: 80, step: 1 },
    { key: "showMean", label: { en: "Mark the average", es: "Marcar el promedio" }, type: "boolean", default: true },
  ],
  minRows: 2,
  sample: {
    title: { en: "Most commutes take under 40 minutes", es: "La mayoría de trayectos toma menos de 40 min" },
    subtitle: { en: "One-way commute time of 400 surveyed workers, minutes", es: "Tiempo de trayecto de 400 trabajadores encuestados, minutos" },
    source: "Commuter survey (synthetic)",
    rows: Array.from({ length: 400 }, (_, i) => {
      // Deterministic right-skewed distribution.
      const u1 = ((i * 9301 + 49297) % 233280) / 233280;
      const u2 = ((i * 4096 + 150889) % 714025) / 714025;
      const g = Math.sqrt(-2 * Math.log(u1 || 0.5)) * Math.cos(2 * Math.PI * u2);
      return { minutes: Math.max(3, Math.round(Math.exp(3.25 + g * 0.45))) };
    }),
  },
  render: (c) => {
    const values = c.rows.map((r) => c.num(r, "value")).filter((v): v is number => v !== null);
    if (values.length < 2) return <EmptyState c={c} message="Need at least 2 numbers" />;
    const bins = binValues(values, c.opt("bins", 0));
    const counts = bins.map((b) => b.count);
    const vSize = fs.value(c) * 0.9;
    const tSize = fs.tick(c);
    const top = c.labels ? vSize * 1.7 : 6 * c.u;
    let y = linear(counts, [c.height, top]);
    const left = tickLabelWidth(c, y) + 14 * c.u;
    const bottom = c.height - tSize * 2.4;
    y = linear(counts, [bottom, top]);
    const x0 = bins[0].x0;
    const x1 = bins[bins.length - 1].x1;
    const xs = (v: number) => left + ((v - x0) / (x1 - x0 || 1)) * (c.width - left);
    const bw = (c.width - left) / bins.length;
    const every = Math.max(1, Math.ceil((textWidth(c.fmt(x1), tSize) + 14 * c.u) / bw));
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const step = bins[0].x1 - bins[0].x0;
    return (
      <g>
        <YAxis c={c} scale={y} x0={left} x1={c.width} />
        {bins.map((b, i) => {
          const h = bottom - y(b.count);
          return (
            <g key={i}>
              <rect x={xs(b.x0) + 1 * c.u} y={y(b.count)} width={Math.max(0, bw - 2 * c.u)} height={Math.max(0, h)} rx={Math.min(c.corners * 0.5, bw / 4)} fill={c.color(0)}>
                <title>{`${c.fmtTick(b.x0, step)} – ${c.fmtTick(b.x1, step)}: ${b.count}`}</title>
              </rect>
              {c.labels && b.count > 0 && textWidth(String(b.count), vSize) < bw && (
                <text x={xs(b.x0) + bw / 2} y={y(b.count) - vSize * 0.5} textAnchor="middle" fontSize={vSize} fill={c.theme.text} fontFamily={c.theme.fontNumeric}>
                  {b.count}
                </text>
              )}
            </g>
          );
        })}
        {[...bins.map((b) => b.x0), x1].map((edge, i) =>
          i % every === 0 ? (
            <text key={i} x={xs(edge)} y={bottom + 6 * c.u} dy="0.8em" textAnchor="middle" fontSize={tSize} fill={c.theme.muted} fontFamily={c.theme.fontNumeric}>
              {c.fmtTick(edge, step)}
            </text>
          ) : null,
        )}
        {c.opt("showMean", true) && (
          <g>
            <line x1={xs(mean)} x2={xs(mean)} y1={top} y2={bottom} stroke={c.theme.ink} strokeWidth={2 * c.u} strokeDasharray={`${5 * c.u} ${4 * c.u}`} />
            <HaloText c={c} x={xs(mean) + 6 * c.u} y={top + tSize} fontSize={tSize} fontWeight={700} fill={c.theme.ink}>
              {`${c.words.average} ${c.fmt(mean)}`}
            </HaloText>
          </g>
        )}
      </g>
    );
  },
};

/* ───────────────────────── Box plot ───────────────────────── */

/** Deterministic pseudo-random number in [0, 1) for jittering points. */
function jitter(i: number): number {
  const x = Math.sin(i * 12.9898 + 78.233) * 43758.5453;
  return x - Math.floor(x);
}

export function quantile(sorted: number[], p: number): number {
  if (!sorted.length) return NaN;
  const i = (sorted.length - 1) * p;
  const lo = Math.floor(i);
  const hi = Math.ceil(i);
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (i - lo);
}

export const boxplotChart: ChartDefinition = {
  id: "boxplot",
  name: { en: "Box plot", es: "Diagrama de caja" },
  description: { en: "Compare spread and median across groups", es: "Compara dispersión y mediana entre grupos" },
  category: "distribution",
  glyph: G.boxplot,
  keywords: ["quartile", "median", "spread", "outliers"],
  fields: [
    { key: "group", label: { en: "Groups", es: "Grupos" }, type: "string" },
    { key: "value", label: { en: "Values", es: "Valores" }, type: "number" },
  ],
  options: [{ key: "points", label: { en: "Show every point", es: "Mostrar cada punto" }, type: "boolean", default: true }],
  minRows: 2,
  sample: {
    title: { en: "Delivery times by courier", es: "Tiempos de entrega por courier" },
    subtitle: { en: "Hours from order to doorstep, last 300 orders", es: "Horas desde la orden hasta la puerta, últimas 300 órdenes" },
    source: "Order logs (synthetic)",
    rows: ["Rapido", "Northwind", "Parcelo", "Velox"].flatMap((g, gi) =>
      Array.from({ length: 75 }, (_, i) => {
        const u = ((i * 7919 + gi * 104729) % 1000) / 1000;
        const u2 = ((i * 104723 + gi * 7907) % 997) / 997;
        const skew = [1, 1.35, 0.8, 1.15][gi];
        return { courier: g, hours: Math.round((18 + 26 * skew * u * u + 10 * u2 + (i % 37 === 0 ? 40 : 0)) * 10) / 10 };
      }),
    ),
  },
  render: (c) => {
    const groups = new Map<string, number[]>();
    for (const r of c.rows) {
      const v = c.num(r, "value");
      if (v === null) continue;
      const g = c.str(r, "group") || "(all)";
      if (!groups.has(g)) {
        if (groups.size >= 30) continue;
        groups.set(g, []);
      }
      groups.get(g)!.push(v);
    }
    if (!groups.size) return <EmptyState c={c} message={c.words.noData} />;
    const keys = [...groups.keys()];
    const stats = keys.map((k) => {
      const s = [...groups.get(k)!].sort((a, b) => a - b);
      const q1 = quantile(s, 0.25);
      const q3 = quantile(s, 0.75);
      const iqr = q3 - q1;
      const lo = s.find((v) => v >= q1 - 1.5 * iqr) ?? s[0];
      const hi = [...s].reverse().find((v) => v <= q3 + 1.5 * iqr) ?? s[s.length - 1];
      return { k, s, q1, q3, med: quantile(s, 0.5), lo, hi };
    });
    const all = stats.flatMap((s) => s.s);
    let y = linear(all, [c.height, 8 * c.u], { zero: false });
    const left = tickLabelWidth(c, y) + 14 * c.u;
    const x = band(keys, [left, c.width], 0.4);
    const layout = layoutCategoryLabels(c, keys, x.step);
    const bottom = c.height - layout.height;
    y = linear(all, [bottom, 8 * c.u], { zero: false });
    const showPts = c.opt("points", true);
    return (
      <g>
        <YAxis c={c} scale={y} x0={left} x1={c.width} showZero={false} />
        {stats.map((st, i) => {
          const cx = x.center(st.k);
          const w = x.bandwidth;
          const color = c.color(i);
          return (
            <g key={st.k}>
              {showPts &&
                st.s.map((v, j) => (
                  <circle key={j} cx={cx + (jitter(j) - 0.5) * w * 0.9} cy={y(v)} r={2.2 * c.u} fill={color} opacity={0.35} />
                ))}
              <line x1={cx} x2={cx} y1={y(st.hi)} y2={y(st.q3)} stroke={c.theme.ink} strokeWidth={1.5 * c.u} />
              <line x1={cx} x2={cx} y1={y(st.q1)} y2={y(st.lo)} stroke={c.theme.ink} strokeWidth={1.5 * c.u} />
              <line x1={cx - w * 0.2} x2={cx + w * 0.2} y1={y(st.hi)} y2={y(st.hi)} stroke={c.theme.ink} strokeWidth={1.5 * c.u} />
              <line x1={cx - w * 0.2} x2={cx + w * 0.2} y1={y(st.lo)} y2={y(st.lo)} stroke={c.theme.ink} strokeWidth={1.5 * c.u} />
              <rect x={cx - w / 2} y={y(st.q3)} width={w} height={Math.max(1, y(st.q1) - y(st.q3))} rx={Math.min(c.corners, w / 6)} fill={dim(c, color, 0.45)} stroke={color} strokeWidth={2 * c.u}>
                <title>{`${st.k}: median ${c.fmt(st.med)}, IQR ${c.fmt(st.q1)}–${c.fmt(st.q3)}, n=${st.s.length}`}</title>
              </rect>
              <line x1={cx - w / 2} x2={cx + w / 2} y1={y(st.med)} y2={y(st.med)} stroke={c.theme.ink} strokeWidth={3 * c.u} />
              {st.s
                .filter((v) => v < st.lo || v > st.hi)
                .map((v, j) => (
                  <circle key={`o${j}`} cx={cx} cy={y(v)} r={3.2 * c.u} fill="none" stroke={c.theme.ink} strokeWidth={1.3 * c.u} />
                ))}
              {c.labels && (
                <HaloText c={c} x={cx + w / 2 + 6 * c.u} y={y(st.med)} dy="0.35em" fontSize={fs.value(c) * 0.9} fontWeight={700} fill={c.theme.ink}>
                  {c.fmt(st.med)}
                </HaloText>
              )}
            </g>
          );
        })}
        <CategoryLabels c={c} labels={keys} xFor={(i) => x.center(keys[i])} y={bottom} layout={layout} />
      </g>
    );
  },
};

/* ───────────────────────── Radar ───────────────────────── */

export const radarChart: ChartDefinition = {
  id: "radar",
  name: { en: "Radar chart", es: "Radar" },
  description: { en: "Profiles across several dimensions", es: "Perfiles en varias dimensiones" },
  category: "distribution",
  glyph: G.radar,
  keywords: ["spider", "profile", "skills", "multivariate"],
  fields: [
    { key: "axis", label: { en: "Dimensions", es: "Dimensiones" }, type: "string" },
    { key: "series", label: { en: "Profiles (numeric columns)", es: "Perfiles (columnas numéricas)" }, type: "number", multiple: true },
  ],
  options: [{ key: "fill", label: { en: "Fill shapes", es: "Rellenar formas" }, type: "boolean", default: true }],
  minRows: 3,
  sample: {
    title: { en: "Two phones, head to head", es: "Dos teléfonos, cara a cara" },
    subtitle: { en: "Reviewer scores out of 10", es: "Puntajes de reseñas sobre 10" },
    source: "Aggregated reviews (illustrative)",
    rows: [
      { feature: "Camera", "Phone A": 9.1, "Phone B": 8.2 },
      { feature: "Battery", "Phone A": 7.0, "Phone B": 9.0 },
      { feature: "Display", "Phone A": 8.8, "Phone B": 8.5 },
      { feature: "Speed", "Phone A": 9.0, "Phone B": 8.0 },
      { feature: "Price", "Phone A": 5.5, "Phone B": 8.1 },
      { feature: "Design", "Phone A": 8.4, "Phone B": 7.2 },
    ],
  },
  legend: (c) => c.cols("series").map((s, i) => ({ label: pretty(s), color: c.color(i) })),
  render: (c) => {
    const series = c.cols("series");
    const rows = c.rows.slice(0, 24);
    const n = rows.length;
    if (n < 3 || !series.length) return <EmptyState c={c} message="Needs 3+ dimensions" />;
    const lSize = fs.label(c);
    const labels = rows.map((r) => c.str(r, "axis"));
    const labelW = Math.min(c.width * 0.22, Math.max(...labels.map((l) => textWidth(l, lSize))));
    const R = Math.max(30 * c.u, Math.min(c.height / 2 - lSize * 1.6, c.width / 2 - labelW - 20 * c.u));
    const cx = c.width / 2;
    const cy = c.height / 2;
    const vals = rows.flatMap((r) => series.map((s) => parseNumber(r[s]) ?? 0));
    const scale = linear(vals, [0, R], { ticks: 4 });
    const ang = (i: number) => (i / n) * Math.PI * 2;
    const pt = (i: number, r: number) => [cx + r * Math.sin(ang(i)), cy - r * Math.cos(ang(i))];
    return (
      <g>
        {scale.ticks.filter((t) => t > 0).map((t) => (
          <polygon key={t} points={rows.map((_, i) => pt(i, scale(t)).join(",")).join(" ")} fill="none" stroke={c.theme.grid} strokeWidth={c.u} />
        ))}
        {rows.map((_, i) => {
          const [x, y] = pt(i, R);
          return <line key={i} x1={cx} y1={cy} x2={x} y2={y} stroke={c.theme.grid} strokeWidth={c.u} />;
        })}
        {scale.ticks.filter((t) => t > 0 && scale(t) < R * 0.97).map((t) => (
          <text key={`t${t}`} x={cx + 4 * c.u} y={cy - scale(t)} dy="-0.2em" fontSize={fs.tick(c) * 0.9} fill={c.theme.muted} fontFamily={c.theme.fontNumeric}>
            {c.fmtTick(t, scale.step)}
          </text>
        ))}
        {series.map((s, si) => {
          const color = c.color(si);
          const pts = rows.map((r, i) => pt(i, scale(Math.max(0, parseNumber(r[s]) ?? 0))));
          return (
            <g key={s}>
              <polygon points={pts.map((p) => p.join(",")).join(" ")} fill={color} fillOpacity={c.opt("fill", true) ? 0.18 : 0} stroke={color} strokeWidth={2.5 * c.u} strokeLinejoin="round" />
              {pts.map(([x, y], i) => (
                <circle key={i} cx={x} cy={y} r={3.5 * c.u} fill={color}>
                  <title>{`${s} · ${labels[i]}: ${c.fmt(parseNumber(rows[i][s]) ?? 0)}`}</title>
                </circle>
              ))}
            </g>
          );
        })}
        {labels.map((l, i) => {
          const [x, y] = pt(i, R + 14 * c.u);
          const s = Math.sin(ang(i));
          return (
            <text key={i} x={x} y={y} dy="0.35em" textAnchor={Math.abs(s) < 0.2 ? "middle" : s > 0 ? "start" : "end"} fontSize={lSize} fontWeight={600} fill={c.theme.text} fontFamily={c.theme.fontBody}>
              {truncate(l, labelW, lSize)}
            </text>
          );
        })}
      </g>
    );
  },
};

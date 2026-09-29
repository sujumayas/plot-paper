import { band, readableOn } from "../scale";
import { EmptyState, arcPath, fs } from "../parts";
import { textWidth, truncate, wrapText } from "../text";
import type { ChartDefinition, RenderContext } from "../types";
import { aggregateOption, categoryItems, dim, maxItemsOption, sortOption } from "./common";
import { G } from "./glyphs";
import { placeLabels } from "./lines";

const labelField = { key: "label", label: { en: "Categories", es: "Categorías" }, type: "string" as const };
const valueField = { key: "value", label: { en: "Values", es: "Valores" }, type: "number" as const };

type Part = { label: string; value: number; pct: number; color: string };

function parts(c: RenderContext, maxDefault = 8, sortDefault = "desc"): Part[] {
  const col = c.col("value");
  if (!col) return [];
  const items = categoryItems(c, "label", [col], { sortDefault, maxDefault }).filter((i) => i.values[0] > 0);
  const total = items.reduce((a, i) => a + i.values[0], 0) || 1;
  return items.map((i, k) => ({ label: i.label, value: i.values[0], pct: i.values[0] / total, color: c.color(k) }));
}

const pct = (p: number) => (p < 0.01 && p > 0 ? "<1%" : `${Math.round(p * 100)}%`);

/** Percentages that add up to exactly 100 (largest remainder). */
export function roundShares(values: number[], total = 100): number[] {
  const sum = values.reduce((a, b) => a + b, 0) || 1;
  const raw = values.map((v) => (v / sum) * total);
  const floor = raw.map(Math.floor);
  let rest = total - floor.reduce((a, b) => a + b, 0);
  const order = raw.map((r, i) => ({ i, f: r - Math.floor(r) })).sort((a, b) => b.f - a.f);
  for (const o of order) {
    if (rest <= 0) break;
    floor[o.i]++;
    rest--;
  }
  return floor;
}

/* ───────────────────────── Pie & donut ───────────────────────── */

function renderPie(c: RenderContext, donut: boolean) {
  const ps = parts(c, c.opt("maxItems", 8));
  if (!ps.length) return <EmptyState c={c} message="Values must be positive" />;
  const tall = c.height > c.width * 1.15;
  if (tall && c.opt("labelStyle", "outside") === "outside") return renderPieStacked(c, ps, donut);
  const outside = c.opt("labelStyle", "outside") === "outside";
  const lSize = fs.label(c);
  const showValues = c.opt("showValues", false);
  const labelText = (p: Part) => `${p.label}  ${showValues ? c.fmt(p.value) + " · " : ""}${pct(p.pct)}`;
  const labelW = outside ? Math.min(c.width * 0.3, Math.max(...ps.map((p) => textWidth(labelText(p), lSize)))) : 0;
  const R = Math.max(20 * c.u, Math.min(c.height / 2 - (outside ? lSize : 4 * c.u), (c.width - labelW * 2) / 2 - 40 * c.u));
  const cx = c.width / 2;
  const cy = c.height / 2;
  const inner = donut ? R * c.opt("hole", 0.6) : 0;
  let a = 0;
  const arcs = ps.map((p) => {
    const a0 = a;
    a += p.pct * Math.PI * 2;
    return { ...p, a0, a1: a, mid: (a0 + a) / 2 };
  });
  const bg = c.theme.background === "transparent" ? c.theme.surface : c.theme.background;

  // Outside labels: per side, resolve collisions.
  const right = arcs.map((ar, i) => ({ ar, i })).filter((d) => Math.sin(d.ar.mid) >= 0);
  const left = arcs.map((ar, i) => ({ ar, i })).filter((d) => Math.sin(d.ar.mid) < 0);
  const ys: number[] = new Array(arcs.length).fill(0);
  for (const side of [right, left]) {
    const placed = placeLabels(side.map((d) => cy - (R + 18 * c.u) * Math.cos(d.ar.mid)), lSize * 1.35, 0, c.height);
    side.forEach((d, k) => (ys[d.i] = placed[k]!));
  }
  const total = ps.reduce((s, p) => s + p.value, 0);
  const center = c.opt("centerText", "") as string;
  return (
    <g>
      {arcs.map((ar, i) => (
        <path key={i} d={arcPath(cx, cy, R, inner, ar.a0, ar.a1)} fill={ar.color} fillRule="evenodd" stroke={bg} strokeWidth={2 * c.u}>
          <title>{`${ar.label}: ${c.fmt(ar.value)} (${pct(ar.pct)})`}</title>
        </path>
      ))}
      {outside
        ? arcs.map((ar, i) => {
            const sx = Math.sin(ar.mid);
            const px = cx + R * sx;
            const py = cy - R * Math.cos(ar.mid);
            const ex = cx + (R + 16 * c.u) * (sx >= 0 ? 1 : -1) * Math.max(Math.abs(sx), 0.35);
            const lx = sx >= 0 ? cx + R + 24 * c.u : cx - R - 24 * c.u;
            return (
              <g key={i}>
                <polyline points={`${px},${py} ${ex},${ys[i]} ${lx - (sx >= 0 ? 4 : -4) * c.u},${ys[i]}`} fill="none" stroke={c.theme.axis} strokeWidth={c.u} />
                <text x={lx} y={ys[i]} dy="0.35em" textAnchor={sx >= 0 ? "start" : "end"} fontSize={lSize} fill={c.theme.text} fontFamily={c.theme.fontBody}>
                  <tspan fontWeight={700} fill={c.theme.ink}>{truncate(ar.label, labelW - textWidth(`  ${showValues ? c.fmt(ar.value) + " · " : ""}${pct(ar.pct)}`, lSize), lSize)}</tspan>
                  <tspan fill={c.theme.muted}>{`  ${showValues ? c.fmt(ar.value) + " · " : ""}${pct(ar.pct)}`}</tspan>
                </text>
              </g>
            );
          })
        : arcs.map((ar, i) => {
            if (ar.pct < 0.05) return null;
            const r = inner ? (R + inner) / 2 : R * 0.64;
            return (
              <text key={i} x={cx + r * Math.sin(ar.mid)} y={cy - r * Math.cos(ar.mid)} dy="0.35em" textAnchor="middle" fontSize={lSize} fontWeight={700} fill={readableOn(ar.color)} fontFamily={c.theme.fontNumeric}>
                {pct(ar.pct)}
              </text>
            );
          })}
      {donut && inner > 40 * c.u && (
        <g>
          <text x={cx} y={cy} dy={center ? "0.35em" : "0.1em"} textAnchor="middle" fontSize={Math.min(inner * 0.42, fs.big(c) * 0.8)} fontWeight={700} fill={c.theme.ink} fontFamily={c.theme.fontDisplay}>
            {center ? truncate(center, inner * 1.7, Math.min(inner * 0.42, fs.big(c) * 0.8)) : c.fmt(total)}
          </text>
          {!center && (
            <text x={cx} y={cy + Math.min(inner * 0.42, fs.big(c) * 0.8) * 0.75} textAnchor="middle" fontSize={fs.tick(c)} fill={c.theme.muted} letterSpacing={1.5 * c.u} fontFamily={c.theme.fontBody}>
              {c.words.total.toUpperCase()}
            </text>
          )}
        </g>
      )}
    </g>
  );
}

/** Tall canvases: pie on top, a tidy label list underneath. */
function renderPieStacked(c: RenderContext, ps: Part[], donut: boolean) {
  const lSize = fs.label(c) * 1.1;
  const rowH = lSize * 1.9;
  const cols = ps.length > 5 && c.width > 500 * c.u ? 2 : 1;
  const listH = Math.ceil(ps.length / cols) * rowH;
  const R = Math.max(30 * c.u, Math.min(c.width / 2 - 8 * c.u, (c.height - listH - 30 * c.u) / 2));
  const cx = c.width / 2;
  const cy = R + 4 * c.u;
  const inner = donut ? R * c.opt("hole", 0.6) : 0;
  const bg = c.theme.background === "transparent" ? c.theme.surface : c.theme.background;
  let a = 0;
  const total = ps.reduce((s, p) => s + p.value, 0);
  const center = c.opt("centerText", "") as string;
  const showValues = c.opt("showValues", false);
  const colW = c.width / cols;
  const listY = cy + R + 30 * c.u;
  const big = Math.min(inner * 0.42, fs.big(c));
  return (
    <g>
      {ps.map((p, i) => {
        const a0 = a;
        a += p.pct * Math.PI * 2;
        return (
          <path key={i} d={arcPath(cx, cy, R, inner, a0, a)} fill={p.color} fillRule="evenodd" stroke={bg} strokeWidth={2 * c.u}>
            <title>{`${p.label}: ${c.fmt(p.value)} (${pct(p.pct)})`}</title>
          </path>
        );
      })}
      {donut && inner > 40 * c.u && (
        <text x={cx} y={cy} dy="0.35em" textAnchor="middle" fontSize={big} fontWeight={700} fill={c.theme.ink} fontFamily={c.theme.fontDisplay}>
          {center ? truncate(center, inner * 1.7, big) : c.fmt(total)}
        </text>
      )}
      {ps.map((p, i) => {
        const x = (i % cols) * colW + (cols === 1 ? c.width * 0.12 : 8 * c.u);
        const y = listY + Math.floor(i / cols) * rowH;
        const right = (i % cols) * colW + colW - (cols === 1 ? c.width * 0.12 : 8 * c.u);
        const val = `${showValues ? c.fmt(p.value) + " · " : ""}${pct(p.pct)}`;
        return (
          <g key={`l${i}`}>
            <rect x={x} y={y - lSize * 0.45} width={lSize * 0.9} height={lSize * 0.9} rx={lSize * 0.2} fill={p.color} />
            <text x={x + lSize * 1.4} y={y} dy="0.35em" fontSize={lSize} fontWeight={600} fill={c.theme.ink} fontFamily={c.theme.fontBody}>
              {truncate(p.label, right - x - lSize * 1.4 - textWidth(val, lSize) - 12 * c.u, lSize)}
            </text>
            <text x={right} y={y} dy="0.35em" textAnchor="end" fontSize={lSize} fill={c.theme.muted} fontFamily={c.theme.fontNumeric}>
              {val}
            </text>
          </g>
        );
      })}
    </g>
  );
}

const pieOptions = [
  {
    key: "labelStyle",
    label: { en: "Labels", es: "Etiquetas" },
    type: "select" as const,
    default: "outside",
    choices: [
      { value: "outside", label: { en: "Outside with names", es: "Afuera con nombres" } },
      { value: "legend", label: { en: "Legend + % inside", es: "Leyenda + % dentro" } },
    ],
  },
  { key: "showValues", label: { en: "Show values too", es: "Mostrar también valores" }, type: "boolean" as const, default: false },
  maxItemsOption(8, 20),
  aggregateOption,
];

const pieLegend = (c: RenderContext) =>
  c.opt("labelStyle", "outside") === "legend" ? parts(c, c.opt("maxItems", 8)).map((p) => ({ label: p.label, color: p.color })) : null;

export const pieChart: ChartDefinition = {
  id: "pie",
  name: { en: "Pie chart", es: "Torta" },
  description: { en: "Parts of a whole (keep it to a few slices)", es: "Partes de un todo (pocas porciones)" },
  category: "composition",
  glyph: G.pie,
  keywords: ["share", "proportion", "percentage", "pastel", "torta"],
  fields: [labelField, valueField],
  options: pieOptions,
  sample: {
    title: { en: "Where a typical monthly budget goes", es: "A dónde va un presupuesto mensual típico" },
    subtitle: { en: "Share of household spending", es: "Participación del gasto del hogar" },
    source: "Household budget survey (rounded)",
    rows: [
      { category: "Housing", share: 33 },
      { category: "Transport", share: 17 },
      { category: "Food", share: 13 },
      { category: "Insurance & savings", share: 12 },
      { category: "Health", share: 8 },
      { category: "Other", share: 17 },
    ],
  },
  legend: pieLegend,
  render: (c) => renderPie(c, false),
};

export const donutChart: ChartDefinition = {
  id: "donut",
  name: { en: "Donut chart", es: "Dona" },
  description: { en: "Parts of a whole with the total in the middle", es: "Partes de un todo con el total al centro" },
  category: "composition",
  glyph: G.donut,
  keywords: ["share", "ring", "doughnut", "proportion"],
  fields: [labelField, valueField],
  options: [
    ...pieOptions,
    { key: "hole", label: { en: "Hole size", es: "Tamaño del hueco" }, type: "number", default: 0.6, min: 0.3, max: 0.85, step: 0.05 },
    { key: "centerText", label: { en: "Center text", es: "Texto central" }, type: "text", default: "" },
  ],
  sample: {
    title: { en: "Most web traffic now comes from phones", es: "La mayoría del tráfico web viene del móvil" },
    subtitle: { en: "Share of global page views by device, 2024", es: "Participación de páginas vistas por dispositivo, 2024" },
    source: "StatCounter",
    rows: [
      { device: "Mobile", share: 61.5 },
      { device: "Desktop", share: 36.3 },
      { device: "Tablet", share: 2.2 },
    ],
  },
  legend: pieLegend,
  render: (c) => renderPie(c, true),
};

/* ───────────────────────── Treemap ───────────────────────── */

type Rect = { x: number; y: number; w: number; h: number };

/** Squarified treemap layout (Bruls et al.). Values must be positive, sorted desc. */
export function squarify(values: number[], rect: Rect): Rect[] {
  const total = values.reduce((a, b) => a + b, 0);
  if (total <= 0) return values.map(() => ({ x: rect.x, y: rect.y, w: 0, h: 0 }));
  const scale = (rect.w * rect.h) / total;
  const areas = values.map((v) => v * scale);
  const out: Rect[] = [];
  let r = { ...rect };
  let row: number[] = [];
  let i = 0;
  const worst = (row: number[], side: number) => {
    const s = row.reduce((a, b) => a + b, 0);
    const max = Math.max(...row);
    const min = Math.min(...row);
    return Math.max((side * side * max) / (s * s), (s * s) / (side * side * min));
  };
  const layoutRow = (row: number[]) => {
    const s = row.reduce((a, b) => a + b, 0);
    if (r.w >= r.h) {
      const w = s / r.h;
      let y = r.y;
      for (const a of row) {
        out.push({ x: r.x, y, w, h: a / w });
        y += a / w;
      }
      r = { x: r.x + w, y: r.y, w: r.w - w, h: r.h };
    } else {
      const h = s / r.w;
      let x = r.x;
      for (const a of row) {
        out.push({ x, y: r.y, w: a / h, h });
        x += a / h;
      }
      r = { x: r.x, y: r.y + h, w: r.w, h: r.h - h };
    }
  };
  while (i < areas.length) {
    const side = Math.min(r.w, r.h);
    const a = areas[i];
    if (!row.length || worst([...row, a], side) <= worst(row, side)) {
      row.push(a);
      i++;
    } else {
      layoutRow(row);
      row = [];
    }
  }
  if (row.length) layoutRow(row);
  return out;
}

export const treemapChart: ChartDefinition = {
  id: "treemap",
  name: { en: "Treemap", es: "Mapa de árbol" },
  description: { en: "Many parts of a whole as nested rectangles", es: "Muchas partes de un todo como rectángulos" },
  category: "composition",
  glyph: G.treemap,
  keywords: ["hierarchy", "area", "share", "market cap"],
  fields: [labelField, valueField],
  options: [
    {
      key: "colorBy",
      label: { en: "Colors", es: "Colores" },
      type: "select",
      default: "category",
      choices: [
        { value: "category", label: { en: "One per item", es: "Uno por elemento" } },
        { value: "single", label: { en: "Shades of one color", es: "Tonos de un color" } },
      ],
    },
    maxItemsOption(24, 80),
    aggregateOption,
  ],
  sample: {
    title: { en: "The world's largest economies", es: "Las economías más grandes del mundo" },
    subtitle: { en: "GDP, current US$ trillions, 2024", es: "PIB, billones de US$ corrientes, 2024" },
    source: "IMF World Economic Outlook",
    rows: [
      { country: "United States", gdp: 29.2 },
      { country: "China", gdp: 18.7 },
      { country: "Germany", gdp: 4.7 },
      { country: "Japan", gdp: 4.0 },
      { country: "India", gdp: 3.9 },
      { country: "United Kingdom", gdp: 3.6 },
      { country: "France", gdp: 3.2 },
      { country: "Italy", gdp: 2.4 },
      { country: "Canada", gdp: 2.2 },
      { country: "Brazil", gdp: 2.2 },
      { country: "Russia", gdp: 2.2 },
      { country: "Mexico", gdp: 1.9 },
    ],
  },
  render: (c) => {
    const ps = parts(c, c.opt("maxItems", 24));
    if (!ps.length) return <EmptyState c={c} message="Values must be positive" />;
    const sorted = [...ps].sort((a, b) => b.value - a.value);
    const rects = squarify(sorted.map((p) => p.value), { x: 0, y: 0, w: c.width, h: c.height });
    const single = c.opt("colorBy", "category") === "single";
    const gap = 2 * c.u;
    const bg = c.theme.background === "transparent" ? c.theme.surface : c.theme.background;
    return (
      <g>
        {sorted.map((p, i) => {
          const r = rects[i];
          const fill = single ? dim(c, c.color(0), Math.min(0.75, (i / sorted.length) * 0.8)) : p.color;
          const ink = readableOn(fill);
          const size = Math.max(10 * c.u, Math.min(fs.label(c) * 1.3, r.w / 7, r.h / 3));
          const lines = wrapText(p.label, r.w - 14 * c.u, size, 2, 700);
          const fitsText = r.w > 44 * c.u && r.h > size * 2.6;
          return (
            <g key={i}>
              <rect x={r.x + gap / 2} y={r.y + gap / 2} width={Math.max(0, r.w - gap)} height={Math.max(0, r.h - gap)} rx={Math.min(c.corners, r.w / 4, r.h / 4)} fill={fill} stroke={bg} strokeWidth={0}>
                <title>{`${p.label}: ${c.fmt(p.value)} (${pct(p.pct)})`}</title>
              </rect>
              {fitsText && (
                <g>
                  {lines.map((l, k) => (
                    <text key={k} x={r.x + 8 * c.u} y={r.y + 8 * c.u + size * (k + 0.95)} fontSize={size} fontWeight={700} fill={ink} fontFamily={c.theme.fontBody}>
                      {l}
                    </text>
                  ))}
                  {r.h > size * (lines.length + 2) && (
                    <text x={r.x + 8 * c.u} y={r.y + 8 * c.u + size * (lines.length + 1.1)} fontSize={size * 0.85} fill={ink} opacity={0.85} fontFamily={c.theme.fontNumeric}>
                      {c.labels ? `${c.fmt(p.value)} · ${pct(p.pct)}` : pct(p.pct)}
                    </text>
                  )}
                </g>
              )}
            </g>
          );
        })}
      </g>
    );
  },
};

/* ───────────────────────── Waffle ───────────────────────── */

export const waffleChart: ChartDefinition = {
  id: "waffle",
  name: { en: "Waffle", es: "Waffle" },
  description: { en: "100 squares — perfect for percentages", es: "100 cuadros, ideal para porcentajes" },
  category: "composition",
  glyph: G.waffle,
  keywords: ["percent", "grid", "unit chart", "share"],
  fields: [labelField, valueField],
  options: [maxItemsOption(6, 10), aggregateOption],
  sample: {
    title: { en: "Only 1 in 4 plastic bottles gets recycled", es: "Solo 1 de cada 4 botellas plásticas se recicla" },
    subtitle: { en: "What happens to PET bottles in the US", es: "Qué pasa con las botellas PET en EE. UU." },
    source: "NAPCOR / EPA (rounded)",
    rows: [
      { fate: "Recycled", share: 26 },
      { fate: "Landfill", share: 58 },
      { fate: "Incinerated", share: 12 },
      { fate: "Littered", share: 4 },
    ],
  },
  legend: (c) => {
    const ps = parts(c, c.opt("maxItems", 6), "none");
    const shares = roundShares(ps.map((p) => p.value));
    return ps.map((p, i) => ({ label: `${p.label} · ${shares[i]}%`, color: p.color }));
  },
  render: (c) => {
    const ps = parts(c, c.opt("maxItems", 6), "none");
    if (!ps.length) return <EmptyState c={c} message="Values must be positive" />;
    const shares = roundShares(ps.map((p) => p.value));
    const cells: string[] = [];
    ps.forEach((p, i) => {
      for (let k = 0; k < shares[i]; k++) cells.push(p.color);
    });
    const side = Math.min(c.height, c.width);
    const cell = side / 10;
    const gap = Math.max(1.5 * c.u, cell * 0.12);
    const x0 = (c.width - side) / 2;
    const r = Math.min(c.corners, cell / 3);
    return (
      <g>
        {cells.map((color, i) => {
          const col = i % 10;
          const row = Math.floor(i / 10);
          return <rect key={i} x={x0 + col * cell + gap / 2} y={row * cell + gap / 2} width={cell - gap} height={cell - gap} rx={r} fill={color} />;
        })}
      </g>
    );
  },
};

/* ───────────────────────── Funnel ───────────────────────── */

export const funnelChart: ChartDefinition = {
  id: "funnel",
  name: { en: "Funnel", es: "Embudo" },
  description: { en: "Drop-off through the steps of a process", es: "Abandono a lo largo de un proceso" },
  category: "composition",
  glyph: G.funnel,
  keywords: ["conversion", "pipeline", "sales", "embudo"],
  fields: [
    { ...labelField, label: { en: "Stages", es: "Etapas" } },
    valueField,
  ],
  options: [
    {
      key: "rate",
      label: { en: "Show conversion", es: "Mostrar conversión" },
      type: "select",
      default: "first",
      choices: [
        { value: "first", label: { en: "vs. first step", es: "vs. primer paso" } },
        { value: "previous", label: { en: "vs. previous step", es: "vs. paso anterior" } },
        { value: "none", label: { en: "Don't show", es: "No mostrar" } },
      ],
    },
    sortOption("none"),
  ],
  sample: {
    title: { en: "Where the signup funnel leaks", es: "Dónde pierde gente el registro" },
    subtitle: { en: "Visitors reaching each step, last 30 days", es: "Visitantes que llegan a cada paso, últimos 30 días" },
    source: "Product analytics",
    rows: [
      { stage: "Visited landing page", users: 48200 },
      { stage: "Started signup", users: 12900 },
      { stage: "Verified email", users: 9100 },
      { stage: "Created first project", users: 5400 },
      { stage: "Invited a teammate", users: 1900 },
    ],
  },
  render: (c) => {
    const col = c.col("value");
    if (!col) return null;
    const items = categoryItems(c, "label", [col], { maxDefault: 12 }).filter((i) => i.values[0] >= 0);
    if (!items.length) return <EmptyState c={c} message={c.words.noData} />;
    const max = Math.max(...items.map((i) => i.values[0]), 1);
    const rows = band(items.map((_, i) => String(i)), [0, c.height], 0.14);
    const lSize = Math.min(fs.label(c) * 1.05, rows.bandwidth * 0.36);
    const rate = c.opt("rate", "first");
    const first = items[0].values[0] || 1;
    return (
      <g>
        {items.map((it, i) => {
          const v = it.values[0];
          const w = Math.max(4 * c.u, (v / max) * c.width * 0.62);
          const x = (c.width * 0.62 - w) / 2;
          const y = rows(String(i));
          const prev = i > 0 ? items[i - 1].values[0] : v;
          const r = rate === "first" ? v / first : rate === "previous" ? (prev ? v / prev : 0) : null;
          const color = c.color(0);
          const tx = c.width * 0.62 + 18 * c.u;
          return (
            <g key={i}>
              {i > 0 && (
                <path
                  d={`M${(c.width * 0.62 - Math.max(4 * c.u, (prev / max) * c.width * 0.62)) / 2},${y - (rows.step - rows.bandwidth)} L${x},${y} L${x + w},${y} L${(c.width * 0.62 + Math.max(4 * c.u, (prev / max) * c.width * 0.62)) / 2},${y - (rows.step - rows.bandwidth)} Z`}
                  fill={dim(c, color, 0.8)}
                />
              )}
              <rect x={x} y={y} width={w} height={rows.bandwidth} rx={Math.min(c.corners, rows.bandwidth / 3)} fill={dim(c, color, Math.min(0.55, i * 0.1))}>
                <title>{`${it.label}: ${c.fmt(v)}`}</title>
              </rect>
              <text x={tx} y={y + rows.bandwidth / 2 - lSize * 0.25} fontSize={lSize} fontWeight={700} fill={c.theme.ink} fontFamily={c.theme.fontBody}>
                {truncate(it.label, c.width * 0.38 - 20 * c.u, lSize, 700)}
              </text>
              <text x={tx} y={y + rows.bandwidth / 2 + lSize * 0.95} fontSize={lSize * 0.9} fill={c.theme.muted} fontFamily={c.theme.fontNumeric}>
                {c.fmt(v)}
                {r !== null && i > 0 ? `  ·  ${pct(r)}` : ""}
              </text>
            </g>
          );
        })}
      </g>
    );
  },
};

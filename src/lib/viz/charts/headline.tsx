import { parseDate } from "../data";
import { band, mixHex, readableOn } from "../scale";
import { EmptyState, arcPath, fs } from "../parts";
import { textWidth, truncate, wrapText } from "../text";
import type { ChartDefinition, RenderContext } from "../types";
import { G } from "./glyphs";
import { dateTicks } from "./lines";

/* ───────────────────────── KPI cards ───────────────────────── */

export const kpiChart: ChartDefinition = {
  id: "kpi",
  name: { en: "KPI cards", es: "Tarjetas KPI" },
  description: { en: "Big headline numbers with change", es: "Grandes cifras con su variación" },
  category: "headline",
  glyph: G.kpi,
  keywords: ["metric", "scorecard", "number", "big number", "indicador"],
  fields: [
    { key: "label", label: { en: "Metric names", es: "Nombres de métricas" }, type: "string" },
    { key: "value", label: { en: "Values", es: "Valores" }, type: "number" },
    { key: "delta", label: { en: "Change", es: "Variación" }, type: "number", required: false },
    { key: "caption", label: { en: "Caption", es: "Nota" }, type: "string", required: false },
  ],
  options: [
    { key: "deltaSuffix", label: { en: "Change suffix", es: "Sufijo de variación" }, type: "text", default: "%" },
    {
      key: "goodWhen",
      label: { en: "Change is good when", es: "La variación es buena cuando" },
      type: "select",
      default: "up",
      choices: [
        { value: "up", label: { en: "It goes up", es: "Sube" } },
        { value: "down", label: { en: "It goes down", es: "Baja" } },
      ],
    },
    { key: "columns", label: { en: "Cards per row (0 = auto)", es: "Tarjetas por fila (0 = auto)" }, type: "number", default: 0, min: 0, max: 6, step: 1 },
  ],
  sample: {
    title: { en: "Q3 at a glance", es: "El Q3 de un vistazo" },
    subtitle: { en: "Versus Q2 2025", es: "Frente al Q2 2025" },
    source: "Internal dashboard",
    rows: [
      { metric: "Revenue", value: 2480000, change: 12.4, note: "Best quarter ever" },
      { metric: "Active customers", value: 18420, change: 8.1, note: "+1,380 net new" },
      { metric: "Net promoter score", value: 64, change: 5.0, note: "Up from 61 in Q2" },
    ],
  },
  render: (c) => {
    const items = c.rows.slice(0, 12).map((r) => ({
      label: c.str(r, "label"),
      value: c.num(r, "value"),
      delta: c.col("delta") ? c.num(r, "delta") : null,
      caption: c.col("caption") ? c.str(r, "caption") : "",
    }));
    if (!items.length) return <EmptyState c={c} message={c.words.noData} />;
    const n = items.length;
    const forced = c.opt("columns", 0);
    let cols = forced > 0 ? Math.min(forced, n) : 1;
    if (forced <= 0) {
      // Pick the grid whose cards are closest to a 1.5:1 landscape shape.
      let best = Infinity;
      for (let k = 1; k <= Math.min(n, 4); k++) {
        const score = Math.abs(Math.log(c.width / k / (c.height / Math.ceil(n / k)) / 1.5));
        if (score < best - 1e-9) {
          best = score;
          cols = k;
        }
      }
    }
    const rows = Math.ceil(n / cols);
    const gap = 18 * c.u;
    const cw = (c.width - gap * (cols - 1)) / cols;
    const ch = (c.height - gap * (rows - 1)) / rows;
    const goodUp = c.opt("goodWhen", "up") === "up";
    const suffix = c.opt("deltaSuffix", "%");
    const pad = Math.min(28 * c.u, cw * 0.1);
    return (
      <g>
        {items.map((it, i) => {
          const x = (i % cols) * (cw + gap);
          const y = Math.floor(i / cols) * (ch + gap);
          const valueText = it.value === null ? "–" : c.fmt(it.value);
          const big = Math.min(fs.big(c) * 1.3, ch * 0.34, ((cw - pad * 2) / Math.max(3, textWidth(valueText, 100, 700) / 100)) * 1);
          const lSize = Math.min(fs.label(c) * 1.1, ch * 0.12);
          const good = it.delta !== null && (goodUp ? it.delta >= 0 : it.delta <= 0);
          const dColor = it.delta === null ? c.theme.muted : good ? c.theme.positive : c.theme.negative;
          const dText = it.delta === null ? "" : `${it.delta > 0 ? "▲ " : it.delta < 0 ? "▼ " : ""}${c.fmt(Math.abs(it.delta)).replace(/^[^\d−-]*/, "")}${suffix}`;
          const captionLines = it.caption ? wrapText(it.caption, cw - pad * 2, lSize * 0.95, 2) : [];
          const blockH = lSize * 1.2 + lSize * 0.9 + big * 0.95 + (dText ? lSize * 2.9 : 0) + (captionLines.length ? lSize * 0.8 + captionLines.length * lSize * 1.3 : 0);
          const by = y + Math.max(pad, (ch - blockH) / 2);
          const labelY = by + lSize;
          const valueY = labelY + lSize * 0.9 + big * 0.9;
          const captionY = valueY + (dText ? lSize * 2.9 : 0) + lSize * 1.9;
          return (
            <g key={i}>
              <rect x={x} y={y} width={cw} height={ch} rx={Math.max(c.corners * 2, 8 * c.u)} fill={c.theme.surface} />
              <rect x={x} y={y} width={6 * c.u} height={ch} rx={3 * c.u} fill={c.color(i)} />
              <text x={x + pad} y={labelY} fontSize={lSize} fontWeight={700} letterSpacing={0.06 * lSize} fill={c.theme.muted} fontFamily={c.theme.fontBody}>
                {truncate(it.label.toUpperCase(), cw - pad * 2, lSize, 700)}
              </text>
              <text x={x + pad} y={valueY} fontSize={big} fontWeight={700} fill={c.theme.ink} fontFamily={c.theme.fontDisplay} letterSpacing={-0.02 * big}>
                {valueText}
              </text>
              {dText && (
                <g>
                  <rect x={x + pad} y={valueY + lSize * 0.9} width={textWidth(dText, lSize, 700) + lSize * 1.2} height={lSize * 1.8} rx={lSize * 0.9} fill={mixHex(dColor, c.theme.surface.startsWith("#") ? c.theme.surface : "#FFFFFF", 0.82)} />
                  <text x={x + pad + lSize * 0.6} y={valueY + lSize * 2.1} fontSize={lSize} fontWeight={700} fill={dColor} fontFamily={c.theme.fontNumeric}>
                    {dText}
                  </text>
                </g>
              )}
              {captionLines.map((line, k) => (
                  <text key={k} x={x + pad} y={captionY + k * lSize * 1.3} fontSize={lSize * 0.95} fill={c.theme.text} fontFamily={c.theme.fontBody}>
                    {line}
                  </text>
                ))}
            </g>
          );
        })}
      </g>
    );
  },
};

/* ───────────────────────── Progress (rings / bars) ───────────────────────── */

export const progressChart: ChartDefinition = {
  id: "progress",
  name: { en: "Progress", es: "Progreso" },
  description: { en: "How close each goal is to done", es: "Qué tan cerca está cada meta" },
  category: "headline",
  glyph: G.progress,
  keywords: ["goal", "target", "gauge", "completion", "okr", "meta"],
  fields: [
    { key: "label", label: { en: "Goals", es: "Metas" }, type: "string" },
    { key: "value", label: { en: "Current", es: "Actual" }, type: "number" },
    { key: "target", label: { en: "Target (default 100)", es: "Meta (por defecto 100)" }, type: "number", required: false },
  ],
  options: [
    {
      key: "style",
      label: { en: "Style", es: "Estilo" },
      type: "select",
      default: "rings",
      choices: [
        { value: "rings", label: { en: "Rings", es: "Anillos" } },
        { value: "bars", label: { en: "Bars", es: "Barras" } },
      ],
    },
  ],
  sample: {
    title: { en: "2025 OKRs: where we stand", es: "OKRs 2025: dónde estamos" },
    subtitle: { en: "Progress towards annual targets", es: "Avance hacia metas anuales" },
    source: "Planning sheet",
    rows: [
      { goal: "New customers", current: 820, target: 1000 },
      { goal: "NPS", current: 61, target: 70 },
      { goal: "Uptime", current: 99.95, target: 99.9 },
      { goal: "Hiring plan", current: 14, target: 25 },
    ],
  },
  render: (c) => {
    const items = c.rows.slice(0, 12).map((r) => {
      const v = c.num(r, "value") ?? 0;
      const t = c.col("target") ? c.num(r, "target") ?? 100 : 100;
      return { label: c.str(r, "label"), v, t, p: t ? v / t : 0 };
    });
    if (!items.length) return <EmptyState c={c} message={c.words.noData} />;
    const lSize = fs.label(c);
    const pctText = (p: number) => `${Math.round(p * 100)}%`;
    if (c.opt("style", "rings") === "bars") {
      const blockH = Math.min(c.height, items.length * 90 * c.u);
      const rows = band(items.map((_, i) => String(i)), [(c.height - blockH) / 2 + lSize * 1.4, (c.height + blockH) / 2], 0.45);
      const h = Math.min(rows.bandwidth, 26 * c.u);
      return (
        <g>
          {items.map((it, i) => {
            const y = rows.center(String(i));
            const w = c.width * Math.min(1, Math.max(0, it.p));
            return (
              <g key={i}>
                <text x={0} y={y - h / 2 - lSize * 0.5} fontSize={lSize} fontWeight={700} fill={c.theme.ink} fontFamily={c.theme.fontBody}>
                  {truncate(it.label, c.width * 0.6, lSize)}
                </text>
                <text x={c.width} y={y - h / 2 - lSize * 0.5} textAnchor="end" fontSize={lSize} fill={c.theme.muted} fontFamily={c.theme.fontNumeric}>
                  {`${c.fmt(it.v)} / ${c.fmt(it.t)} · ${pctText(it.p)}`}
                </text>
                <rect x={0} y={y - h / 2} width={c.width} height={h} rx={Math.min(h / 2, c.corners * 2)} fill={c.theme.grid} />
                <rect x={0} y={y - h / 2} width={w} height={h} rx={Math.min(h / 2, c.corners * 2)} fill={it.p >= 1 ? c.theme.positive : c.color(i)} />
              </g>
            );
          })}
        </g>
      );
    }
    const n = items.length;
    const cols = n <= 4 ? n : Math.ceil(n / 2);
    const rowsN = Math.ceil(n / cols);
    const cw = c.width / cols;
    const ch = c.height / rowsN;
    const R = Math.max(16 * c.u, Math.min(cw * 0.36, (ch - lSize * 3.6) / 2 / 1.1));
    const stroke = R * 0.2;
    const cellH = R * 2 + stroke + lSize * 3.2;
    const offY = Math.max(0, (ch - cellH) / 2);
    return (
      <g>
        {items.map((it, i) => {
          const cx = (i % cols) * cw + cw / 2;
          const cy = Math.floor(i / cols) * ch + offY + R + stroke / 2;
          const p = Math.min(0.9999, Math.max(0, it.p));
          const color = it.p >= 1 ? c.theme.positive : c.color(i);
          const big = Math.min(R * 0.55, fs.big(c));
          return (
            <g key={i}>
              <circle cx={cx} cy={cy} r={R} fill="none" stroke={c.theme.grid} strokeWidth={stroke} />
              {p > 0 && <path d={arcPath(cx, cy, R + stroke / 2, R - stroke / 2, 0, p * Math.PI * 2)} fill={color} />}
              <text x={cx} y={cy} dy="0.35em" textAnchor="middle" fontSize={big} fontWeight={700} fill={c.theme.ink} fontFamily={c.theme.fontDisplay}>
                {pctText(it.p)}
              </text>
              <text x={cx} y={cy + R + stroke + lSize * 1.3} textAnchor="middle" fontSize={lSize} fontWeight={700} fill={c.theme.ink} fontFamily={c.theme.fontBody}>
                {truncate(it.label, cw - 10 * c.u, lSize)}
              </text>
              <text x={cx} y={cy + R + stroke + lSize * 2.6} textAnchor="middle" fontSize={lSize * 0.9} fill={c.theme.muted} fontFamily={c.theme.fontNumeric}>
                {`${c.fmt(it.v)} / ${c.fmt(it.t)}`}
              </text>
            </g>
          );
        })}
      </g>
    );
  },
};

/* ───────────────────────── Timeline / Gantt ───────────────────────── */

function toTime(v: string | number | null | undefined): { t: number; date: boolean } | null {
  if (v === null || v === undefined || v === "") return null;
  if (typeof v === "number") return { t: v, date: false };
  const s = String(v).trim();
  if (/^-?\d+(\.\d+)?$/.test(s)) return { t: Number(s), date: false };
  const d = parseDate(s);
  return d === null ? null : { t: d, date: true };
}

export const timelineChart: ChartDefinition = {
  id: "timeline",
  name: { en: "Timeline / Gantt", es: "Cronograma / Gantt" },
  description: { en: "Tasks or events with start and end", es: "Tareas o eventos con inicio y fin" },
  category: "planning",
  glyph: G.timeline,
  keywords: ["gantt", "schedule", "roadmap", "project", "cronograma"],
  fields: [
    { key: "task", label: { en: "Tasks", es: "Tareas" }, type: "string" },
    { key: "start", label: { en: "Start (date or number)", es: "Inicio (fecha o número)" }, type: "any" },
    { key: "end", label: { en: "End (date or number)", es: "Fin (fecha o número)" }, type: "any" },
    { key: "group", label: { en: "Color by", es: "Color por" }, type: "string", required: false },
  ],
  options: [{ key: "today", label: { en: "Mark today", es: "Marcar hoy" }, type: "boolean", default: false }],
  sample: {
    title: { en: "Product launch roadmap", es: "Hoja de ruta del lanzamiento" },
    subtitle: { en: "Plan for the first half of 2026", es: "Plan del primer semestre 2026" },
    source: "Project plan",
    rows: [
      { task: "User research", start: "2026-01-05", end: "2026-02-06", team: "Design" },
      { task: "Prototype", start: "2026-01-26", end: "2026-03-06", team: "Design" },
      { task: "Core platform", start: "2026-02-16", end: "2026-04-30", team: "Engineering" },
      { task: "Beta program", start: "2026-04-06", end: "2026-05-22", team: "Product" },
      { task: "Marketing site", start: "2026-04-20", end: "2026-05-29", team: "Marketing" },
      { task: "Launch 🚀", start: "2026-06-01", end: "2026-06-05", team: "Marketing" },
    ],
  },
  legend: (c) => {
    if (!c.col("group")) return null;
    const gs: string[] = [];
    for (const r of c.rows) {
      const g = c.str(r, "group");
      if (!gs.includes(g) && gs.length < 12) gs.push(g);
    }
    return gs.map((g, i) => ({ label: g, color: c.color(i) }));
  },
  render: (c) => {
    const startCol = c.col("start");
    const endCol = c.col("end");
    if (!startCol || !endCol) return null;
    const gs: string[] = [];
    const items = c.rows
      .map((r) => {
        const a = toTime(r[startCol] as string | number | null);
        const b = toTime(r[endCol] as string | number | null);
        const g = c.str(r, "group");
        if (c.col("group") && !gs.includes(g)) gs.push(g);
        return a && b ? { task: c.str(r, "task"), a: Math.min(a.t, b.t), b: Math.max(a.t, b.t), date: a.date && b.date, g } : null;
      })
      .filter((d): d is NonNullable<typeof d> => d !== null)
      .slice(0, 40);
    if (!items.length) return <EmptyState c={c} message="Start and end must be numbers or dates" />;
    const isDate = items.every((i) => i.date);
    const lSize = fs.label(c);
    const tSize = fs.tick(c);
    const labelW = Math.min(c.width * 0.3, Math.max(...items.map((i) => textWidth(i.task, lSize)))) + 14 * c.u;
    const lo = Math.min(...items.map((i) => i.a));
    const hi = Math.max(...items.map((i) => i.b));
    const span = hi - lo || 1;
    const x = (t: number) => labelW + ((t - lo) / span) * (c.width - labelW - 4 * c.u);
    const axisH = tSize * 2.2;
    const rows = band(items.map((_, i) => String(i)), [axisH, c.height], 0.3);
    const maxTicks = Math.max(2, Math.floor((c.width - labelW) / (tSize * 7)));
    let ticks: number[];
    let fmtT: (t: number) => string;
    if (isDate) {
      const dt = dateTicks(lo, hi, maxTicks);
      ticks = dt.ticks;
      fmtT = dt.fmt;
    } else {
      const step = Math.max(1e-9, Math.ceil(span / maxTicks));
      ticks = [];
      for (let t = Math.ceil(lo / step) * step; t <= hi; t += step) ticks.push(t);
      fmtT = (t) => c.fmtTick(t, step);
    }
    const bg = c.theme.background === "transparent" ? c.theme.surface : c.theme.background;
    return (
      <g>
        {ticks.map((t) => (
          <g key={t}>
            <line x1={x(t)} x2={x(t)} y1={axisH} y2={c.height} stroke={c.theme.grid} strokeWidth={c.u} />
            <text x={x(t)} y={tSize} textAnchor="middle" fontSize={tSize} fill={c.theme.muted} fontFamily={c.theme.fontNumeric}>
              {fmtT(t)}
            </text>
          </g>
        ))}
        {items.map((it, i) => {
          const y = rows(String(i));
          const x0 = x(it.a);
          const w = Math.max(6 * c.u, x(it.b) - x0);
          const color = c.col("group") ? c.color(Math.max(0, gs.indexOf(it.g))) : c.color(0);
          const inside = w > textWidth(it.task, lSize * 0.9) + 16 * c.u;
          return (
            <g key={i}>
              <text x={labelW - 12 * c.u} y={y + rows.bandwidth / 2} dy="0.35em" textAnchor="end" fontSize={Math.min(lSize, rows.step * 0.7)} fill={c.theme.text} fontFamily={c.theme.fontBody}>
                {truncate(it.task, labelW - 14 * c.u, lSize)}
              </text>
              <rect x={x0} y={y} width={w} height={rows.bandwidth} rx={Math.min(rows.bandwidth / 2, c.corners * 1.5)} fill={color}>
                <title>{`${it.task}: ${isDate ? new Date(it.a).toISOString().slice(0, 10) + " → " + new Date(it.b).toISOString().slice(0, 10) : c.fmt(it.a) + " → " + c.fmt(it.b)}`}</title>
              </rect>
              {c.labels && inside && rows.bandwidth > lSize && (
                <text x={x0 + 8 * c.u} y={y + rows.bandwidth / 2} dy="0.35em" fontSize={Math.min(lSize * 0.9, rows.bandwidth * 0.6)} fill={readableOn(color)} fontFamily={c.theme.fontBody} fontWeight={600}>
                  {isDate ? `${Math.max(1, Math.round((it.b - it.a) / 86_400_000))}d` : c.fmt(it.b - it.a)}
                </text>
              )}
            </g>
          );
        })}
        {c.opt("today", false) && isDate && Date.now() >= lo && Date.now() <= hi && (
          <g>
            <line x1={x(Date.now())} x2={x(Date.now())} y1={axisH} y2={c.height} stroke={c.theme.negative} strokeWidth={2 * c.u} />
            <rect x={x(Date.now()) - 22 * c.u} y={axisH - tSize * 0.2} width={44 * c.u} height={tSize * 1.4} rx={tSize * 0.7} fill={c.theme.negative} />
            <text x={x(Date.now())} y={axisH + tSize * 0.85} textAnchor="middle" fontSize={tSize * 0.9} fontWeight={700} fill={bg} fontFamily={c.theme.fontBody}>
              {c.words.today}
            </text>
          </g>
        )}
      </g>
    );
  },
};

/* ───────────────────────── Calendar heatmap ───────────────────────── */

const DAY = 86_400_000;
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export const calendarChart: ChartDefinition = {
  id: "calendar",
  name: { en: "Calendar heatmap", es: "Calendario de calor" },
  description: { en: "Daily values over a year, GitHub-style", es: "Valores diarios de un año, estilo GitHub" },
  category: "trend",
  glyph: G.calendar,
  keywords: ["daily", "contributions", "habit", "streak", "calendar"],
  fields: [
    { key: "date", label: { en: "Dates", es: "Fechas" }, type: "any" },
    { key: "value", label: { en: "Values", es: "Valores" }, type: "number" },
  ],
  options: [
    {
      key: "weekStart",
      label: { en: "Week starts on", es: "La semana empieza" },
      type: "select",
      default: "mon",
      choices: [
        { value: "mon", label: { en: "Monday", es: "Lunes" } },
        { value: "sun", label: { en: "Sunday", es: "Domingo" } },
      ],
    },
  ],
  sample: {
    title: { en: "A year of running", es: "Un año corriendo" },
    subtitle: { en: "Kilometres per day, 2025", es: "Kilómetros por día, 2025" },
    source: "Personal fitness tracker",
    rows: Array.from({ length: 365 }, (_, i) => {
      const d = new Date(Date.UTC(2025, 0, 1) + i * DAY);
      const dow = d.getUTCDay();
      const seed = (i * 2654435761) % 1000;
      const ran = dow === 0 ? seed < 800 : dow === 3 || dow === 5 ? seed < 650 : seed < 180;
      const km = ran ? Math.round((dow === 0 ? 14 + (seed % 9) : 5 + (seed % 6)) * (1 + i / 900) * 10) / 10 : 0;
      return { date: d.toISOString().slice(0, 10), km };
    }),
  },
  render: (c) => {
    const dateCol = c.col("date");
    if (!dateCol) return null;
    const byDay = new Map<number, number>();
    for (const r of c.rows) {
      const t = parseDate(r[dateCol] as string | number | null);
      const v = c.num(r, "value");
      if (t === null || v === null) continue;
      const day = Math.floor(t / DAY);
      byDay.set(day, (byDay.get(day) ?? 0) + v);
    }
    if (!byDay.size) return <EmptyState c={c} message="Dates could not be read" />;
    const days = [...byDay.keys()].sort((a, b) => a - b);
    let first = days[0];
    const last = days[days.length - 1];
    if (last - first > 370) first = last - 370;
    const sundayStart = c.opt("weekStart", "mon") === "sun";
    const dow = (d: number) => {
      const w = new Date(d * DAY).getUTCDay();
      return sundayStart ? w : (w + 6) % 7;
    };
    const start = first - dow(first);
    const weeks = Math.floor((last - start) / 7) + 1;
    const tSize = fs.tick(c);
    const labelW = tSize * 2.6;
    const cell = Math.max(2, Math.min((c.width - labelW) / weeks, (c.height - tSize * 5) / 7));
    const top = Math.max(tSize * 2, (c.height - (7 * cell + tSize * 5)) / 2 + tSize * 2);
    const gap = Math.max(1, cell * 0.14);
    const vals = [...byDay.values()];
    const vMax = Math.max(...vals.filter((v) => v > 0), 1);
    const bg = c.theme.background === "transparent" ? c.theme.surface : c.theme.background;
    const base = /^#/.test(bg) ? bg : "#FFFFFF";
    const empty = mixHex(c.theme.grid.startsWith("#") ? c.theme.grid : "#EEEEEE", base, 0.2);
    const colorFor = (v: number | undefined) => (v === undefined || v <= 0 ? empty : mixHex(mixHex(c.color(0), base, 0.78), c.color(0), Math.sqrt(v / vMax)));
    const x0 = labelW + (c.width - labelW - weeks * cell) / 2;
    const dayNames = sundayStart ? ["Sun", "", "Tue", "", "Thu", "", "Sat"] : ["Mon", "", "Wed", "", "Fri", "", "Sun"];
    const monthMarks: { x: number; label: string }[] = [];
    let lastMonth = -1;
    for (let w = 0; w < weeks; w++) {
      const d = new Date((start + w * 7) * DAY);
      if (d.getUTCMonth() !== lastMonth) {
        lastMonth = d.getUTCMonth();
        const mx = x0 + w * cell;
        const prev = monthMarks[monthMarks.length - 1];
        if (prev && mx - prev.x < tSize * 2.6) monthMarks.pop();
        monthMarks.push({ x: mx, label: MONTHS[lastMonth] });
      }
    }
    const total = vals.reduce((a, b) => a + b, 0);
    const active = vals.filter((v) => v > 0).length;
    return (
      <g>
        {monthMarks.map((m, i) => (
          <text key={i} x={m.x} y={top - tSize * 0.6} fontSize={tSize} fill={c.theme.muted} fontFamily={c.theme.fontBody}>
            {m.label}
          </text>
        ))}
        {dayNames.map((d, i) =>
          d ? (
            <text key={i} x={x0 - 6 * c.u} y={top + i * cell + cell / 2} dy="0.35em" textAnchor="end" fontSize={Math.min(tSize, cell)} fill={c.theme.muted} fontFamily={c.theme.fontBody}>
              {d}
            </text>
          ) : null,
        )}
        {Array.from({ length: weeks * 7 }, (_, k) => {
          const d = start + k;
          if (d < first || d > last) return null;
          const w = Math.floor(k / 7);
          const v = byDay.get(d);
          return (
            <rect key={k} x={x0 + w * cell + gap / 2} y={top + dow(d) * cell + gap / 2} width={cell - gap} height={cell - gap} rx={Math.min(c.corners * 0.5, cell / 4)} fill={colorFor(v)}>
              <title>{`${new Date(d * DAY).toISOString().slice(0, 10)}: ${v === undefined ? "–" : c.fmt(v)}`}</title>
            </rect>
          );
        })}
        <text x={x0} y={top + 7 * cell + tSize * 1.8} fontSize={tSize} fill={c.theme.text} fontFamily={c.theme.fontBody}>
          {`${c.words.total} ${c.fmt(total)} · ${active} ${c.words.activeDays}`}
        </text>
        <g transform={`translate(${x0 + weeks * cell},${top + 7 * cell + tSize * 1.8})`}>
          {[0, 0.25, 0.5, 0.75, 1].map((t, i) => (
            <rect key={i} x={-(5 - i) * (cell * 0.9 + 2) - tSize * 2.4} y={-cell * 0.75} width={cell * 0.8} height={cell * 0.8} rx={cell * 0.15} fill={t === 0 ? empty : colorFor(t * vMax)} />
          ))}
          <text x={0} y={0} textAnchor="end" fontSize={tSize} fill={c.theme.muted} fontFamily={c.theme.fontBody}>
            {c.words.more}
          </text>
        </g>
      </g>
    );
  },
};

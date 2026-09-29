import { band, linear } from "../scale";
import {
  Bar,
  CategoryLabels,
  EmptyState,
  HaloText,
  XAxis,
  YAxis,
  fs,
  layoutCategoryLabels,
  tickLabelWidth,
} from "../parts";
import { pretty, textWidth, truncate } from "../text";
import type { ChartDefinition, RenderContext } from "../types";
import {
  aggregateOption,
  categoryItems,
  colorByOption,
  dim,
  highlightIndex,
  highlightOption,
  markColor,
  maxItemsOption,
  sortOption,
} from "./common";
import { G } from "./glyphs";

const labelField = { key: "label", label: { en: "Labels", es: "Etiquetas" }, type: "string" as const };
const valueField = { key: "value", label: { en: "Values", es: "Valores" }, type: "number" as const };
const seriesField = {
  key: "series",
  label: { en: "Series", es: "Series" },
  type: "number" as const,
  multiple: true,
  help: { en: "One column per series", es: "Una columna por serie" },
};

/* ───────────────────────── Column chart ───────────────────────── */

function renderColumns(c: RenderContext) {
  const valueCol = c.col("value");
  if (!valueCol) return null;
  const items = categoryItems(c, "label", [valueCol], { maxDefault: 30 });
  if (!items.length) return <EmptyState c={c} message={c.words.noData} />;
  const values = items.map((i) => i.values[0]);
  const labels = items.map((i) => i.label);
  const vSize = fs.value(c);
  const hasNeg = values.some((v) => v < 0);
  const top = c.labels ? vSize * 1.7 : 6 * c.u;
  let y = linear(values, [c.height, top]);
  const left = tickLabelWidth(c, y) + 14 * c.u;
  const x = band(labels, [left, c.width], 0.26);
  const layout = layoutCategoryLabels(c, labels, x.step);
  const bottom = c.height - layout.height - (hasNeg && c.labels ? vSize * 1.6 : 0);
  y = linear(values, [bottom, top]);
  const hi = highlightIndex(values, c.opt("highlight", "none"));
  const showValues = c.labels && Math.max(...values.map((v) => textWidth(c.fmt(v), vSize))) < x.step + 4 * c.u;
  return (
    <g>
      <YAxis c={c} scale={y} x0={left} x1={c.width} />
      {items.map((it, i) => {
        const v = values[i];
        const y0 = y(0);
        const yv = y(v);
        const t = Math.min(y0, yv);
        const h = Math.max(Math.abs(yv - y0), v === 0 ? 0 : 1 * c.u);
        return (
          <g key={i}>
            <Bar
              x={x(it.label)}
              y={t}
              width={x.bandwidth}
              height={h}
              radius={c.corners}
              fill={markColor(c, i, v, hi)}
              negative={v < 0}
              title={`${it.label}: ${c.fmt(v)}`}
            />
            {showValues && (
              <text
                x={x.center(it.label)}
                y={v >= 0 ? t - vSize * 0.55 : t + h + vSize * 1.2}
                textAnchor="middle"
                fontSize={vSize}
                fontWeight={i === hi ? 700 : 500}
                fill={hi >= 0 && i !== hi ? c.theme.muted : c.theme.text}
                fontFamily={c.theme.fontNumeric}
              >
                {c.fmt(v)}
              </text>
            )}
          </g>
        );
      })}
      <CategoryLabels c={c} labels={labels} xFor={(i) => x.center(labels[i])} y={c.height - layout.height} layout={layout} />
    </g>
  );
}

export const barChart: ChartDefinition = {
  id: "bar",
  name: { en: "Column chart", es: "Columnas" },
  description: { en: "Compare values across categories", es: "Compara valores entre categorías" },
  category: "comparison",
  glyph: G.bar,
  keywords: ["bar", "column", "vertical", "barras", "columnas"],
  fields: [labelField, valueField],
  options: [sortOption("none"), highlightOption, colorByOption, aggregateOption, maxItemsOption(30)],
  sample: {
    title: { en: "Coffee is still the office favourite", es: "El café sigue siendo el favorito" },
    subtitle: { en: "Drinks ordered at the office bar, last month", es: "Bebidas pedidas en la cafetería, último mes" },
    source: "Office bar POS",
    rows: [
      { drink: "Espresso", orders: 412 },
      { drink: "Latte", orders: 368 },
      { drink: "Cappuccino", orders: 295 },
      { drink: "Tea", orders: 184 },
      { drink: "Matcha", orders: 121 },
      { drink: "Hot chocolate", orders: 76 },
    ],
  },
  render: renderColumns,
};

/* ───────────────────────── Horizontal bars / lollipop ───────────────────────── */

function renderHorizontal(c: RenderContext, mark: "bar" | "lollipop") {
  const valueCol = c.col("value");
  if (!valueCol) return null;
  const items = categoryItems(c, "label", [valueCol], { sortDefault: "desc", maxDefault: 20 });
  if (!items.length) return <EmptyState c={c} message={c.words.noData} />;
  const values = items.map((i) => i.values[0]);
  const lSize = fs.label(c);
  const vSize = fs.value(c);
  const labelW = Math.min(Math.max(...items.map((i) => textWidth(i.label, lSize))), c.width * 0.34);
  const valueW = c.labels ? Math.max(...values.map((v) => textWidth(c.fmt(v), vSize))) + 10 * c.u : 0;
  const hasNeg = values.some((v) => v < 0);
  const left = labelW + 14 * c.u + (hasNeg ? valueW : 0);
  const axisH = c.labels ? 0 : fs.tick(c) * 2;
  const x = linear(values, [left, c.width - valueW - 6 * c.u]);
  const rows = band(items.map((_, i) => String(i)), [0, c.height - axisH], mark === "bar" ? 0.28 : 0.2);
  const hi = highlightIndex(values, c.opt("highlight", "none"));
  const thick = Math.min(rows.bandwidth, 64 * c.u);
  const dotR = Math.max(3 * c.u, Math.min(rows.bandwidth * 0.32, 9 * c.u));
  const labelSize = Math.min(lSize, rows.step * 0.7);
  return (
    <g>
      {!c.labels && <XAxis c={c} scale={x} y0={0} y1={c.height - axisH} labelY={c.height - axisH + 4 * c.u} />}
      <line x1={x(0)} x2={x(0)} y1={0} y2={c.height - axisH} stroke={c.theme.axis} strokeWidth={1.2 * c.u} />
      {items.map((it, i) => {
        const v = values[i];
        const cy = rows.center(String(i));
        const x0 = x(0);
        const xv = x(v);
        const color = markColor(c, i, v, hi);
        return (
          <g key={i}>
            <text
              x={labelW + 4 * c.u}
              y={cy}
              dy="0.35em"
              textAnchor="end"
              fontSize={labelSize}
              fill={hi >= 0 && i !== hi ? c.theme.muted : c.theme.text}
              fontWeight={i === hi ? 700 : 400}
              fontFamily={c.theme.fontBody}
            >
              {truncate(it.label, labelW, labelSize)}
            </text>
            {mark === "bar" ? (
              <Bar
                x={Math.min(x0, xv)}
                y={cy - thick / 2}
                width={Math.max(Math.abs(xv - x0), v === 0 ? 0 : 1)}
                height={thick}
                radius={c.corners}
                fill={color}
                orient="h"
                negative={v < 0}
                title={`${it.label}: ${c.fmt(v)}`}
              />
            ) : (
              <g>
                <line x1={x0} x2={xv} y1={cy} y2={cy} stroke={color} strokeWidth={2.2 * c.u} />
                <circle cx={xv} cy={cy} r={dotR} fill={color}>
                  <title>{`${it.label}: ${c.fmt(v)}`}</title>
                </circle>
              </g>
            )}
            {c.labels && (
              <text
                x={v >= 0 ? xv + (mark === "lollipop" ? dotR : 0) + 8 * c.u : xv - (mark === "lollipop" ? dotR : 0) - 8 * c.u}
                y={cy}
                dy="0.35em"
                textAnchor={v >= 0 ? "start" : "end"}
                fontSize={Math.min(vSize, rows.step * 0.7)}
                fontWeight={i === hi ? 700 : 500}
                fill={hi >= 0 && i !== hi ? c.theme.muted : c.theme.text}
                fontFamily={c.theme.fontNumeric}
              >
                {c.fmt(v)}
              </text>
            )}
          </g>
        );
      })}
    </g>
  );
}

export const hbarChart: ChartDefinition = {
  id: "hbar",
  name: { en: "Ranked bars", es: "Barras ordenadas" },
  description: { en: "Horizontal bars, sorted — great with long labels", es: "Barras horizontales ordenadas, ideales con etiquetas largas" },
  category: "comparison",
  glyph: G.hbar,
  keywords: ["ranking", "horizontal", "top", "leaderboard"],
  fields: [labelField, valueField],
  options: [sortOption("desc"), highlightOption, colorByOption, aggregateOption, maxItemsOption(15)],
  sample: {
    title: { en: "The most-spoken languages in the world", es: "Los idiomas más hablados del mundo" },
    subtitle: { en: "Total speakers (native + second language), millions", es: "Hablantes totales (nativos + segunda lengua), millones" },
    source: "Ethnologue 2024",
    rows: [
      { language: "English", speakers: 1515 },
      { language: "Mandarin Chinese", speakers: 1140 },
      { language: "Hindi", speakers: 609 },
      { language: "Spanish", speakers: 560 },
      { language: "Standard Arabic", speakers: 332 },
      { language: "French", speakers: 312 },
      { language: "Bengali", speakers: 278 },
      { language: "Portuguese", speakers: 264 },
    ],
  },
  render: (c) => renderHorizontal(c, "bar"),
};

export const lollipopChart: ChartDefinition = {
  id: "lollipop",
  name: { en: "Lollipop", es: "Piruleta" },
  description: { en: "A lighter take on ranked bars", es: "Una versión ligera de las barras ordenadas" },
  category: "comparison",
  glyph: G.lollipop,
  keywords: ["dot", "ranking", "cleveland"],
  fields: [labelField, valueField],
  options: [sortOption("desc"), highlightOption, colorByOption, aggregateOption, maxItemsOption(15)],
  sample: {
    title: { en: "Where people work the longest hours", es: "Dónde se trabajan más horas" },
    subtitle: { en: "Average annual hours actually worked per worker, 2023", es: "Horas anuales promedio trabajadas por trabajador, 2023" },
    source: "OECD",
    rows: [
      { country: "Mexico", hours: 2207 },
      { country: "Costa Rica", hours: 2171 },
      { country: "Chile", hours: 1953 },
      { country: "United States", hours: 1799 },
      { country: "Japan", hours: 1611 },
      { country: "France", hours: 1500 },
      { country: "Denmark", hours: 1380 },
      { country: "Germany", hours: 1343 },
    ],
  },
  render: (c) => renderHorizontal(c, "lollipop"),
};

/* ───────────────────────── Grouped & stacked ───────────────────────── */

function seriesLegend(c: RenderContext) {
  return c.cols("series").map((s, i) => ({ label: pretty(s), color: c.color(i) }));
}

function renderGrouped(c: RenderContext) {
  const series = c.cols("series");
  const items = categoryItems(c, "label", series, { maxDefault: 24 });
  if (!items.length || !series.length) return <EmptyState c={c} message={c.words.noData} />;
  const all = items.flatMap((i) => i.values);
  const labels = items.map((i) => i.label);
  const vSize = fs.value(c) * 0.92;
  const top = c.labels ? vSize * 1.7 : 6 * c.u;
  let y = linear(all, [c.height, top]);
  const left = tickLabelWidth(c, y) + 14 * c.u;
  const x = band(labels, [left, c.width], 0.22);
  const layout = layoutCategoryLabels(c, labels, x.step);
  const bottom = c.height - layout.height;
  y = linear(all, [bottom, top]);
  const inner = band(series, [0, x.bandwidth], 0.08, 0);
  const showValues = c.labels && Math.max(...all.map((v) => textWidth(c.fmt(v), vSize))) < inner.step + 2 * c.u;
  return (
    <g>
      <YAxis c={c} scale={y} x0={left} x1={c.width} />
      {items.map((it, i) =>
        it.values.map((v, si) => {
          const bx = x(it.label) + inner(series[si]);
          const y0 = y(0);
          const yv = y(v);
          const t = Math.min(y0, yv);
          const h = Math.abs(yv - y0);
          return (
            <g key={`${i}-${si}`}>
              <Bar
                x={bx}
                y={t}
                width={inner.bandwidth}
                height={h}
                radius={c.corners * 0.7}
                fill={c.color(si)}
                negative={v < 0}
                title={`${it.label} · ${series[si]}: ${c.fmt(v)}`}
              />
              {showValues && (
                <text
                  x={bx + inner.bandwidth / 2}
                  y={v >= 0 ? t - vSize * 0.5 : t + h + vSize * 1.15}
                  textAnchor="middle"
                  fontSize={vSize}
                  fill={c.theme.text}
                  fontFamily={c.theme.fontNumeric}
                >
                  {c.fmt(v)}
                </text>
              )}
            </g>
          );
        }),
      )}
      <CategoryLabels c={c} labels={labels} xFor={(i) => x.center(labels[i])} y={bottom} layout={layout} />
    </g>
  );
}

export const groupedChart: ChartDefinition = {
  id: "grouped",
  name: { en: "Grouped columns", es: "Columnas agrupadas" },
  description: { en: "Compare several series side by side", es: "Compara varias series lado a lado" },
  category: "comparison",
  glyph: G.grouped,
  keywords: ["clustered", "side by side", "multi"],
  fields: [labelField, seriesField],
  options: [sortOption("none"), aggregateOption, maxItemsOption(16, 50)],
  sample: {
    title: { en: "Renewables overtook coal in 2024", es: "Las renovables superaron al carbón en 2024" },
    subtitle: { en: "Share of global electricity generation, %", es: "Participación en la generación eléctrica mundial, %" },
    source: "Ember Global Electricity Review",
    rows: [
      { year: "2000", coal: 38.8, gas: 17.6, renewables: 18.5 },
      { year: "2010", coal: 40.1, gas: 22.2, renewables: 19.6 },
      { year: "2015", coal: 38.4, gas: 22.4, renewables: 23.0 },
      { year: "2020", coal: 35.1, gas: 23.5, renewables: 28.2 },
      { year: "2024", coal: 34.4, gas: 22.0, renewables: 32.0 },
    ],
  },
  legend: seriesLegend,
  render: renderGrouped,
};

function renderStacked(c: RenderContext) {
  const series = c.cols("series");
  const items = categoryItems(c, "label", series, { maxDefault: 30 });
  if (!items.length || !series.length) return <EmptyState c={c} message={c.words.noData} />;
  const percent = c.opt("mode", "normal") === "percent";
  const horizontal = c.opt("orientation", "vertical") === "horizontal";
  const stacks = items.map((it) => {
    const posTotal = it.values.reduce((a, v) => a + Math.max(0, v), 0);
    const negTotal = it.values.reduce((a, v) => a + Math.min(0, v), 0);
    const denom = percent ? posTotal - negTotal || 1 : 1;
    let pos = 0;
    let neg = 0;
    const segs = it.values.map((raw, si) => {
      const v = raw / denom;
      const s0 = v >= 0 ? pos : neg;
      if (v >= 0) pos += v;
      else neg += v;
      return { si, v, raw, s0, s1: s0 + v };
    });
    return { label: it.label, segs, pos, neg, total: posTotal + negTotal };
  });
  const extent = [...stacks.map((s) => s.pos), ...stacks.map((s) => s.neg)];
  const labels = items.map((i) => i.label);
  const vSize = fs.value(c) * 0.9;
  const fmtSeg = (s: { v: number; raw: number }) => (percent ? `${Math.round(s.v * 100)}%` : c.fmt(s.raw));

  if (horizontal) {
    const lSize = fs.label(c);
    const labelW = Math.min(Math.max(...labels.map((l) => textWidth(l, lSize))), c.width * 0.3);
    const totalW = c.labels && !percent ? Math.max(...stacks.map((s) => textWidth(c.fmt(s.total), vSize))) + 10 * c.u : 0;
    const axisH = fs.tick(c) * 2;
    const x = linear(percent ? [0, 1] : extent, [labelW + 14 * c.u, c.width - totalW]);
    const rows = band(labels, [0, c.height - axisH], 0.3);
    return (
      <g>
        {!percent && <XAxis c={c} scale={x} y0={0} y1={c.height - axisH} labelY={c.height - axisH + 4 * c.u} />}
        {stacks.map((s, i) => (
          <g key={i}>
            <text x={labelW + 4 * c.u} y={rows.center(s.label)} dy="0.35em" textAnchor="end" fontSize={Math.min(lSize, rows.step * 0.7)} fill={c.theme.text} fontFamily={c.theme.fontBody}>
              {truncate(s.label, labelW, lSize)}
            </text>
            {s.segs.map((seg) => {
              const x0 = x(Math.min(seg.s0, seg.s1));
              const w = Math.abs(x(seg.s1) - x(seg.s0));
              const fits = c.labels && w > textWidth(fmtSeg(seg), vSize) + 8 * c.u && rows.bandwidth > vSize * 1.3;
              return (
                <g key={seg.si}>
                  <rect x={x0} y={rows(s.label)} width={w} height={rows.bandwidth} fill={c.color(seg.si)} stroke={c.theme.background === "transparent" ? "none" : c.theme.background} strokeWidth={1 * c.u}>
                    <title>{`${s.label} · ${series[seg.si]}: ${fmtSeg(seg)}`}</title>
                  </rect>
                  {fits && (
                    <text x={x0 + w / 2} y={rows.center(s.label)} dy="0.35em" textAnchor="middle" fontSize={vSize} fill={readable(c, seg.si)} fontFamily={c.theme.fontNumeric}>
                      {fmtSeg(seg)}
                    </text>
                  )}
                </g>
              );
            })}
            {totalW > 0 && (
              <text x={x(s.pos) + 8 * c.u} y={rows.center(s.label)} dy="0.35em" fontSize={vSize} fontWeight={700} fill={c.theme.ink} fontFamily={c.theme.fontNumeric}>
                {c.fmt(s.total)}
              </text>
            )}
          </g>
        ))}
      </g>
    );
  }

  const top = c.labels && !percent ? vSize * 1.7 : 6 * c.u;
  let y = linear(percent ? [0, 1] : extent, [c.height, top]);
  const tickW = percent ? textWidth("100%", fs.tick(c)) : tickLabelWidth(c, y);
  const left = tickW + 14 * c.u;
  const x = band(labels, [left, c.width], 0.3);
  const layout = layoutCategoryLabels(c, labels, x.step);
  const bottom = c.height - layout.height;
  y = linear(percent ? [0, 1] : extent, [bottom, top]);
  const pctTicks = [0, 0.25, 0.5, 0.75, 1];
  return (
    <g>
      {percent ? (
        pctTicks.map((t) => (
          <g key={t}>
            {c.grid && <line x1={left} x2={c.width} y1={y(t)} y2={y(t)} stroke={c.theme.grid} strokeWidth={c.u} />}
            <text x={left - 10 * c.u} y={y(t)} dy="0.35em" textAnchor="end" fontSize={fs.tick(c)} fill={c.theme.muted} fontFamily={c.theme.fontNumeric}>
              {Math.round(t * 100)}%
            </text>
          </g>
        ))
      ) : (
        <YAxis c={c} scale={y} x0={left} x1={c.width} />
      )}
      {stacks.map((s, i) => (
        <g key={i}>
          {s.segs.map((seg) => {
            const y0 = y(Math.max(seg.s0, seg.s1));
            const h = Math.abs(y(seg.s1) - y(seg.s0));
            const fits = c.labels && h > vSize * 1.4 && x.bandwidth > textWidth(fmtSeg(seg), vSize) + 6 * c.u;
            return (
              <g key={seg.si}>
                <rect x={x(s.label)} y={y0} width={x.bandwidth} height={h} fill={c.color(seg.si)} stroke={c.theme.background === "transparent" ? "none" : c.theme.background} strokeWidth={1 * c.u}>
                  <title>{`${s.label} · ${series[seg.si]}: ${fmtSeg(seg)}`}</title>
                </rect>
                {fits && (
                  <text x={x.center(s.label)} y={y0 + h / 2} dy="0.35em" textAnchor="middle" fontSize={vSize} fill={readable(c, seg.si)} fontFamily={c.theme.fontNumeric}>
                    {fmtSeg(seg)}
                  </text>
                )}
              </g>
            );
          })}
          {c.labels && !percent && textWidth(c.fmt(s.total), vSize) < x.step && (
            <text x={x.center(s.label)} y={y(s.pos) - vSize * 0.55} textAnchor="middle" fontSize={vSize} fontWeight={700} fill={c.theme.ink} fontFamily={c.theme.fontNumeric}>
              {c.fmt(s.total)}
            </text>
          )}
        </g>
      ))}
      <CategoryLabels c={c} labels={labels} xFor={(i) => x.center(labels[i])} y={bottom} layout={layout} />
    </g>
  );
}

function readable(c: RenderContext, i: number) {
  const col = c.color(i);
  const rgb = col.match(/^#([0-9a-f]{6})$/i);
  if (!rgb) return "#fff";
  const n = parseInt(rgb[1], 16);
  const l = (0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255;
  return l > 0.62 ? "#15171A" : "#FFFFFF";
}

export const stackedChart: ChartDefinition = {
  id: "stacked",
  name: { en: "Stacked bars", es: "Barras apiladas" },
  description: { en: "Totals and their parts, or 100% shares", es: "Totales y sus partes, o participación al 100%" },
  category: "composition",
  glyph: G.stacked,
  keywords: ["stack", "100%", "percent", "share", "apiladas"],
  fields: [labelField, seriesField],
  options: [
    {
      key: "mode",
      label: { en: "Mode", es: "Modo" },
      type: "select",
      default: "normal",
      choices: [
        { value: "normal", label: { en: "Totals", es: "Totales" } },
        { value: "percent", label: { en: "100% shares", es: "Participación 100%" } },
      ],
    },
    {
      key: "orientation",
      label: { en: "Orientation", es: "Orientación" },
      type: "select",
      default: "vertical",
      choices: [
        { value: "vertical", label: { en: "Vertical", es: "Vertical" } },
        { value: "horizontal", label: { en: "Horizontal", es: "Horizontal" } },
      ],
    },
    sortOption("none"),
    aggregateOption,
    maxItemsOption(20, 60),
  ],
  sample: {
    title: { en: "How people get to work", es: "Cómo va la gente al trabajo" },
    subtitle: { en: "Share of commuters by mode, selected cities", es: "Participación de viajeros por modo, ciudades seleccionadas" },
    source: "City mobility surveys (rounded)",
    rows: [
      { city: "Amsterdam", bike: 36, transit: 26, car: 22, walk: 16 },
      { city: "Tokyo", bike: 14, transit: 51, car: 12, walk: 23 },
      { city: "Paris", bike: 11, transit: 43, car: 13, walk: 33 },
      { city: "London", bike: 5, transit: 45, car: 29, walk: 21 },
      { city: "Los Angeles", bike: 1, transit: 7, car: 86, walk: 6 },
    ],
  },
  legend: seriesLegend,
  render: renderStacked,
};

/* ───────────────────────── Dumbbell ───────────────────────── */

export const dumbbellChart: ChartDefinition = {
  id: "dumbbell",
  name: { en: "Dumbbell", es: "Mancuerna" },
  description: { en: "Before vs after for each item", es: "Antes vs. después por elemento" },
  category: "comparison",
  glyph: G.dumbbell,
  keywords: ["before after", "gap", "change", "range", "connected dot"],
  fields: [
    labelField,
    { key: "start", label: { en: "Start value", es: "Valor inicial" }, type: "number" },
    { key: "end", label: { en: "End value", es: "Valor final" }, type: "number" },
  ],
  options: [
    {
      key: "sort",
      label: { en: "Sort", es: "Orden" },
      type: "select",
      default: "end",
      choices: [
        { value: "none", label: { en: "As in data", es: "Como en los datos" } },
        { value: "end", label: { en: "By end value", es: "Por valor final" } },
        { value: "change", label: { en: "By change", es: "Por cambio" } },
      ],
    },
    { key: "zero", label: { en: "Start axis at zero", es: "Eje desde cero" }, type: "boolean", default: false },
  ],
  sample: {
    title: { en: "Women in parliament: two decades of progress", es: "Mujeres en el parlamento: dos décadas de avance" },
    subtitle: { en: "Share of seats held by women, 2004 → 2024, %", es: "Porcentaje de escaños ocupados por mujeres, 2004 → 2024" },
    source: "Inter-Parliamentary Union",
    rows: [
      { country: "Mexico", "2004": 23, "2024": 50 },
      { country: "Rwanda", "2004": 49, "2024": 61 },
      { country: "Spain", "2004": 36, "2024": 44 },
      { country: "France", "2004": 12, "2024": 38 },
      { country: "Peru", "2004": 18, "2024": 39 },
      { country: "United Kingdom", "2004": 18, "2024": 41 },
      { country: "United States", "2004": 14, "2024": 29 },
      { country: "Japan", "2004": 7, "2024": 10 },
    ],
  },
  legend: (c) => [
    { label: pretty(c.col("start")) || "Start", color: dim(c, c.color(1), 0.2), shape: "circle" },
    { label: pretty(c.col("end")) || "End", color: c.color(0), shape: "circle" },
  ],
  render: (c) => {
    let items = c.rows
      .map((r) => ({ label: c.str(r, "label"), a: c.num(r, "start"), b: c.num(r, "end") }))
      .filter((d): d is { label: string; a: number; b: number } => d.a !== null && d.b !== null)
      .slice(0, 40);
    if (!items.length) return <EmptyState c={c} message={c.words.noData} />;
    const sort = c.opt("sort", "end");
    if (sort === "end") items = [...items].sort((p, q) => q.b - p.b);
    if (sort === "change") items = [...items].sort((p, q) => q.b - q.a - (p.b - p.a));
    const lSize = fs.label(c);
    const vSize = fs.value(c);
    const labelW = Math.min(Math.max(...items.map((i) => textWidth(i.label, lSize))), c.width * 0.3);
    const vals = items.flatMap((i) => [i.a, i.b]);
    const pad = c.labels ? Math.max(...vals.map((v) => textWidth(c.fmt(v), vSize))) + 14 * c.u : 10 * c.u;
    const axisH = fs.tick(c) * 2;
    const x = linear(vals, [labelW + 14 * c.u + pad, c.width - pad], { zero: c.opt("zero", false) });
    const rows = band(items.map((_, i) => String(i)), [0, c.height - axisH], 0.2);
    const r = Math.max(3.5 * c.u, Math.min(rows.bandwidth * 0.3, 9 * c.u));
    const startColor = dim(c, c.color(1), 0.2);
    return (
      <g>
        <XAxis c={c} scale={x} y0={0} y1={c.height - axisH} labelY={c.height - axisH + 4 * c.u} />
        {items.map((it, i) => {
          const cy = rows.center(String(i));
          const xa = x(it.a);
          const xb = x(it.b);
          const up = it.b >= it.a;
          return (
            <g key={i}>
              <text x={labelW + 4 * c.u} y={cy} dy="0.35em" textAnchor="end" fontSize={Math.min(lSize, rows.step * 0.7)} fill={c.theme.text} fontFamily={c.theme.fontBody}>
                {truncate(it.label, labelW, lSize)}
              </text>
              <line x1={xa} x2={xb} y1={cy} y2={cy} stroke={c.theme.axis} strokeWidth={3 * c.u} strokeLinecap="round" />
              <circle cx={xa} cy={cy} r={r} fill={startColor}>
                <title>{`${it.label}: ${c.fmt(it.a)} → ${c.fmt(it.b)}`}</title>
              </circle>
              <circle cx={xb} cy={cy} r={r} fill={c.color(0)}>
                <title>{`${it.label}: ${c.fmt(it.a)} → ${c.fmt(it.b)}`}</title>
              </circle>
              {c.labels && (
                <>
                  <text x={up ? xa - r - 6 * c.u : xa + r + 6 * c.u} y={cy} dy="0.35em" textAnchor={up ? "end" : "start"} fontSize={Math.min(vSize, rows.step * 0.7)} fill={c.theme.muted} fontFamily={c.theme.fontNumeric}>
                    {c.fmt(it.a)}
                  </text>
                  <text x={up ? xb + r + 6 * c.u : xb - r - 6 * c.u} y={cy} dy="0.35em" textAnchor={up ? "start" : "end"} fontSize={Math.min(vSize, rows.step * 0.7)} fontWeight={700} fill={c.theme.ink} fontFamily={c.theme.fontNumeric}>
                    {c.fmt(it.b)}
                  </text>
                </>
              )}
            </g>
          );
        })}
      </g>
    );
  },
};

/* ───────────────────────── Waterfall ───────────────────────── */

export const waterfallChart: ChartDefinition = {
  id: "waterfall",
  name: { en: "Waterfall", es: "Cascada" },
  description: { en: "How gains and losses add up to a total", es: "Cómo ganancias y pérdidas suman un total" },
  category: "composition",
  glyph: G.waterfall,
  keywords: ["bridge", "profit", "variance", "p&l", "cascada"],
  fields: [
    { ...labelField, label: { en: "Steps", es: "Pasos" } },
    { ...valueField, label: { en: "Change", es: "Cambio" } },
  ],
  options: [
    { key: "startIsTotal", label: { en: "First row is a starting total", es: "La primera fila es un total inicial" }, type: "boolean", default: true },
    { key: "showTotal", label: { en: "Show final total", es: "Mostrar total final" }, type: "boolean", default: true },
    { key: "totalLabel", label: { en: "Total label", es: "Etiqueta del total" }, type: "text", default: "Total" },
  ],
  sample: {
    title: { en: "From revenue to net profit", es: "De ingresos a utilidad neta" },
    subtitle: { en: "Fiscal year 2025, $ millions", es: "Año fiscal 2025, millones de $" },
    source: "Company annual report (illustrative)",
    rows: [
      { step: "Revenue", amount: 820 },
      { step: "Cost of sales", amount: -390 },
      { step: "R&D", amount: -140 },
      { step: "Marketing", amount: -96 },
      { step: "Admin", amount: -54 },
      { step: "Other income", amount: 22 },
      { step: "Taxes", amount: -38 },
    ],
  },
  legend: (c) => [
    { label: c.opt("totalLabel", "Total") || c.words.total, color: c.color(0) },
    { label: c.words.increase, color: c.theme.positive },
    { label: c.words.decrease, color: c.theme.negative },
  ],
  render: (c) => {
    const valueCol = c.col("value");
    if (!valueCol) return null;
    const raw = c.rows
      .map((r) => ({ label: c.str(r, "label"), v: c.num(r, "value") }))
      .filter((d): d is { label: string; v: number } => d.v !== null)
      .slice(0, 40);
    if (!raw.length) return <EmptyState c={c} message={c.words.noData} />;
    const steps: { label: string; s0: number; s1: number; kind: "total" | "up" | "down" }[] = [];
    let run = 0;
    raw.forEach((d, i) => {
      if (i === 0 && c.opt("startIsTotal", true)) {
        steps.push({ label: d.label, s0: 0, s1: d.v, kind: "total" });
        run = d.v;
      } else {
        steps.push({ label: d.label, s0: run, s1: run + d.v, kind: d.v >= 0 ? "up" : "down" });
        run += d.v;
      }
    });
    if (c.opt("showTotal", true)) steps.push({ label: c.opt("totalLabel", "Total") || "Total", s0: 0, s1: run, kind: "total" });
    const vals = steps.flatMap((s) => [s.s0, s.s1]);
    const labels = steps.map((s) => s.label);
    const vSize = fs.value(c);
    const top = c.labels ? vSize * 1.7 : 6 * c.u;
    let y = linear(vals, [c.height, top]);
    const left = tickLabelWidth(c, y) + 14 * c.u;
    const x = band(labels.map((_, i) => String(i)), [left, c.width], 0.24);
    const layout = layoutCategoryLabels(c, labels, x.step);
    const bottom = c.height - layout.height;
    y = linear(vals, [bottom, top]);
    return (
      <g>
        <YAxis c={c} scale={y} x0={left} x1={c.width} />
        {steps.map((s, i) => {
          const t = y(Math.max(s.s0, s.s1));
          const h = Math.max(1, Math.abs(y(s.s1) - y(s.s0)));
          const color = s.kind === "total" ? c.color(0) : s.kind === "up" ? c.theme.positive : c.theme.negative;
          const delta = s.s1 - s.s0;
          const text = s.kind === "total" ? c.fmt(s.s1) : (delta >= 0 ? "+" : "") + c.fmt(delta);
          const next = steps[i + 1];
          return (
            <g key={i}>
              <Bar x={x(String(i))} y={t} width={x.bandwidth} height={h} radius={c.corners * 0.6} fill={color} negative={s.s1 < s.s0} title={`${s.label}: ${text}`} />
              {next && next.kind !== "total" && (
                <line x1={x(String(i)) + x.bandwidth} x2={x(String(i + 1))} y1={y(s.s1)} y2={y(s.s1)} stroke={c.theme.axis} strokeDasharray={`${3 * c.u} ${3 * c.u}`} strokeWidth={c.u} />
              )}
              {c.labels && textWidth(text, vSize) < x.step + 6 * c.u && (
                <HaloText c={c} x={x.center(String(i))} y={t - vSize * 0.55} textAnchor="middle" fontSize={vSize} fontWeight={s.kind === "total" ? 700 : 500} fill={c.theme.text}>
                  {text}
                </HaloText>
              )}
            </g>
          );
        })}
        <CategoryLabels c={c} labels={labels} xFor={(i) => x.center(String(i))} y={bottom} layout={layout} />
      </g>
    );
  },
};

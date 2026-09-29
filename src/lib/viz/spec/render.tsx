import type { ReactNode } from "react";
import { parseDate, parseNumber } from "../data";
import { formatPercent } from "../format";
import { Bar, CategoryLabels, EmptyState, HaloText, YAxis, arcPath, fs, layoutCategoryLabels, linePath } from "../parts";
import { band, linear, logScale, mixHex, readableOn, type BandScale, type LinearScale } from "../scale";
import { pretty, textWidth, truncate } from "../text";
import { G } from "../charts/glyphs";
import { dateTicks } from "../charts/lines";
import type { ChartDefinition, LegendItem, RenderContext } from "../types";
import type { AxisSpec, Channel, ChannelName, Layer, PlotSpec } from "./types";

type Val = string | number | null;
type Rec = Record<string, Val>;

/* ───────────────────────── Data preparation ───────────────────────── */

function records(spec: PlotSpec, c: RenderContext): Rec[] {
  return c.rows.map((row, i) => {
    const r: Rec = { $index: i };
    for (const f of spec.fields) {
      if (f.type === "number") r[f.key] = c.num(row, f.key);
      else {
        const col = c.col(f.key);
        const v = col ? row[col] : null;
        r[f.key] = v === undefined ? null : typeof v === "number" ? v : v === null ? null : String(v);
      }
    }
    return r;
  });
}

function layerData(spec: PlotSpec, layer: Layer, recs: Rec[], c: RenderContext): Rec[] {
  let out = recs;
  if (layer.fold) {
    const cols = c.cols(layer.fold);
    out = [];
    for (const [i, r] of recs.entries()) {
      for (const col of cols) {
        out.push({ ...r, $series: pretty(col), $value: parseNumber(c.rows[i][col]) });
      }
    }
  }
  if (layer.filter) {
    const { field, op, value } = layer.filter;
    out = out.filter((r) => {
      const v = r[field];
      if (v === null) return false;
      const a = typeof value === "number" ? parseNumber(v) : String(v);
      if (a === null) return false;
      switch (op) {
        case "==":
          return a === value;
        case "!=":
          return a !== value;
        case ">":
          return a > value;
        case ">=":
          return a >= value;
        case "<":
          return a < value;
        default:
          return a <= value;
      }
    });
  }
  // Aggregation: group by every non-aggregated field channel.
  const entries = Object.entries(layer.encoding) as [ChannelName, Channel][];
  const agg = entries.filter(([, ch]) => ch.aggregate && ch.field);
  if (agg.length) {
    const keys = entries.filter(([, ch]) => !ch.aggregate && ch.field).map(([, ch]) => ch.field!);
    const groups = new Map<string, Rec[]>();
    for (const r of out) {
      const k = keys.map((f) => String(r[f])).join("\u0000");
      const g = groups.get(k);
      if (g) g.push(r);
      else groups.set(k, [r]);
    }
    out = [...groups.values()].map((g) => {
      const r: Rec = { ...g[0] };
      for (const [, ch] of agg) {
        const vals = g.map((x) => parseNumber(x[ch.field!])).filter((v): v is number => v !== null);
        const f = ch.field!;
        switch (ch.aggregate) {
          case "count":
            r[f] = g.length;
            break;
          case "mean":
            r[f] = vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
            break;
          case "min":
            r[f] = vals.length ? Math.min(...vals) : null;
            break;
          case "max":
            r[f] = vals.length ? Math.max(...vals) : null;
            break;
          default:
            r[f] = vals.reduce((a, b) => a + b, 0);
        }
      }
      return r;
    });
  }
  return out;
}

const get = (r: Rec, ch: Channel | undefined): Val => (ch ? (ch.field !== undefined ? r[ch.field] ?? null : ch.value ?? null) : null);
const getNum = (r: Rec, ch: Channel | undefined): number | null => parseNumber(get(r, ch));

/* ───────────────────────── Scales ───────────────────────── */

type AxisScale =
  | { kind: "band"; scale: BandScale; pos: (v: Val) => number | null; width: number }
  | { kind: "point"; domain: string[]; pos: (v: Val) => number | null; width: number }
  | { kind: "linear" | "log"; scale: LinearScale; pos: (v: Val) => number | null; width: 0 }
  | { kind: "time"; lo: number; hi: number; pos: (v: Val) => number | null; width: 0; r0: number; r1: number };

type AxisInfo = { type: NonNullable<AxisSpec["type"]>; values: Val[]; domain: string[]; nums: number[] };

function inferAxis(spec: PlotSpec, which: "x" | "y", prepared: { layer: Layer; data: Rec[] }[], stacks: Map<Layer, StackInfo>): AxisInfo {
  const axisSpec = spec[which] ?? {};
  const chans: ChannelName[] = which === "x" ? ["x", "x2"] : ["y", "y2"];
  const values: Val[] = [];
  const nums: number[] = [];
  let hasBar = false;
  let otherNumeric = true;
  for (const { layer, data } of prepared) {
    if (layer.mark === "arc") continue;
    const st = stacks.get(layer);
    for (const ch of chans) {
      const channel = layer.encoding[ch];
      if (!channel) continue;
      for (const r of data) values.push(get(r, channel));
    }
    if (st && st.valueAxis === which) nums.push(...st.extent);
    if (layer.mark === "bar" || layer.mark === "rect" || layer.mark === "tick") hasBar = true;
    const other = layer.encoding[which === "x" ? "y" : "x"];
    if (other && data.some((r) => typeof get(r, other) === "string" && parseNumber(get(r, other)) === null)) otherNumeric = false;
  }
  const present = values.filter((v) => v !== null && v !== "");
  const allNum = present.length > 0 && present.every((v) => parseNumber(v) !== null);
  let type = axisSpec.type;
  if (!type) {
    if (!allNum) {
      const dates = present.length > 1 && present.every((v) => typeof v === "string" && /\d/.test(v) && parseDate(v) !== null && /[-/]/.test(v));
      type = dates && !hasBar ? "time" : hasBar ? "band" : "point";
    } else if (hasBar && which === "x" && otherNumeric && !prepared.some((p) => p.layer.encoding.x2)) {
      type = "band";
    } else type = "linear";
  }
  const domain: string[] = [];
  const seen = new Set<string>();
  for (const v of present) {
    const k = String(v);
    if (!seen.has(k)) {
      seen.add(k);
      domain.push(k);
    }
  }
  if (type === "linear" || type === "log") nums.push(...present.map((v) => parseNumber(v)!).filter((n) => n !== null));
  if (type === "time") nums.push(...present.map((v) => parseDate(v as string)).filter((n): n is number => n !== null));
  return { type, values, domain, nums };
}

type StackInfo = { valueAxis: "x" | "y"; extent: number[]; base: Map<Rec, [number, number]> };

function computeStack(layer: Layer, data: Rec[]): StackInfo | null {
  if (!layer.stack || (layer.mark !== "bar" && layer.mark !== "area")) return null;
  const xNum = data.every((r) => parseNumber(get(r, layer.encoding.x)) !== null);
  const yNum = data.every((r) => parseNumber(get(r, layer.encoding.y)) !== null);
  const valueAxis: "x" | "y" = yNum || !xNum ? "y" : "x";
  const keyCh = valueAxis === "y" ? layer.encoding.x : layer.encoding.y;
  const valCh = valueAxis === "y" ? layer.encoding.y : layer.encoding.x;
  const pos = new Map<string, number>();
  const neg = new Map<string, number>();
  const base = new Map<Rec, [number, number]>();
  const extent: number[] = [0];
  for (const r of data) {
    const k = String(get(r, keyCh));
    const v = getNum(r, valCh) ?? 0;
    const m = v >= 0 ? pos : neg;
    const s0 = m.get(k) ?? 0;
    m.set(k, s0 + v);
    base.set(r, [s0, s0 + v]);
    extent.push(s0 + v);
  }
  return { valueAxis, extent, base };
}

/* ───────────────────────── Colors ───────────────────────── */

export function resolveColorRef(ref: string | undefined, c: RenderContext): string | undefined {
  if (!ref) return undefined;
  if (ref.startsWith("#")) return ref;
  if (ref === "accent") return c.color(0);
  if (ref.startsWith("palette:")) return c.color(Number(ref.slice(8)) || 0);
  const t = c.theme;
  const bg = t.background === "transparent" ? t.surface : t.background;
  const map: Record<string, string> = { ink: t.ink, text: t.text, muted: t.muted, grid: t.grid, axis: t.axis, positive: t.positive, negative: t.negative, background: bg };
  return map[ref];
}

function colorScale(spec: PlotSpec, prepared: { layer: Layer; data: Rec[] }[], c: RenderContext) {
  const cats: string[] = [];
  let lo = Infinity;
  let hi = -Infinity;
  for (const { layer, data } of prepared) {
    const ch = layer.encoding.color;
    if (!ch?.field) continue;
    for (const r of data) {
      const v = get(r, ch);
      if (v === null) continue;
      const fieldDef = spec.fields.find((f) => f.key === ch.field);
      if (typeof v === "number" && fieldDef?.type === "number") {
        lo = Math.min(lo, v);
        hi = Math.max(hi, v);
      } else if (!cats.includes(String(v)) && cats.length < 24) cats.push(String(v));
    }
  }
  const bg = c.theme.background === "transparent" ? c.theme.surface : c.theme.background;
  const light = mixHex(c.color(0), /^#/.test(bg) ? bg : "#FFFFFF", 0.85);
  return {
    cats,
    of(r: Rec, layer: Layer): string {
      const ch = layer.encoding.color;
      if (ch) {
        if (ch.field === undefined) return resolveColorRef(String(ch.value), c) ?? c.color(0);
        const v = get(r, ch);
        if (typeof v === "number" && Number.isFinite(lo) && !cats.length) return mixHex(light, c.color(0), (v - lo) / (hi - lo || 1));
        const i = cats.indexOf(String(v));
        return c.color(Math.max(0, i));
      }
      return resolveColorRef(layer.style?.fill, c) ?? c.color(0);
    },
  };
}

/* ───────────────────────── Rendering ───────────────────────── */

export function renderSpec(spec: PlotSpec, c: RenderContext): ReactNode {
  const recs = records(spec, c);
  if (!recs.length) return <EmptyState c={c} message={c.words.noData} />;
  const prepared = spec.layers.map((layer) => ({ layer, data: layerData(spec, layer, recs, c) }));
  const colors = colorScale(spec, prepared, c);

  if (spec.coord === "polar" || prepared.every((p) => p.layer.mark === "arc")) return renderPolar(prepared, colors, c);

  const stacks = new Map<Layer, StackInfo>();
  for (const p of prepared) {
    const st = computeStack(p.layer, p.data);
    if (st) stacks.set(p.layer, st);
  }
  const xi = inferAxis(spec, "x", prepared, stacks);
  const yi = inferAxis(spec, "y", prepared, stacks);
  const xs = spec.x ?? {};
  const ys = spec.y ?? {};
  const tSize = fs.tick(c);
  const lSize = fs.label(c);
  const zeroFor = (axis: AxisSpec, which: "x" | "y") =>
    axis.zero ?? prepared.some((p) => (p.layer.mark === "bar" || p.layer.mark === "area") && (which === "y" ? xi.type === "band" || xi.type === "point" || xi.type === "time" || xi.type === "linear" : yi.type === "band"));

  const fmtAxis = (axis: AxisSpec, v: number, step: number) =>
    axis.format === "percent" ? formatPercent(v, step < 0.01 ? 1 : 0) : axis.format === "raw" ? String(+v.toPrecision(10)) : c.fmtTick(v, step);

  // Y axis
  const sortDomain = (info: AxisInfo, axis: AxisSpec, valueCh: "x" | "y") => {
    const d = [...info.domain];
    if (axis.sort === "asc") d.sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
    else if (axis.sort === "desc") d.sort((a, b) => b.localeCompare(a, undefined, { numeric: true }));
    else if (axis.sort === "value-asc" || axis.sort === "value-desc") {
      const sums = new Map<string, number>();
      const other = valueCh;
      for (const { layer, data } of prepared) {
        const keyCh = layer.encoding[other === "y" ? "x" : "y"];
        for (const r of data) {
          const k = String(get(r, keyCh));
          sums.set(k, (sums.get(k) ?? 0) + (getNum(r, layer.encoding[other]) ?? 0));
        }
      }
      d.sort((a, b) => ((sums.get(a) ?? 0) - (sums.get(b) ?? 0)) * (axis.sort === "value-asc" ? 1 : -1));
    }
    return d;
  };
  const yDomain = yi.type === "band" || yi.type === "point" ? sortDomain(yi, ys, "x") : [];
  const xDomain = xi.type === "band" || xi.type === "point" ? sortDomain(xi, xs, "y") : [];

  const top = (ys.title ? lSize * 1.8 : 0) + tSize;
  const provisionalY = yi.type === "linear" ? linear(yi.nums, [c.height, top], { zero: zeroFor(ys, "y") }) : null;
  let left = 0;
  if (!ys.hidden) {
    if (yi.type === "band" || yi.type === "point") left = Math.min(c.width * 0.3, Math.max(...yDomain.map((d) => textWidth(d, lSize)))) + 14 * c.u;
    else if (yi.type === "log") left = Math.max(...logScale(yi.nums.filter((n) => n > 0), [0, 1]).ticks.map((t) => textWidth(fmtAxis(ys, t, 1), tSize))) + 14 * c.u;
    else if (provisionalY) left = Math.max(...provisionalY.ticks.map((t) => textWidth(fmtAxis(ys, t, provisionalY.step), tSize))) + 14 * c.u;
    else left = tSize * 4;
  }
  const right = c.width - (xi.type === "linear" ? tSize : 4 * c.u);
  let xLayout = null as ReturnType<typeof layoutCategoryLabels> | null;
  let bottom = c.height - (xs.title ? lSize * 1.8 : 0);
  if (!xs.hidden) {
    if (xi.type === "band" || xi.type === "point") {
      const slot = (right - left) / Math.max(1, xDomain.length);
      xLayout = layoutCategoryLabels(c, xDomain, slot);
      bottom -= xLayout.height;
    } else bottom -= tSize * 2.2;
  }

  const makeAxis = (info: AxisInfo, axis: AxisSpec, domain: string[], range: [number, number], which: "x" | "y"): AxisScale => {
    if (info.type === "band") {
      const s = band(domain, range, axis.padding ?? 0.25);
      return { kind: "band", scale: s, pos: (v) => (v === null ? null : s(String(v))), width: s.bandwidth };
    }
    if (info.type === "point") {
      const n = domain.length;
      const idx = new Map(domain.map((d, i) => [d, i]));
      const inset = Math.min(20 * c.u, (range[1] - range[0]) / 10);
      const r0 = range[0] + (range[1] > range[0] ? inset : -inset);
      const r1 = range[1] - (range[1] > range[0] ? inset : -inset);
      return {
        kind: "point",
        domain,
        pos: (v) => {
          const i = idx.get(String(v));
          return i === undefined ? null : n <= 1 ? (r0 + r1) / 2 : r0 + (i / (n - 1)) * (r1 - r0);
        },
        width: 0,
      };
    }
    if (info.type === "log") {
      const s = logScale(info.nums.filter((n) => n > 0).length ? info.nums.filter((n) => n > 0) : [1, 10], range);
      return { kind: "log", scale: s, pos: (v) => (parseNumber(v) !== null && parseNumber(v)! > 0 ? s(parseNumber(v)!) : null), width: 0 };
    }
    if (info.type === "time") {
      const lo = Math.min(...info.nums);
      const hi = Math.max(...info.nums);
      const [r0, r1] = range;
      return {
        kind: "time",
        lo,
        hi,
        r0,
        r1,
        pos: (v) => {
          const t = typeof v === "number" ? v : parseDate(v);
          return t === null ? null : r0 + ((t - lo) / (hi - lo || 1)) * (r1 - r0);
        },
        width: 0,
      };
    }
    const s = linear(info.nums, range, { zero: zeroFor(axis, which) });
    return { kind: "linear", scale: s, pos: (v) => (parseNumber(v) === null ? null : s(parseNumber(v)!)), width: 0 };
  };

  const X = makeAxis(xi, xs, xDomain, [left, right], "x");
  const Y = makeAxis(yi, ys, yDomain, yi.type === "band" || yi.type === "point" ? [top, bottom] : [bottom, top], "y");

  const parts: ReactNode[] = [];

  // Axes & grid
  if (!ys.hidden) {
    if (Y.kind === "linear") parts.push(<YAxisFmt key="ya" c={c} scale={Y.scale} x0={left} x1={right} grid={ys.grid ?? c.grid} fmt={(v, s) => fmtAxis(ys, v, s)} />);
    else if (Y.kind === "log")
      parts.push(<YAxisFmt key="ya" c={c} scale={Y.scale} x0={left} x1={right} grid={ys.grid ?? c.grid} fmt={(v) => fmtAxis(ys, v, 1)} />);
    else if (Y.kind === "band" || Y.kind === "point")
      parts.push(
        <g key="ya">
          {yDomain.map((d) => {
            const p = Y.pos(d)!;
            const cy = Y.kind === "band" ? p + Y.width / 2 : p;
            return (
              <text key={d} x={left - 10 * c.u} y={cy} dy="0.35em" textAnchor="end" fontSize={lSize} fill={c.theme.text} fontFamily={c.theme.fontBody}>
                {truncate(d, left - 14 * c.u, lSize)}
              </text>
            );
          })}
        </g>,
      );
  }
  if (!xs.hidden) {
    if (X.kind === "linear" || X.kind === "log") {
      const s = X.scale;
      const every = Math.max(1, Math.ceil((Math.max(...s.ticks.map((t) => textWidth(fmtAxis(xs, t, s.step || 1), tSize))) + 12 * c.u) / Math.max(1, Math.abs(s(s.ticks[1] ?? s.ticks[0]) - s(s.ticks[0])))));
      parts.push(
        <g key="xa">
          {s.ticks.map((t, i) => (
            <g key={t}>
              {(xs.grid ?? (c.grid && Y.kind !== "linear")) && <line x1={s(t)} x2={s(t)} y1={top} y2={bottom} stroke={t === 0 ? c.theme.axis : c.theme.grid} strokeWidth={c.u} />}
              {i % every === 0 && (
                <text x={s(t)} y={bottom + 6 * c.u} dy="0.8em" textAnchor="middle" fontSize={tSize} fill={c.theme.muted} fontFamily={c.theme.fontNumeric}>
                  {fmtAxis(xs, t, s.step || 1)}
                </text>
              )}
            </g>
          ))}
        </g>,
      );
    } else if (X.kind === "time") {
      const dt = dateTicks(X.lo, X.hi, Math.max(2, Math.floor((right - left) / (tSize * 7))));
      parts.push(
        <g key="xa">
          {dt.ticks.map((t) => (
            <text key={t} x={X.pos(t)!} y={bottom + 6 * c.u} dy="0.8em" textAnchor="middle" fontSize={tSize} fill={c.theme.muted} fontFamily={c.theme.fontNumeric}>
              {dt.fmt(t)}
            </text>
          ))}
        </g>,
      );
    } else if (xLayout) {
      parts.push(
        <CategoryLabels
          key="xa"
          c={c}
          labels={xDomain}
          xFor={(i) => (X.kind === "band" ? X.pos(xDomain[i])! + X.width / 2 : X.pos(xDomain[i])!)}
          y={bottom}
          layout={xLayout}
        />,
      );
    }
    if (Y.kind === "band" || Y.kind === "point") parts.push(<line key="xbase" x1={left} x2={left} y1={top} y2={bottom} stroke={c.theme.axis} strokeWidth={1.2 * c.u} />);
  }
  if (xs.title)
    parts.push(
      <text key="xt" x={right} y={c.height - 2 * c.u} textAnchor="end" fontSize={tSize} fontWeight={700} fill={c.theme.text} fontFamily={c.theme.fontBody}>
        {xs.title} →
      </text>,
    );
  if (ys.title)
    parts.push(
      <text key="yt" x={0} y={lSize} fontSize={tSize} fontWeight={700} fill={c.theme.text} fontFamily={c.theme.fontBody}>
        ↑ {ys.title}
      </text>,
    );

  // Layers
  prepared.forEach(({ layer, data }, li) => {
    parts.push(<g key={`l${li}`}>{renderLayer(layer, data, { X, Y, c, colors, stack: stacks.get(layer) ?? null, top, bottom, left, right, li })}</g>);
  });
  return <g>{parts}</g>;
}

function YAxisFmt({ c, scale, x0, x1, grid, fmt }: { c: RenderContext; scale: LinearScale; x0: number; x1: number; grid: boolean; fmt: (v: number, step: number) => string }) {
  const ctx: RenderContext = { ...c, grid, fmtTick: fmt };
  return <YAxis c={ctx} scale={scale} x0={x0} x1={x1} />;
}

type LayerEnv = {
  X: AxisScale;
  Y: AxisScale;
  c: RenderContext;
  colors: ReturnType<typeof colorScale>;
  stack: StackInfo | null;
  top: number;
  bottom: number;
  left: number;
  right: number;
  li: number;
};

function renderLayer(layer: Layer, data: Rec[], env: LayerEnv): ReactNode {
  const { X, Y, c, colors } = env;
  const st = layer.style ?? {};
  const enc = layer.encoding;
  const u = c.u;
  const fill = (r: Rec) => colors.of(r, layer);
  const stroke = resolveColorRef(st.stroke, c);
  const opacityOf = (r: Rec) => {
    const o = enc.opacity ? getNum(r, enc.opacity) : null;
    return o !== null ? Math.max(0.05, Math.min(1, o)) : st.opacity;
  };
  const textOf = (r: Rec): string => {
    const v = get(r, enc.text);
    if (v === null) return "";
    const n = typeof v === "number" ? v : null;
    if (n === null) return String(v);
    return st.format === "percent" ? formatPercent(n, Math.abs(n) < 0.1 ? 1 : 0) : st.format === "raw" ? String(n) : c.fmt(n);
  };
  // Largest size value, computed once per layer (not once per mark).
  let sizeMax = 1;
  if (enc.size?.field) for (const d of data) sizeMax = Math.max(sizeMax, getNum(d, enc.size) ?? 0);
  const sizeOf = (r: Rec, fallback: number) => {
    if (enc.size?.field) {
      const v = getNum(r, enc.size);
      return v === null || v <= 0 ? 0 : Math.sqrt(v / sizeMax) * (st.size ?? 24) * u + 2 * u;
    }
    const v = enc.size ? getNum(r, enc.size) : null;
    return (v ?? st.size ?? fallback) * u;
  };
  const xOf = (r: Rec) => X.pos(get(r, enc.x));
  const yOf = (r: Rec) => Y.pos(get(r, enc.y));
  const title = (r: Rec) =>
    Object.entries(enc)
      .filter(([, ch]) => ch?.field && !ch.field.startsWith("$index"))
      .map(([, ch]) => `${pretty(ch!.field)}: ${get(r, ch)}`)
      .join(" · ");
  const dash = st.dash?.map((d) => d * u).join(" ");

  switch (layer.mark) {
    case "bar": {
      const vertical = X.kind === "band" || (X.kind !== "linear" && Y.kind === "linear");
      const bandAx = vertical ? X : Y;
      if (bandAx.kind !== "band" && bandAx.kind !== "point") return null;
      const bw = bandAx.kind === "band" ? bandAx.width : Math.max(4 * u, 24 * u);
      const colorField = enc.color?.field;
      const groups = colorField && !layer.stack ? colors.cats : [];
      const inner = groups.length > 1 ? band(groups, [0, bw], 0.08, 0) : null;
      const thick = (inner ? inner.bandwidth : bw) * Math.min(1, st.size ?? 1);
      return data.map((r, i) => {
        const key = get(r, vertical ? enc.x : enc.y);
        let p0 = bandAx.pos(key);
        if (p0 === null) return null;
        if (bandAx.kind === "point") p0 -= bw / 2;
        const valCh = vertical ? enc.y : enc.x;
        const baseCh = vertical ? enc.y2 : enc.x2;
        const valAx = vertical ? Y : X;
        let v0: number;
        let v1: number;
        const sb = env.stack?.base.get(r);
        if (sb) [v0, v1] = sb;
        else {
          v1 = getNum(r, valCh) ?? 0;
          v0 = baseCh ? getNum(r, baseCh) ?? 0 : 0;
        }
        const a = valAx.pos(v0);
        const b = valAx.pos(v1);
        if (a === null || b === null) return null;
        const off = (inner ? inner(String(get(r, enc.color))) : 0) + ((inner ? inner.bandwidth : bw) - thick) / 2;
        const color = fill(r);
        const radius = (st.radius ?? c.corners / u) * u;
        return vertical ? (
          <Bar key={i} x={p0 + off} y={Math.min(a, b)} width={thick} height={Math.abs(b - a)} radius={radius} fill={color} negative={v1 < v0} opacity={opacityOf(r)} title={title(r)} />
        ) : (
          <Bar key={i} x={Math.min(a, b)} y={p0 + off} width={Math.abs(b - a)} height={thick} radius={radius} fill={color} orient="h" negative={v1 < v0} opacity={opacityOf(r)} title={title(r)} />
        );
      });
    }
    case "rect": {
      return data.map((r, i) => {
        const span = (ax: AxisScale, ch1?: Channel, ch2?: Channel): [number, number] | null => {
          const p1 = ax.pos(get(r, ch1));
          if (p1 === null) return null;
          if (ch2) {
            const p2 = ax.pos(get(r, ch2));
            if (p2 === null) return null;
            return [Math.min(p1, p2) + (ax.kind === "band" ? 0 : 0), Math.abs(p2 - p1) + (ax.kind === "band" ? ax.width : 0)];
          }
          if (ax.kind === "band") return [p1, ax.width];
          const w = (st.size ?? 10) * u;
          return [p1 - w / 2, w];
        };
        const sx = span(X, enc.x, enc.x2);
        const sy = span(Y, enc.y, enc.y2);
        if (!sx || !sy) return null;
        const g = 1 * u;
        return (
          <rect key={i} x={sx[0] + g / 2} y={sy[0] + g / 2} width={Math.max(0, sx[1] - g)} height={Math.max(0, sy[1] - g)} rx={(st.radius ?? 0) * u} fill={fill(r)} opacity={opacityOf(r)} stroke={stroke} strokeWidth={st.strokeWidth ? st.strokeWidth * u : undefined}>
            <title>{title(r)}</title>
          </rect>
        );
      });
    }
    case "line":
    case "area": {
      const byColor = new Map<string, Rec[]>();
      for (const r of data) {
        const k = enc.color?.field ? String(get(r, enc.color)) : "_";
        const list = byColor.get(k);
        if (list) list.push(r);
        else byColor.set(k, [r]);
      }
      const bandOff = (ax: AxisScale) => (ax.kind === "band" ? ax.width / 2 : 0);
      return [...byColor.entries()].map(([k, rs]) => {
        const pts = rs
          .map((r) => {
            const x = xOf(r);
            let y: number | null;
            const sb = env.stack?.base.get(r);
            if (sb) y = Y.pos(sb[1]);
            else y = yOf(r);
            return x === null || y === null ? null : { r, x: x + bandOff(X), y: y + bandOff(Y) };
          })
          .filter((p): p is { r: Rec; x: number; y: number } => p !== null)
          .sort((a, b) => (layer.order === "data" ? 0 : a.x - b.x));
        if (!pts.length) return null;
        const color = resolveColorRef(st.stroke, c) ?? fill(pts[0].r);
        const d = linePath(pts.map((p) => [p.x, p.y] as [number, number]), st.curve ?? "linear");
        if (layer.mark === "area") {
          const baseY = (p: { r: Rec }) => {
            const sb = env.stack?.base.get(p.r);
            if (sb) return Y.pos(sb[0])!;
            if (enc.y2) return Y.pos(get(p.r, enc.y2)) ?? env.bottom;
            return Y.kind === "linear" ? Y.scale(Math.max(Y.scale.domain[0], Math.min(0, Y.scale.domain[1]))) : env.bottom;
          };
          const lower = pts.map((p) => [p.x, baseY(p)] as [number, number]).reverse();
          const areaD = d + "L" + linePath(lower, st.curve ?? "linear").slice(1) + "Z";
          return (
            <g key={k}>
              <path d={areaD} fill={resolveColorRef(st.fill, c) ?? fill(pts[0].r)} opacity={st.opacity ?? 0.35} />
              {st.strokeWidth !== 0 && <path d={d} fill="none" stroke={color} strokeWidth={(st.strokeWidth ?? 2.5) * u} strokeLinejoin="round" />}
            </g>
          );
        }
        return <path key={k} d={d} fill="none" stroke={color} strokeWidth={(st.strokeWidth ?? 3) * u} strokeLinejoin="round" strokeLinecap="round" strokeDasharray={dash} opacity={st.opacity} />;
      });
    }
    case "point":
      return data.map((r, i) => {
        const x = xOf(r);
        const y = yOf(r);
        if (x === null || y === null) return null;
        const bx = X.kind === "band" ? X.width / 2 : 0;
        const by = Y.kind === "band" ? Y.width / 2 : 0;
        const rad = sizeOf(r, 6);
        if (rad <= 0) return null;
        return (
          <circle key={i} cx={x + bx} cy={y + by} r={rad} fill={fill(r)} opacity={opacityOf(r) ?? 0.9} stroke={stroke} strokeWidth={stroke ? (st.strokeWidth ?? 1.5) * u : undefined}>
            <title>{title(r)}</title>
          </circle>
        );
      });
    case "tick":
      return data.map((r, i) => {
        const x = xOf(r);
        const y = yOf(r);
        if (x === null || y === null) return null;
        const color = resolveColorRef(st.stroke, c) ?? fill(r);
        const w = (st.strokeWidth ?? 3) * u;
        if (X.kind === "band") {
          const len = X.width * (st.size ?? 0.9);
          return <line key={i} x1={x + (X.width - len) / 2} x2={x + (X.width + len) / 2} y1={y} y2={y} stroke={color} strokeWidth={w} strokeLinecap="round" />;
        }
        const len = Y.kind === "band" ? Y.width * (st.size ?? 0.9) : 16 * u;
        const y0 = Y.kind === "band" ? y + (Y.width - len) / 2 : y - len / 2;
        return <line key={i} x1={x} x2={x} y1={y0} y2={y0 + len} stroke={color} strokeWidth={w} strokeLinecap="round" />;
      });
    case "rule": {
      const color = resolveColorRef(st.stroke, c) ?? c.theme.ink;
      const w = (st.strokeWidth ?? 1.5) * u;
      const rows = enc.x?.field || enc.y?.field ? data : data.slice(0, 1);
      return rows.map((r, i) => {
        const bx = X.kind === "band" ? X.width / 2 : 0;
        const by = Y.kind === "band" ? Y.width / 2 : 0;
        const x1 = enc.x ? xOf(r) : null;
        const y1 = enc.y ? yOf(r) : null;
        const x2 = enc.x2 ? X.pos(get(r, enc.x2)) : null;
        const y2 = enc.y2 ? Y.pos(get(r, enc.y2)) : null;
        let coords: [number, number, number, number] | null = null;
        if (x1 !== null && y1 !== null) coords = [x1 + bx, y1 + by, (x2 ?? x1) + bx, (y2 ?? y1) + by];
        else if (y1 !== null) coords = [env.left, y1 + by, env.right, y1 + by];
        else if (x1 !== null) coords = [x1 + bx, env.top, x1 + bx, env.bottom];
        if (!coords) return null;
        return <line key={i} x1={coords[0]} y1={coords[1]} x2={coords[2]} y2={coords[3]} stroke={color} strokeWidth={w} strokeDasharray={dash} opacity={opacityOf(r)} />;
      });
    }
    case "text":
      return data.map((r, i) => {
        const x = xOf(r);
        const y = yOf(r);
        if (x === null || y === null) return null;
        const bx = X.kind === "band" ? X.width / 2 : 0;
        const by = Y.kind === "band" ? Y.width / 2 : 0;
        const size = (st.fontSize ?? 13) * u;
        const color = resolveColorRef(st.fill, c) ?? (enc.color ? fill(r) : c.theme.text);
        return (
          <HaloText key={i} c={c} x={x + bx + (st.dx ?? 0) * u} y={y + by + (st.dy ?? 0) * u} dy="0.35em" textAnchor={st.anchor ?? "middle"} fontSize={size} fontWeight={st.fontWeight ?? 600} fill={color} fontFamily={c.theme.fontBody}>
            {truncate(textOf(r), 300 * u, size)}
          </HaloText>
        );
      });
    default:
      return null;
  }
}

function renderPolar(prepared: { layer: Layer; data: Rec[] }[], colors: ReturnType<typeof colorScale>, c: RenderContext): ReactNode {
  const R = Math.min(c.width, c.height) / 2 - 12 * c.u;
  const cx = c.width / 2;
  const cy = c.height / 2;
  const bg = c.theme.background === "transparent" ? c.theme.surface : c.theme.background;
  return (
    <g>
      {prepared.map(({ layer, data }, li) => {
        if (layer.mark !== "arc") return null;
        const vals = data.map((r) => Math.max(0, getNum(r, layer.encoding.theta) ?? 0));
        const total = vals.reduce((a, b) => a + b, 0) || 1;
        const inner = R * (layer.style?.innerRadius ?? 0);
        let a = 0;
        return (
          <g key={li}>
            {data.map((r, i) => {
              const a0 = a;
              a += (vals[i] / total) * Math.PI * 2;
              const color = colors.of(r, layer);
              const mid = (a0 + a) / 2;
              const lr = inner ? (R + inner) / 2 : R * 0.65;
              const pctText = formatPercent(vals[i] / total);
              return (
                <g key={i}>
                  <path d={arcPath(cx, cy, R, inner, a0, a)} fill={color} fillRule="evenodd" stroke={bg} strokeWidth={2 * c.u} />
                  {c.labels && vals[i] / total > 0.05 && (
                    <text x={cx + lr * Math.sin(mid)} y={cy - lr * Math.cos(mid)} dy="0.35em" textAnchor="middle" fontSize={fs.label(c)} fontWeight={700} fill={readableOn(color)} fontFamily={c.theme.fontNumeric}>
                      {pctText}
                    </text>
                  )}
                </g>
              );
            })}
          </g>
        );
      })}
    </g>
  );
}

/* ───────────────────────── Definition adapter ───────────────────────── */

export function specLegend(spec: PlotSpec, c: RenderContext): LegendItem[] | null {
  if (spec.legend === false) return null;
  const recs = records(spec, c);
  const prepared = spec.layers.map((layer) => ({ layer, data: layerData(spec, layer, recs, c) }));
  const colors = colorScale(spec, prepared, c);
  if (colors.cats.length < 2) return null;
  const shape = spec.layers.some((l) => l.mark === "line") ? "line" : spec.layers.some((l) => l.mark === "point") ? "circle" : "square";
  return colors.cats.map((cat, i) => ({ label: cat, color: c.color(i), shape }));
}

/** Turns a validated spec into a regular chart definition. */
export function specToDefinition(spec: PlotSpec, id: string): ChartDefinition {
  return {
    id,
    name: spec.name,
    description: spec.description,
    category: spec.category,
    glyph: G.spec,
    fields: spec.fields.map((f) => ({ key: f.key, label: f.label, type: f.type, required: f.required, multiple: f.multiple })),
    sample: { title: spec.sample.title, subtitle: spec.sample.subtitle, source: spec.sample.source, rows: spec.sample.rows },
    legend: (c) => specLegend(spec, c),
    render: (c) => renderSpec(spec, c),
    isCustom: true,
  };
}

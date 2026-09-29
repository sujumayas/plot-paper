import type { ReactNode } from "react";
import type { LinearScale } from "./scale";
import { textWidth, truncate } from "./text";
import type { RenderContext } from "./types";

/* Font sizes relative to the typography unit. */
export const fs = {
  tick: (c: RenderContext) => 13 * c.u,
  label: (c: RenderContext) => 14 * c.u,
  value: (c: RenderContext) => 13 * c.u,
  big: (c: RenderContext) => 56 * c.u,
};

export function tickLabelWidth(c: RenderContext, scale: LinearScale): number {
  const size = fs.tick(c);
  return Math.max(...scale.ticks.map((t) => textWidth(c.fmtTick(t, scale.step), size)), size * 2);
}

/** Horizontal gridlines + tick labels for a vertical linear scale. */
export function YAxis({
  c,
  scale,
  x0,
  x1,
  showZero = true,
}: {
  c: RenderContext;
  scale: LinearScale;
  x0: number;
  x1: number;
  showZero?: boolean;
}) {
  const size = fs.tick(c);
  return (
    <g>
      {scale.ticks.map((t) => {
        const y = scale(t);
        const zero = t === 0 && showZero;
        return (
          <g key={t}>
            {(c.grid || zero) && (
              <line
                x1={x0}
                x2={x1}
                y1={y}
                y2={y}
                stroke={zero ? c.theme.axis : c.theme.grid}
                strokeWidth={zero ? 1.2 * c.u : 1 * c.u}
              />
            )}
            <text
              x={x0 - 10 * c.u}
              y={y}
              dy="0.35em"
              textAnchor="end"
              fontSize={size}
              fill={c.theme.muted}
              fontFamily={c.theme.fontNumeric}
            >
              {c.fmtTick(t, scale.step)}
            </text>
          </g>
        );
      })}
    </g>
  );
}

/** Vertical gridlines + tick labels for a horizontal linear scale. */
export function XAxis({
  c,
  scale,
  y0,
  y1,
  labelY,
}: {
  c: RenderContext;
  scale: LinearScale;
  y0: number;
  y1: number;
  labelY: number;
}) {
  const size = fs.tick(c);
  const minGap = Math.max(...scale.ticks.map((t) => textWidth(c.fmtTick(t, scale.step), size))) + 12 * c.u;
  const every = Math.max(1, Math.ceil(minGap / Math.abs(scale(scale.step) - scale(0) || 1)));
  return (
    <g>
      {scale.ticks.map((t, i) => {
        const x = scale(t);
        const zero = t === 0;
        return (
          <g key={t}>
            {(c.grid || zero) && (
              <line
                x1={x}
                x2={x}
                y1={y0}
                y2={y1}
                stroke={zero ? c.theme.axis : c.theme.grid}
                strokeWidth={zero ? 1.2 * c.u : 1 * c.u}
              />
            )}
            {i % every === 0 && (
              <text
                x={x}
                y={labelY}
                dy="0.8em"
                textAnchor="middle"
                fontSize={size}
                fill={c.theme.muted}
                fontFamily={c.theme.fontNumeric}
              >
                {c.fmtTick(t, scale.step)}
              </text>
            )}
          </g>
        );
      })}
    </g>
  );
}

export type CategoryLayout = {
  /** Height needed below the axis for the labels. */
  height: number;
  rotate: boolean;
  every: number;
  maxWidth: number;
};

/** Decides whether category labels fit horizontally, need rotation or skipping. */
export function layoutCategoryLabels(c: RenderContext, labels: string[], slot: number): CategoryLayout {
  const size = fs.label(c);
  const widest = Math.max(0, ...labels.map((l) => textWidth(l, size)));
  if (widest <= slot - 6 * c.u) return { height: size * 1.9, rotate: false, every: 1, maxWidth: slot };
  const maxWidth = Math.min(widest, 150 * c.u);
  if (slot >= size * 1.3) {
    return { height: maxWidth * 0.64 + size * 1.6, rotate: true, every: 1, maxWidth };
  }
  const every = Math.ceil((size * 1.4) / Math.max(1, slot));
  return { height: maxWidth * 0.64 + size * 1.6, rotate: true, every, maxWidth };
}

export function CategoryLabels({
  c,
  labels,
  xFor,
  y,
  layout,
}: {
  c: RenderContext;
  labels: string[];
  xFor: (i: number) => number;
  y: number;
  layout: CategoryLayout;
}) {
  const size = fs.label(c);
  return (
    <g>
      {labels.map((l, i) => {
        if (i % layout.every !== 0) return null;
        const x = xFor(i);
        const text = truncate(l, layout.rotate ? layout.maxWidth : layout.maxWidth - 4 * c.u, size);
        return layout.rotate ? (
          <text
            key={i}
            transform={`translate(${x},${y + size * 0.6}) rotate(-38)`}
            textAnchor="end"
            dy="0.35em"
            fontSize={size}
            fill={c.theme.text}
            fontFamily={c.theme.fontBody}
          >
            {text}
          </text>
        ) : (
          <text
            key={i}
            x={x}
            y={y + size * 0.5}
            dy="0.8em"
            textAnchor="middle"
            fontSize={size}
            fill={c.theme.text}
            fontFamily={c.theme.fontBody}
          >
            {text}
          </text>
        );
      })}
    </g>
  );
}

/** A bar whose far end is rounded (top for positive columns, right for positive bars). */
export function Bar({
  x,
  y,
  width,
  height,
  radius,
  fill,
  orient = "v",
  negative = false,
  opacity,
  title,
}: {
  x: number;
  y: number;
  width: number;
  height: number;
  radius: number;
  fill: string;
  orient?: "v" | "h";
  negative?: boolean;
  opacity?: number;
  title?: string;
}) {
  const w = Math.max(0, width);
  const h = Math.max(0, height);
  const r = Math.max(0, Math.min(radius, orient === "v" ? w / 2 : h / 2, orient === "v" ? h : w));
  let d: string;
  if (r <= 0.01) {
    d = `M${x},${y}h${w}v${h}h${-w}Z`;
  } else if (orient === "v" && !negative) {
    d = `M${x},${y + h}V${y + r}Q${x},${y} ${x + r},${y}H${x + w - r}Q${x + w},${y} ${x + w},${y + r}V${y + h}Z`;
  } else if (orient === "v") {
    d = `M${x},${y}V${y + h - r}Q${x},${y + h} ${x + r},${y + h}H${x + w - r}Q${x + w},${y + h} ${x + w},${y + h - r}V${y}Z`;
  } else if (!negative) {
    d = `M${x},${y}H${x + w - r}Q${x + w},${y} ${x + w},${y + r}V${y + h - r}Q${x + w},${y + h} ${x + w - r},${y + h}H${x}Z`;
  } else {
    d = `M${x + w},${y}H${x + r}Q${x},${y} ${x},${y + r}V${y + h - r}Q${x},${y + h} ${x + r},${y + h}H${x + w}Z`;
  }
  return (
    <path d={d} fill={fill} opacity={opacity}>
      {title ? <title>{title}</title> : null}
    </path>
  );
}

/** Label rendered with a halo in the background color so it stays legible over marks. */
export function HaloText({
  c,
  children,
  stroke,
  ...props
}: React.SVGProps<SVGTextElement> & { c: RenderContext; children: ReactNode; stroke?: string }) {
  const bg = c.theme.background === "transparent" ? c.theme.surface : c.theme.background;
  return (
    <text
      paintOrder="stroke"
      stroke={stroke ?? bg}
      strokeWidth={3 * c.u}
      strokeLinejoin="round"
      fontFamily={c.theme.fontNumeric}
      {...props}
    >
      {children}
    </text>
  );
}

/** Friendly message inside the plot area. */
export function EmptyState({ c, message }: { c: RenderContext; message: string }) {
  return (
    <g>
      <rect
        x={0}
        y={0}
        width={c.width}
        height={c.height}
        rx={12 * c.u}
        fill="none"
        stroke={c.theme.grid}
        strokeWidth={2 * c.u}
        strokeDasharray={`${8 * c.u} ${6 * c.u}`}
      />
      <text
        x={c.width / 2}
        y={c.height / 2}
        textAnchor="middle"
        dy="0.35em"
        fontSize={16 * c.u}
        fill={c.theme.muted}
        fontFamily={c.theme.fontBody}
      >
        {truncate(message, c.width - 40 * c.u, 16 * c.u)}
      </text>
    </g>
  );
}

/** Builds an SVG path through points; `curve` smooths with monotone cubic segments. */
export function linePath(pts: [number, number][], curve: "linear" | "smooth" | "step" = "linear"): string {
  if (!pts.length) return "";
  if (pts.length === 1) return `M${pts[0][0]},${pts[0][1]}`;
  if (curve === "step") {
    let d = `M${pts[0][0]},${pts[0][1]}`;
    for (let i = 1; i < pts.length; i++) {
      const mx = (pts[i - 1][0] + pts[i][0]) / 2;
      d += `H${mx}V${pts[i][1]}H${pts[i][0]}`;
    }
    return d;
  }
  if (curve === "linear" || pts.length < 3) return "M" + pts.map((p) => `${p[0]},${p[1]}`).join("L");
  // Monotone cubic (Fritsch–Carlson) — never overshoots the data.
  const n = pts.length;
  const dx: number[] = [];
  const m: number[] = [];
  for (let i = 0; i < n - 1; i++) {
    dx.push(pts[i + 1][0] - pts[i][0] || 1e-6);
    m.push((pts[i + 1][1] - pts[i][1]) / dx[i]);
  }
  const t: number[] = [m[0]];
  for (let i = 1; i < n - 1; i++) t.push(m[i - 1] * m[i] <= 0 ? 0 : (m[i - 1] + m[i]) / 2);
  t.push(m[n - 2]);
  for (let i = 0; i < n - 1; i++) {
    if (m[i] === 0) {
      t[i] = 0;
      t[i + 1] = 0;
      continue;
    }
    const a = t[i] / m[i];
    const b = t[i + 1] / m[i];
    const s = a * a + b * b;
    if (s > 9) {
      const k = 3 / Math.sqrt(s);
      t[i] = k * a * m[i];
      t[i + 1] = k * b * m[i];
    }
  }
  let d = `M${pts[0][0]},${pts[0][1]}`;
  for (let i = 0; i < n - 1; i++) {
    const h = dx[i] / 3;
    d += `C${pts[i][0] + h},${pts[i][1] + t[i] * h} ${pts[i + 1][0] - h},${pts[i + 1][1] - t[i + 1] * h} ${pts[i + 1][0]},${pts[i + 1][1]}`;
  }
  return d;
}

/** Arc path for pie / donut slices. Angles in radians, 0 = 12 o'clock. */
export function arcPath(cx: number, cy: number, r: number, inner: number, a0: number, a1: number): string {
  const sweep = a1 - a0;
  if (sweep >= Math.PI * 2 - 1e-6) {
    // Full circle: two half arcs.
    const outer = `M${cx},${cy - r}A${r},${r} 0 1 1 ${cx},${cy + r}A${r},${r} 0 1 1 ${cx},${cy - r}Z`;
    if (inner <= 0) return outer;
    return outer + `M${cx},${cy - inner}A${inner},${inner} 0 1 0 ${cx},${cy + inner}A${inner},${inner} 0 1 0 ${cx},${cy - inner}Z`;
  }
  const p = (rad: number, a: number) => [cx + rad * Math.sin(a), cy - rad * Math.cos(a)];
  const large = sweep > Math.PI ? 1 : 0;
  const [x0, y0] = p(r, a0);
  const [x1, y1] = p(r, a1);
  if (inner <= 0) return `M${cx},${cy}L${x0},${y0}A${r},${r} 0 ${large} 1 ${x1},${y1}Z`;
  const [ix1, iy1] = p(inner, a1);
  const [ix0, iy0] = p(inner, a0);
  return `M${x0},${y0}A${r},${r} 0 ${large} 1 ${x1},${y1}L${ix1},${iy1}A${inner},${inner} 0 ${large} 0 ${ix0},${iy0}Z`;
}

import { fmt, niceMax, Palette, toNum } from "../helpers";
import type { RenderFn } from "../types";
import { renderLine } from "./line";

export const renderArea: RenderFn = (data, cols, opts) => {
  const { width: W, height: H, accent, grid } = opts;
  const pal = Palette(accent);
  const padL = 56,
    padR = 20,
    padT = 16,
    padB = 48;
  const iw = W - padL - padR;
  const ih = H - padT - padB;
  const n = data.length;
  if (n < 2) return renderLine(data, cols, opts);
  const labelCol = cols[0];
  const seriesCols = cols.slice(1);
  const vals = seriesCols.map((c) => data.map((r) => toNum(r[c])));
  const max = niceMax(Math.max(...vals.flat(), 1));
  const xFor = (i: number) => padL + (i / (n - 1)) * iw;
  const yFor = (v: number) => padT + ih - (v / max) * ih;
  const ticks = 5;

  return (
    <g>
      {grid &&
        Array.from({ length: ticks + 1 }).map((_, i) => {
          const y = padT + ih - (i / ticks) * ih;
          return (
            <line
              key={i}
              x1={padL}
              x2={padL + iw}
              y1={y}
              y2={y}
              stroke="var(--line)"
            />
          );
        })}
      {Array.from({ length: ticks + 1 }).map((_, i) => {
        const y = padT + ih - (i / ticks) * ih;
        const v = (max * i) / ticks;
        return (
          <text
            key={i}
            x={padL - 10}
            y={y + 4}
            textAnchor="end"
            fontFamily="var(--num)"
            fontSize="10"
            fill="var(--fg-4)"
          >
            {fmt(v)}
          </text>
        );
      })}
      <line
        x1={padL}
        x2={padL + iw}
        y1={padT + ih}
        y2={padT + ih}
        stroke="var(--fg-1)"
      />
      {seriesCols.map((col, si) => {
        const color = si === 0 ? accent : pal[si % pal.length];
        const pts = data.map(
          (r, i) => [xFor(i), yFor(toNum(r[col]))] as [number, number],
        );
        const areaD =
          "M " +
          pts[0][0] +
          "," +
          (padT + ih) +
          " " +
          pts.map((p) => "L " + p[0] + "," + p[1]).join(" ") +
          " " +
          "L " +
          pts[pts.length - 1][0] +
          "," +
          (padT + ih) +
          " Z";
        const lineD = pts
          .map((p, i) => (i === 0 ? "M" : "L") + p[0] + "," + p[1])
          .join(" ");
        return (
          <g key={si}>
            <path d={areaD} fill={color} opacity="0.18" />
            <path
              d={lineD}
              fill="none"
              stroke={color}
              strokeWidth="2"
              strokeLinejoin="round"
            />
          </g>
        );
      })}
      {data.map((r, i) =>
        i % Math.max(1, Math.ceil(n / 8)) === 0 ? (
          <text
            key={i}
            x={xFor(i)}
            y={padT + ih + 18}
            textAnchor="middle"
            fontFamily="var(--body)"
            fontSize="11"
            fill="var(--fg-2)"
          >
            {String(r[labelCol]).slice(0, 10)}
          </text>
        ) : null,
      )}
    </g>
  );
};

import { fmt, niceMax, toNum } from "../helpers";
import type { RenderFn } from "../types";

export const renderScatter: RenderFn = (data, cols, opts) => {
  const { width: W, height: H, accent, grid } = opts;
  const padL = 56,
    padR = 20,
    padT = 16,
    padB = 48;
  const iw = W - padL - padR;
  const ih = H - padT - padB;
  const xCol = cols[0],
    yCol = cols[1],
    sizeCol = cols[2];
  const xs = data.map((r) => toNum(r[xCol]));
  const ys = data.map((r) => toNum(r[yCol]));
  const xMin = Math.min(...xs, 0),
    xMax = niceMax(Math.max(...xs, 1));
  const yMax = niceMax(Math.max(...ys, 1));
  const ticks = 5;
  const xFor = (v: number) => padL + ((v - xMin) / (xMax - xMin || 1)) * iw;
  const yFor = (v: number) => padT + ih - (v / yMax) * ih;
  const sizes = sizeCol ? data.map((r) => toNum(r[sizeCol])) : [];
  const sMax = sizes.length ? Math.max(...sizes, 1) : 1;

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
        const v = (yMax * i) / ticks;
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
      {Array.from({ length: ticks + 1 }).map((_, i) => {
        const x = padL + (i / ticks) * iw;
        const v = xMin + ((xMax - xMin) * i) / ticks;
        return (
          <text
            key={i}
            x={x}
            y={padT + ih + 18}
            textAnchor="middle"
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
      <line x1={padL} x2={padL} y1={padT} y2={padT + ih} stroke="var(--fg-1)" />
      {data.map((r, i) => {
        const size = sizeCol ? 4 + (sizes[i] / sMax) * 18 : 6;
        return (
          <circle
            key={i}
            cx={xFor(toNum(r[xCol]))}
            cy={yFor(toNum(r[yCol]))}
            r={size}
            fill={accent}
            opacity="0.55"
            stroke={accent}
            strokeWidth="1.2"
          >
            <title>
              {xCol}:{String(r[xCol])} {yCol}:{String(r[yCol])}
              {sizeCol ? " " + sizeCol + ":" + String(r[sizeCol]) : ""}
            </title>
          </circle>
        );
      })}
      <text
        x={padL + iw / 2}
        y={padT + ih + 36}
        textAnchor="middle"
        fontFamily="var(--num)"
        fontSize="10"
        fill="var(--fg-4)"
        letterSpacing="1.4"
      >
        {xCol.toUpperCase()}
      </text>
      <text
        x={padL - 36}
        y={padT + ih / 2}
        textAnchor="middle"
        fontFamily="var(--num)"
        fontSize="10"
        fill="var(--fg-4)"
        letterSpacing="1.4"
        transform={`rotate(-90, ${padL - 36}, ${padT + ih / 2})`}
      >
        {yCol.toUpperCase()}
      </text>
    </g>
  );
};

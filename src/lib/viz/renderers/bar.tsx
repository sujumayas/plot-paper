import { fmt, niceMax, toNum } from "../helpers";
import type { RenderFn } from "../types";

export const renderBar: RenderFn = (data, cols, opts) => {
  const { width: W, height: H, accent, grid, labels } = opts;
  const padL = 56,
    padR = 24,
    padT = 16,
    padB = 56;
  const iw = W - padL - padR;
  const ih = H - padT - padB;
  const n = data.length;
  if (n === 0) return null;
  const valCol = cols[1];
  const labelCol = cols[0];
  const values = data.map((r) => toNum(r[valCol]));
  const max = niceMax(Math.max(...values, 1));
  const barW = (iw / n) * 0.62;
  const step = iw / n;
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
              strokeWidth="1"
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
        strokeWidth="1"
      />
      {data.map((row, i) => {
        const v = values[i];
        const h = (v / max) * ih;
        const x = padL + i * step + (step - barW) / 2;
        const y = padT + ih - h;
        return (
          <g key={i}>
            <rect x={x} y={y} width={barW} height={h} fill={accent}>
              <title>
                {String(row[labelCol])}: {fmt(v)}
              </title>
            </rect>
            {labels && (
              <text
                x={x + barW / 2}
                y={y - 6}
                textAnchor="middle"
                fontFamily="var(--num)"
                fontSize="10"
                fill="var(--fg-2)"
              >
                {fmt(v)}
              </text>
            )}
            <text
              x={x + barW / 2}
              y={padT + ih + 16}
              textAnchor="middle"
              fontFamily="var(--body)"
              fontSize="11"
              fill="var(--fg-2)"
            >
              {String(row[labelCol]).slice(0, 10)}
            </text>
          </g>
        );
      })}
    </g>
  );
};

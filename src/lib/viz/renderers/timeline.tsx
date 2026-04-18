import { fmt, Palette, toNum } from "../helpers";
import type { RenderFn } from "../types";

export const renderTimeline: RenderFn = (data, cols, opts) => {
  const { width: W, height: H, accent } = opts;
  const pal = Palette(accent);
  const taskCol = cols[0],
    startCol = cols[1],
    endCol = cols[2];
  const padL = 130,
    padR = 24,
    padT = 20,
    padB = 30;
  const iw = W - padL - padR;
  const ih = H - padT - padB;
  const n = data.length;
  const starts = data.map((r) => toNum(r[startCol]));
  const ends = data.map((r) => toNum(r[endCol]));
  const min = Math.min(...starts);
  const max = Math.max(...ends);
  const xFor = (v: number) => padL + ((v - min) / (max - min || 1)) * iw;
  const rowH = ih / n;
  const barH = rowH * 0.5;
  const ticks = 6;

  return (
    <g>
      {Array.from({ length: ticks + 1 }).map((_, i) => {
        const v = min + ((max - min) * i) / ticks;
        const x = xFor(v);
        return (
          <g key={i}>
            <line
              x1={x}
              x2={x}
              y1={padT}
              y2={padT + ih}
              stroke="var(--rule-soft)"
            />
            <text
              x={x}
              y={padT + ih + 16}
              textAnchor="middle"
              fontFamily="var(--mono)"
              fontSize="10"
              fill="var(--ink-3)"
            >
              {fmt(v)}
            </text>
          </g>
        );
      })}
      {data.map((r, i) => {
        const x1 = xFor(toNum(r[startCol]));
        const x2 = xFor(toNum(r[endCol]));
        const y = padT + i * rowH + (rowH - barH) / 2;
        const color = i === 0 ? accent : pal[i % pal.length];
        return (
          <g key={i}>
            <text
              x={padL - 10}
              y={y + barH / 2 + 4}
              textAnchor="end"
              fontFamily="var(--sans)"
              fontSize="12"
              fill="var(--ink)"
            >
              {String(r[taskCol]).slice(0, 22)}
            </text>
            <rect
              x={x1}
              y={y}
              width={Math.max(x2 - x1, 2)}
              height={barH}
              rx="3"
              fill={color}
              opacity="0.8"
            />
          </g>
        );
      })}
    </g>
  );
};

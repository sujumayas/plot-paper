import { fmt, niceMax, toNum } from "../helpers";
import type { RenderFn } from "../types";

export const renderHBar: RenderFn = (data, cols, opts) => {
  const { width: W, height: H, accent } = opts;
  const labelCol = cols[0],
    valCol = cols[1];
  const sorted = [...data].sort((a, b) => toNum(b[valCol]) - toNum(a[valCol]));
  const n = sorted.length;
  const padL = Math.max(100, W * 0.22),
    padR = 48,
    padT = 12,
    padB = 20;
  const iw = W - padL - padR;
  const ih = H - padT - padB;
  const max = niceMax(Math.max(...sorted.map((r) => toNum(r[valCol])), 1));
  const rowH = ih / n;
  const barH = rowH * 0.62;

  return (
    <g>
      {sorted.map((r, i) => {
        const v = toNum(r[valCol]);
        const w = (v / max) * iw;
        const y = padT + i * rowH + (rowH - barH) / 2;
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
              {String(r[labelCol]).slice(0, 24)}
            </text>
            <rect x={padL} y={y} width={w} height={barH} fill={accent} />
            <text
              x={padL + w + 6}
              y={y + barH / 2 + 4}
              fontFamily="var(--mono)"
              fontSize="11"
              fill="var(--ink-2)"
            >
              {fmt(v)}
            </text>
          </g>
        );
      })}
    </g>
  );
};

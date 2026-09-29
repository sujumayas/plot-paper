import { fmt, toNum } from "../helpers";
import type { RenderFn } from "../types";

export const renderHeatmap: RenderFn = (data, cols, opts) => {
  const { width: W, height: H, accent } = opts;
  const rowCol = cols[0],
    colCol = cols[1],
    valCol = cols[2];
  const rows = Array.from(new Set(data.map((r) => r[rowCol])));
  const columns = Array.from(new Set(data.map((r) => r[colCol])));
  const padL = 80,
    padR = 20,
    padT = 40,
    padB = 30;
  const iw = W - padL - padR;
  const ih = H - padT - padB;
  const cw = iw / columns.length,
    ch = ih / rows.length;
  const values = data.map((r) => toNum(r[valCol]));
  const vMax = Math.max(...values, 1);
  const vMin = Math.min(...values, 0);

  return (
    <g>
      {rows.map((r, ri) =>
        columns.map((c, ci) => {
          const found = data.find(
            (d) => d[rowCol] === r && d[colCol] === c,
          );
          const v = found ? toNum(found[valCol]) : 0;
          const t = (v - vMin) / (vMax - vMin || 1);
          return (
            <g key={`${ri}-${ci}`}>
              <rect
                x={padL + ci * cw + 1}
                y={padT + ri * ch + 1}
                width={cw - 2}
                height={ch - 2}
                fill={accent}
                opacity={0.1 + t * 0.9}
              >
                <title>
                  {String(r)} / {String(c)}: {fmt(v)}
                </title>
              </rect>
              {cw > 40 && ch > 24 && (
                <text
                  x={padL + ci * cw + cw / 2}
                  y={padT + ri * ch + ch / 2 + 4}
                  textAnchor="middle"
                  fontFamily="var(--num)"
                  fontSize="10"
                  fill={t > 0.55 ? "var(--bg-card)" : "var(--fg-2)"}
                >
                  {fmt(v)}
                </text>
              )}
            </g>
          );
        }),
      )}
      {columns.map((c, ci) => (
        <text
          key={ci}
          x={padL + ci * cw + cw / 2}
          y={padT - 10}
          textAnchor="middle"
          fontFamily="var(--num)"
          fontSize="10"
          fill="var(--fg-4)"
          letterSpacing="1"
        >
          {String(c).slice(0, 10)}
        </text>
      ))}
      {rows.map((r, ri) => (
        <text
          key={ri}
          x={padL - 10}
          y={padT + ri * ch + ch / 2 + 4}
          textAnchor="end"
          fontFamily="var(--body)"
          fontSize="11"
          fill="var(--fg-2)"
        >
          {String(r).slice(0, 14)}
        </text>
      ))}
    </g>
  );
};

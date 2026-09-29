import { fmt, niceMax, Palette, toNum } from "../helpers";
import type { RenderFn } from "../types";

export const renderLine: RenderFn = (data, cols, opts) => {
  const { width: W, height: H, accent, grid } = opts;
  const pal = Palette(accent);
  const padL = 56,
    padR = 20,
    padT = 16,
    padB = 48;
  const iw = W - padL - padR;
  const ih = H - padT - padB;
  const n = data.length;
  if (n < 1) return null;
  const labelCol = cols[0];
  const seriesCols = cols.slice(1);
  const all = seriesCols.flatMap((c) => data.map((r) => toNum(r[c])));
  const max = niceMax(Math.max(...all, 1));
  const xFor = (i: number) => padL + (n === 1 ? iw / 2 : (i / (n - 1)) * iw);
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
        const d = pts
          .map((p, i) => (i === 0 ? "M" : "L") + p[0] + "," + p[1])
          .join(" ");
        return (
          <g key={si}>
            <path
              d={d}
              fill="none"
              stroke={color}
              strokeWidth="2"
              strokeLinejoin="round"
              strokeLinecap="round"
            />
            {pts.map(([x, y], i) => (
              <circle
                key={i}
                cx={x}
                cy={y}
                r="3"
                fill="var(--bg-card)"
                stroke={color}
                strokeWidth="1.5"
              />
            ))}
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
      {seriesCols.length > 1 && (
        <g transform={`translate(${padL}, ${padT - 4})`}>
          {seriesCols.map((c, si) => (
            <g key={si} transform={`translate(${si * 110}, 0)`}>
              <rect
                x={0}
                y={-6}
                width="10"
                height="2"
                fill={si === 0 ? accent : pal[si % pal.length]}
              />
              <text
                x={16}
                y={-2}
                fontFamily="var(--num)"
                fontSize="10"
                fill="var(--fg-4)"
              >
                {c}
              </text>
            </g>
          ))}
        </g>
      )}
    </g>
  );
};

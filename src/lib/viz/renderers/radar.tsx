import { niceMax, Palette, toNum } from "../helpers";
import type { RenderFn } from "../types";

export const renderRadar: RenderFn = (data, cols, opts) => {
  const { width: W, height: H, accent } = opts;
  const pal = Palette(accent);
  const cx = W / 2,
    cy = H / 2;
  const R = Math.min(W, H) / 2 - 56;
  const axes = data.map((r) => r[cols[0]]);
  const seriesCols = cols.slice(1);
  const n = axes.length;
  const all = seriesCols.flatMap((c) => data.map((r) => toNum(r[c])));
  const max = niceMax(Math.max(...all, 1));
  const angleFor = (i: number) => -Math.PI / 2 + (i * 2 * Math.PI) / n;
  const ringCount = 4;

  return (
    <g>
      {Array.from({ length: ringCount }).map((_, ri) => {
        const r = ((ri + 1) / ringCount) * R;
        const pts = axes.map((_, i) => {
          const a = angleFor(i);
          return [cx + r * Math.cos(a), cy + r * Math.sin(a)];
        });
        return (
          <polygon
            key={ri}
            points={pts.map((p) => p.join(",")).join(" ")}
            fill="none"
            stroke="var(--rule-soft)"
          />
        );
      })}
      {axes.map((_, i) => {
        const ang = angleFor(i);
        return (
          <line
            key={i}
            x1={cx}
            y1={cy}
            x2={cx + R * Math.cos(ang)}
            y2={cy + R * Math.sin(ang)}
            stroke="var(--rule-soft)"
          />
        );
      })}
      {seriesCols.map((c, si) => {
        const color = si === 0 ? accent : pal[si % pal.length];
        const pts = data.map((r, i) => {
          const v = toNum(r[c]);
          const rad = (v / max) * R;
          const ang = angleFor(i);
          return [cx + rad * Math.cos(ang), cy + rad * Math.sin(ang)];
        });
        return (
          <g key={si}>
            <polygon
              points={pts.map((p) => p.join(",")).join(" ")}
              fill={color}
              opacity="0.18"
              stroke={color}
              strokeWidth="2"
            />
            {pts.map(([x, y], i) => (
              <circle key={i} cx={x} cy={y} r="3" fill={color} />
            ))}
          </g>
        );
      })}
      {axes.map((a, i) => {
        const ang = angleFor(i);
        const lr = R + 18;
        const x = cx + lr * Math.cos(ang);
        const y = cy + lr * Math.sin(ang);
        return (
          <text
            key={i}
            x={x}
            y={y}
            textAnchor="middle"
            dominantBaseline="middle"
            fontFamily="var(--mono)"
            fontSize="10"
            fill="var(--ink-2)"
          >
            {String(a).slice(0, 14)}
          </text>
        );
      })}
    </g>
  );
};

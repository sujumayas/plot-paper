import { fmt, Palette, toNum } from "../helpers";
import type { RenderFn } from "../types";

export const renderPieOrDonut = (donut: boolean): RenderFn => {
  return (data, cols, opts) => {
    const { width: W, height: H, accent } = opts;
    const pal = Palette(accent);
    const cx = W / 2,
      cy = H / 2;
    const R = Math.min(W, H) / 2 - 48;
    const innerR = donut ? R * 0.58 : 0;
    const labelCol = cols[0];
    const valCol = cols[1];
    const values = data.map((r) => toNum(r[valCol]));
    const total = values.reduce((a, b) => a + b, 0) || 1;
    let angle = -Math.PI / 2;
    const slices = values.map((v, i) => {
      const a1 = angle;
      const a2 = angle + (v / total) * Math.PI * 2;
      angle = a2;
      const large = a2 - a1 > Math.PI ? 1 : 0;
      const x1 = cx + R * Math.cos(a1),
        y1 = cy + R * Math.sin(a1);
      const x2 = cx + R * Math.cos(a2),
        y2 = cy + R * Math.sin(a2);
      const ix1 = cx + innerR * Math.cos(a1),
        iy1 = cy + innerR * Math.sin(a1);
      const ix2 = cx + innerR * Math.cos(a2),
        iy2 = cy + innerR * Math.sin(a2);
      const d = donut
        ? `M ${x1} ${y1} A ${R} ${R} 0 ${large} 1 ${x2} ${y2} L ${ix2} ${iy2} A ${innerR} ${innerR} 0 ${large} 0 ${ix1} ${iy1} Z`
        : `M ${cx} ${cy} L ${x1} ${y1} A ${R} ${R} 0 ${large} 1 ${x2} ${y2} Z`;
      const mid = (a1 + a2) / 2;
      const lx = cx + (R + 16) * Math.cos(mid);
      const ly = cy + (R + 16) * Math.sin(mid);
      const anchor: "start" | "end" = Math.cos(mid) > 0 ? "start" : "end";
      return {
        d,
        color: i === 0 ? accent : pal[i % pal.length],
        label: data[i][labelCol],
        value: v,
        pct: v / total,
        lx,
        ly,
        anchor,
      };
    });

    return (
      <g>
        {slices.map((s, i) => (
          <g key={i}>
            <path d={s.d} fill={s.color} stroke="var(--bg-card)" strokeWidth="2">
              <title>
                {String(s.label)}: {fmt(s.value)} ({(s.pct * 100).toFixed(1)}%)
              </title>
            </path>
            {s.pct > 0.04 && (
              <text
                x={s.lx}
                y={s.ly}
                textAnchor={s.anchor}
                fontFamily="var(--num)"
                fontSize="10"
                fill="var(--fg-2)"
                dominantBaseline="middle"
              >
                {String(s.label).slice(0, 14)} · {(s.pct * 100).toFixed(0)}%
              </text>
            )}
          </g>
        ))}
        {donut && (
          <g>
            <text
              x={cx}
              y={cy - 2}
              textAnchor="middle"
              fontFamily="var(--display)"
              fontSize="28"
              fill="var(--fg-1)"
            >
              {fmt(total)}
            </text>
            <text
              x={cx}
              y={cy + 16}
              textAnchor="middle"
              fontFamily="var(--num)"
              fontSize="10"
              fill="var(--fg-4)"
              letterSpacing="1.5"
            >
              TOTAL
            </text>
          </g>
        )}
      </g>
    );
  };
};

export const renderPie = renderPieOrDonut(false);
export const renderDonut = renderPieOrDonut(true);

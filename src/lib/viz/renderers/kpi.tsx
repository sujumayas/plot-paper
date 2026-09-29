import { fmt, toNum } from "../helpers";
import type { RenderFn } from "../types";

export const renderKPI: RenderFn = (data, cols, opts) => {
  const { width: W, height: H } = opts;
  const labelCol = cols[0],
    valCol = cols[1],
    deltaCol = cols[2];
  const n = data.length;
  const cols_ = Math.min(n, 3) || 1;
  const rows_ = Math.max(1, Math.ceil(n / cols_));
  const cw = W / cols_,
    ch = H / rows_;

  return (
    <g>
      {data.map((r, i) => {
        const cx = (i % cols_) * cw + cw / 2;
        const cy = Math.floor(i / cols_) * ch + ch / 2;
        const delta = deltaCol ? toNum(r[deltaCol]) : null;
        return (
          <g key={i}>
            <text
              x={cx}
              y={cy - 18}
              textAnchor="middle"
              fontFamily="var(--num)"
              fontSize="11"
              fill="var(--fg-4)"
              letterSpacing="1.6"
            >
              {String(r[labelCol]).toUpperCase().slice(0, 22)}
            </text>
            <text
              x={cx}
              y={cy + 26}
              textAnchor="middle"
              fontFamily="var(--display)"
              fontWeight="700"
              fontSize="54"
              fill="var(--fg-1)"
              letterSpacing="-1.2"
            >
              {fmt(toNum(r[valCol]))}
            </text>
            {delta !== null && (
              <text
                x={cx}
                y={cy + 52}
                textAnchor="middle"
                fontFamily="var(--num)"
                fontSize="11"
                fontWeight="600"
                fill={delta >= 0 ? "var(--ibk-green)" : "var(--red)"}
              >
                {delta >= 0 ? "▲" : "▼"} {Math.abs(delta)}%
              </text>
            )}
          </g>
        );
      })}
    </g>
  );
};

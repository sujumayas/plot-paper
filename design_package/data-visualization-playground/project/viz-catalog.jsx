/* global React */
/* =============================================================
   Viz catalog — schemas + CSV templates + SVG renderers
   Each viz has:
     id, name, desc, glyph (small svg), columns[], sample data,
     render(data, opts) -> SVG children
   ============================================================= */

const Palette = (accent) => [
  accent,
  "oklch(64% 0.16 240)",
  "oklch(64% 0.16 150)",
  "oklch(64% 0.16 340)",
  "oklch(64% 0.16 80)",
  "oklch(50% 0.12 280)",
  "oklch(72% 0.14 25)",
  "oklch(56% 0.14 190)",
];

/* ---- helpers ---- */
const niceMax = (max) => {
  if (max <= 0) return 10;
  const pow = Math.pow(10, Math.floor(Math.log10(max)));
  const n = max / pow;
  let m;
  if (n <= 1) m = 1;
  else if (n <= 2) m = 2;
  else if (n <= 5) m = 5;
  else m = 10;
  return m * pow;
};
const fmt = (n) => {
  if (n === null || n === undefined || n === "") return "";
  if (typeof n !== "number") return n;
  if (Math.abs(n) >= 1000000) return (n/1000000).toFixed(1) + "M";
  if (Math.abs(n) >= 1000) return (n/1000).toFixed(1) + "k";
  return Number.isInteger(n) ? n.toString() : n.toFixed(2).replace(/\.?0+$/, "");
};
const toNum = (v) => {
  if (typeof v === "number") return v;
  if (v === null || v === undefined || v === "") return 0;
  const s = String(v).replace(/[,\s$€£]/g, "");
  const n = parseFloat(s);
  return isNaN(n) ? 0 : n;
};

/* ------------------------------------------------------------
   Renderer: BAR
   ------------------------------------------------------------ */
function renderBar(data, cols, opts) {
  const { width: W, height: H, accent, grid, labels } = opts;
  const pal = Palette(accent);
  const padL = 56, padR = 24, padT = 16, padB = 56;
  const iw = W - padL - padR;
  const ih = H - padT - padB;
  const n = data.length;
  if (n === 0) return null;
  const valCol = cols[1];
  const labelCol = cols[0];
  const values = data.map(r => toNum(r[valCol]));
  const max = niceMax(Math.max(...values, 1));
  const barW = iw / n * 0.62;
  const step = iw / n;
  const ticks = 5;
  return (
    <g>
      {/* y-grid */}
      {grid && Array.from({length: ticks+1}).map((_,i)=>{
        const y = padT + ih - (i/ticks)*ih;
        return <line key={i} x1={padL} x2={padL+iw} y1={y} y2={y} stroke="var(--rule-soft)" strokeWidth="1"/>;
      })}
      {/* y-axis labels */}
      {Array.from({length: ticks+1}).map((_,i)=>{
        const y = padT + ih - (i/ticks)*ih;
        const v = (max * i / ticks);
        return <text key={i} x={padL-10} y={y+4} textAnchor="end"
          fontFamily="var(--mono)" fontSize="10" fill="var(--ink-3)">{fmt(v)}</text>;
      })}
      {/* axis line */}
      <line x1={padL} x2={padL+iw} y1={padT+ih} y2={padT+ih} stroke="var(--ink)" strokeWidth="1"/>
      {/* bars */}
      {data.map((row, i) => {
        const v = values[i];
        const h = (v / max) * ih;
        const x = padL + i * step + (step - barW)/2;
        const y = padT + ih - h;
        return (
          <g key={i}>
            <rect x={x} y={y} width={barW} height={h} fill={accent}>
              <title>{row[labelCol]}: {fmt(v)}</title>
            </rect>
            {labels && <text x={x+barW/2} y={y-6} textAnchor="middle"
              fontFamily="var(--mono)" fontSize="10" fill="var(--ink-2)">{fmt(v)}</text>}
            <text x={x+barW/2} y={padT+ih+16} textAnchor="middle"
              fontFamily="var(--sans)" fontSize="11" fill="var(--ink-2)">
              {String(row[labelCol]).slice(0, 10)}
            </text>
          </g>
        );
      })}
    </g>
  );
}

/* ------------------------------------------------------------
   Renderer: LINE (single or multi series)
   ------------------------------------------------------------ */
function renderLine(data, cols, opts) {
  const { width: W, height: H, accent, grid, labels } = opts;
  const pal = Palette(accent);
  const padL = 56, padR = 20, padT = 16, padB = 48;
  const iw = W - padL - padR;
  const ih = H - padT - padB;
  const n = data.length;
  if (n < 1) return null;
  const labelCol = cols[0];
  const seriesCols = cols.slice(1);
  const all = seriesCols.flatMap(c => data.map(r => toNum(r[c])));
  const max = niceMax(Math.max(...all, 1));
  const xFor = i => padL + (n === 1 ? iw/2 : (i/(n-1)) * iw);
  const yFor = v => padT + ih - (v/max)*ih;
  const ticks = 5;
  return (
    <g>
      {grid && Array.from({length: ticks+1}).map((_,i)=>{
        const y = padT + ih - (i/ticks)*ih;
        return <line key={i} x1={padL} x2={padL+iw} y1={y} y2={y} stroke="var(--rule-soft)"/>;
      })}
      {Array.from({length: ticks+1}).map((_,i)=>{
        const y = padT + ih - (i/ticks)*ih;
        const v = max*i/ticks;
        return <text key={i} x={padL-10} y={y+4} textAnchor="end" fontFamily="var(--mono)" fontSize="10" fill="var(--ink-3)">{fmt(v)}</text>;
      })}
      <line x1={padL} x2={padL+iw} y1={padT+ih} y2={padT+ih} stroke="var(--ink)"/>
      {seriesCols.map((col, si) => {
        const color = si === 0 ? accent : pal[si % pal.length];
        const pts = data.map((r,i) => [xFor(i), yFor(toNum(r[col]))]);
        const d = pts.map((p,i) => (i===0 ? "M" : "L") + p[0] + "," + p[1]).join(" ");
        return (
          <g key={si}>
            <path d={d} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round"/>
            {pts.map(([x,y], i) => (
              <circle key={i} cx={x} cy={y} r="3" fill="var(--paper)" stroke={color} strokeWidth="1.5"/>
            ))}
          </g>
        );
      })}
      {/* x labels */}
      {data.map((r,i) => (
        i % Math.max(1, Math.ceil(n/8)) === 0 &&
        <text key={i} x={xFor(i)} y={padT+ih+18} textAnchor="middle" fontFamily="var(--sans)" fontSize="11" fill="var(--ink-2)">
          {String(r[labelCol]).slice(0, 10)}
        </text>
      ))}
      {/* legend */}
      {seriesCols.length > 1 && (
        <g transform={`translate(${padL}, ${padT-4})`}>
          {seriesCols.map((c, si) => (
            <g key={si} transform={`translate(${si*110}, 0)`}>
              <rect x={0} y={-6} width="10" height="2" fill={si === 0 ? accent : pal[si % pal.length]}/>
              <text x={16} y={-2} fontFamily="var(--mono)" fontSize="10" fill="var(--ink-3)">{c}</text>
            </g>
          ))}
        </g>
      )}
    </g>
  );
}

/* ------------------------------------------------------------
   Renderer: AREA (stacked or single)
   ------------------------------------------------------------ */
function renderArea(data, cols, opts) {
  const { width: W, height: H, accent, grid } = opts;
  const pal = Palette(accent);
  const padL = 56, padR = 20, padT = 16, padB = 48;
  const iw = W - padL - padR;
  const ih = H - padT - padB;
  const n = data.length;
  if (n < 2) return renderLine(data, cols, opts);
  const labelCol = cols[0];
  const seriesCols = cols.slice(1);
  const vals = seriesCols.map(c => data.map(r => toNum(r[c])));
  const max = niceMax(Math.max(...vals.flat(), 1));
  const xFor = i => padL + (i/(n-1)) * iw;
  const yFor = v => padT + ih - (v/max)*ih;
  const ticks = 5;
  return (
    <g>
      {grid && Array.from({length: ticks+1}).map((_,i)=>{
        const y = padT + ih - (i/ticks)*ih;
        return <line key={i} x1={padL} x2={padL+iw} y1={y} y2={y} stroke="var(--rule-soft)"/>;
      })}
      {Array.from({length: ticks+1}).map((_,i)=>{
        const y = padT + ih - (i/ticks)*ih;
        const v = max*i/ticks;
        return <text key={i} x={padL-10} y={y+4} textAnchor="end" fontFamily="var(--mono)" fontSize="10" fill="var(--ink-3)">{fmt(v)}</text>;
      })}
      <line x1={padL} x2={padL+iw} y1={padT+ih} y2={padT+ih} stroke="var(--ink)"/>
      {seriesCols.map((col, si) => {
        const color = si === 0 ? accent : pal[si % pal.length];
        const pts = data.map((r,i) => [xFor(i), yFor(toNum(r[col]))]);
        const areaD =
          "M " + pts[0][0] + "," + (padT+ih) + " " +
          pts.map(p => "L " + p[0] + "," + p[1]).join(" ") + " " +
          "L " + pts[pts.length-1][0] + "," + (padT+ih) + " Z";
        const lineD = pts.map((p,i) => (i===0?"M":"L") + p[0] + "," + p[1]).join(" ");
        return (
          <g key={si}>
            <path d={areaD} fill={color} opacity="0.18"/>
            <path d={lineD} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round"/>
          </g>
        );
      })}
      {data.map((r,i) => (
        i % Math.max(1, Math.ceil(n/8)) === 0 &&
        <text key={i} x={xFor(i)} y={padT+ih+18} textAnchor="middle" fontFamily="var(--sans)" fontSize="11" fill="var(--ink-2)">
          {String(r[labelCol]).slice(0, 10)}
        </text>
      ))}
    </g>
  );
}

/* ------------------------------------------------------------
   Renderer: PIE / DONUT
   ------------------------------------------------------------ */
function renderPie(data, cols, opts, donut = false) {
  const { width: W, height: H, accent } = opts;
  const pal = Palette(accent);
  const cx = W/2, cy = H/2;
  const R = Math.min(W, H)/2 - 48;
  const innerR = donut ? R * 0.58 : 0;
  const labelCol = cols[0];
  const valCol = cols[1];
  const values = data.map(r => toNum(r[valCol]));
  const total = values.reduce((a,b)=>a+b, 0) || 1;
  let angle = -Math.PI/2;
  const slices = values.map((v, i) => {
    const a1 = angle;
    const a2 = angle + (v/total) * Math.PI * 2;
    angle = a2;
    const large = (a2 - a1) > Math.PI ? 1 : 0;
    const x1 = cx + R * Math.cos(a1), y1 = cy + R * Math.sin(a1);
    const x2 = cx + R * Math.cos(a2), y2 = cy + R * Math.sin(a2);
    const ix1 = cx + innerR * Math.cos(a1), iy1 = cy + innerR * Math.sin(a1);
    const ix2 = cx + innerR * Math.cos(a2), iy2 = cy + innerR * Math.sin(a2);
    const d = donut
      ? `M ${x1} ${y1} A ${R} ${R} 0 ${large} 1 ${x2} ${y2} L ${ix2} ${iy2} A ${innerR} ${innerR} 0 ${large} 0 ${ix1} ${iy1} Z`
      : `M ${cx} ${cy} L ${x1} ${y1} A ${R} ${R} 0 ${large} 1 ${x2} ${y2} Z`;
    const mid = (a1+a2)/2;
    const lx = cx + (R+16) * Math.cos(mid);
    const ly = cy + (R+16) * Math.sin(mid);
    const anchor = Math.cos(mid) > 0 ? "start" : "end";
    return { d, color: i === 0 ? accent : pal[i % pal.length], label: data[i][labelCol], value: v, pct: v/total, lx, ly, anchor };
  });
  return (
    <g>
      {slices.map((s, i) => (
        <g key={i}>
          <path d={s.d} fill={s.color} stroke="var(--paper)" strokeWidth="2">
            <title>{s.label}: {fmt(s.value)} ({(s.pct*100).toFixed(1)}%)</title>
          </path>
          {s.pct > 0.04 && (
            <text x={s.lx} y={s.ly} textAnchor={s.anchor} fontFamily="var(--mono)" fontSize="10" fill="var(--ink-2)" dominantBaseline="middle">
              {String(s.label).slice(0,14)} · {(s.pct*100).toFixed(0)}%
            </text>
          )}
        </g>
      ))}
      {donut && (
        <g>
          <text x={cx} y={cy-2} textAnchor="middle" fontFamily="var(--serif)" fontSize="28" fill="var(--ink)">{fmt(total)}</text>
          <text x={cx} y={cy+16} textAnchor="middle" fontFamily="var(--mono)" fontSize="10" fill="var(--ink-3)" letterSpacing="1.5">TOTAL</text>
        </g>
      )}
    </g>
  );
}

/* ------------------------------------------------------------
   Renderer: SCATTER
   ------------------------------------------------------------ */
function renderScatter(data, cols, opts) {
  const { width: W, height: H, accent, grid } = opts;
  const padL = 56, padR = 20, padT = 16, padB = 48;
  const iw = W - padL - padR;
  const ih = H - padT - padB;
  const xCol = cols[0], yCol = cols[1], sizeCol = cols[2];
  const xs = data.map(r => toNum(r[xCol]));
  const ys = data.map(r => toNum(r[yCol]));
  const xMin = Math.min(...xs, 0), xMax = niceMax(Math.max(...xs, 1));
  const yMax = niceMax(Math.max(...ys, 1));
  const ticks = 5;
  const xFor = v => padL + ((v - xMin)/(xMax - xMin || 1)) * iw;
  const yFor = v => padT + ih - (v/yMax) * ih;
  const sizes = sizeCol ? data.map(r => toNum(r[sizeCol])) : [];
  const sMax = sizes.length ? Math.max(...sizes, 1) : 1;
  return (
    <g>
      {grid && Array.from({length: ticks+1}).map((_,i)=>{
        const y = padT + ih - (i/ticks)*ih;
        return <line key={i} x1={padL} x2={padL+iw} y1={y} y2={y} stroke="var(--rule-soft)"/>;
      })}
      {Array.from({length: ticks+1}).map((_,i)=>{
        const y = padT + ih - (i/ticks)*ih;
        const v = yMax*i/ticks;
        return <text key={i} x={padL-10} y={y+4} textAnchor="end" fontFamily="var(--mono)" fontSize="10" fill="var(--ink-3)">{fmt(v)}</text>;
      })}
      {Array.from({length: ticks+1}).map((_,i)=>{
        const x = padL + (i/ticks)*iw;
        const v = xMin + (xMax-xMin)*i/ticks;
        return <text key={i} x={x} y={padT+ih+18} textAnchor="middle" fontFamily="var(--mono)" fontSize="10" fill="var(--ink-3)">{fmt(v)}</text>;
      })}
      <line x1={padL} x2={padL+iw} y1={padT+ih} y2={padT+ih} stroke="var(--ink)"/>
      <line x1={padL} x2={padL} y1={padT} y2={padT+ih} stroke="var(--ink)"/>
      {data.map((r, i) => {
        const size = sizeCol ? 4 + (sizes[i]/sMax)*18 : 6;
        return (
          <circle key={i} cx={xFor(toNum(r[xCol]))} cy={yFor(toNum(r[yCol]))} r={size}
            fill={accent} opacity="0.55" stroke={accent} strokeWidth="1.2">
            <title>{xCol}:{r[xCol]} {yCol}:{r[yCol]}{sizeCol ? " "+sizeCol+":"+r[sizeCol] : ""}</title>
          </circle>
        );
      })}
      <text x={padL+iw/2} y={padT+ih+36} textAnchor="middle" fontFamily="var(--mono)" fontSize="10" fill="var(--ink-3)" letterSpacing="1.4">{xCol.toUpperCase()}</text>
      <text x={padL-36} y={padT+ih/2} textAnchor="middle" fontFamily="var(--mono)" fontSize="10" fill="var(--ink-3)" letterSpacing="1.4" transform={`rotate(-90, ${padL-36}, ${padT+ih/2})`}>{yCol.toUpperCase()}</text>
    </g>
  );
}

/* ------------------------------------------------------------
   Renderer: HORIZONTAL BAR (ranked)
   ------------------------------------------------------------ */
function renderHBar(data, cols, opts) {
  const { width: W, height: H, accent, labels } = opts;
  const labelCol = cols[0], valCol = cols[1];
  const sorted = [...data].sort((a,b) => toNum(b[valCol]) - toNum(a[valCol]));
  const n = sorted.length;
  const padL = Math.max(100, W*0.22), padR = 48, padT = 12, padB = 20;
  const iw = W - padL - padR;
  const ih = H - padT - padB;
  const max = niceMax(Math.max(...sorted.map(r => toNum(r[valCol])), 1));
  const rowH = ih / n;
  const barH = rowH * 0.62;
  return (
    <g>
      {sorted.map((r, i) => {
        const v = toNum(r[valCol]);
        const w = (v/max)*iw;
        const y = padT + i*rowH + (rowH-barH)/2;
        return (
          <g key={i}>
            <text x={padL-10} y={y+barH/2+4} textAnchor="end" fontFamily="var(--sans)" fontSize="12" fill="var(--ink)">
              {String(r[labelCol]).slice(0, 24)}
            </text>
            <rect x={padL} y={y} width={w} height={barH} fill={accent}/>
            <text x={padL+w+6} y={y+barH/2+4} fontFamily="var(--mono)" fontSize="11" fill="var(--ink-2)">
              {fmt(v)}
            </text>
          </g>
        );
      })}
    </g>
  );
}

/* ------------------------------------------------------------
   Renderer: HEATMAP (grid)
   ------------------------------------------------------------ */
function renderHeatmap(data, cols, opts) {
  const { width: W, height: H, accent } = opts;
  const rowCol = cols[0], colCol = cols[1], valCol = cols[2];
  const rows = [...new Set(data.map(r => r[rowCol]))];
  const columns = [...new Set(data.map(r => r[colCol]))];
  const padL = 80, padR = 20, padT = 40, padB = 30;
  const iw = W - padL - padR;
  const ih = H - padT - padB;
  const cw = iw/columns.length, ch = ih/rows.length;
  const values = data.map(r => toNum(r[valCol]));
  const vMax = Math.max(...values, 1);
  const vMin = Math.min(...values, 0);
  return (
    <g>
      {rows.map((r, ri) => columns.map((c, ci) => {
        const found = data.find(d => d[rowCol] === r && d[colCol] === c);
        const v = found ? toNum(found[valCol]) : 0;
        const t = (v - vMin) / ((vMax - vMin) || 1);
        return (
          <g key={ri+"-"+ci}>
            <rect x={padL + ci*cw + 1} y={padT + ri*ch + 1} width={cw-2} height={ch-2}
              fill={accent} opacity={0.1 + t*0.9}>
              <title>{r} / {c}: {fmt(v)}</title>
            </rect>
            {cw > 40 && ch > 24 && (
              <text x={padL+ci*cw+cw/2} y={padT+ri*ch+ch/2+4} textAnchor="middle"
                fontFamily="var(--mono)" fontSize="10"
                fill={t > 0.55 ? "var(--paper)" : "var(--ink-2)"}>{fmt(v)}</text>
            )}
          </g>
        );
      }))}
      {columns.map((c, ci) => (
        <text key={ci} x={padL + ci*cw + cw/2} y={padT-10} textAnchor="middle"
          fontFamily="var(--mono)" fontSize="10" fill="var(--ink-3)" letterSpacing="1">
          {String(c).slice(0, 10)}
        </text>
      ))}
      {rows.map((r, ri) => (
        <text key={ri} x={padL-10} y={padT+ri*ch+ch/2+4} textAnchor="end"
          fontFamily="var(--sans)" fontSize="11" fill="var(--ink-2)">
          {String(r).slice(0, 14)}
        </text>
      ))}
    </g>
  );
}

/* ------------------------------------------------------------
   Renderer: RADAR
   ------------------------------------------------------------ */
function renderRadar(data, cols, opts) {
  const { width: W, height: H, accent } = opts;
  const pal = Palette(accent);
  const cx = W/2, cy = H/2;
  const R = Math.min(W, H)/2 - 56;
  const axes = data.map(r => r[cols[0]]);
  const seriesCols = cols.slice(1);
  const n = axes.length;
  const all = seriesCols.flatMap(c => data.map(r => toNum(r[c])));
  const max = niceMax(Math.max(...all, 1));
  const angleFor = i => (-Math.PI/2) + (i * 2 * Math.PI / n);
  const ringCount = 4;
  return (
    <g>
      {/* rings */}
      {Array.from({length: ringCount}).map((_, ri) => {
        const r = (ri+1)/ringCount * R;
        const pts = axes.map((_, i) => {
          const a = angleFor(i);
          return [cx + r*Math.cos(a), cy + r*Math.sin(a)];
        });
        return <polygon key={ri} points={pts.map(p=>p.join(",")).join(" ")} fill="none" stroke="var(--rule-soft)"/>;
      })}
      {/* spokes */}
      {axes.map((a, i) => {
        const ang = angleFor(i);
        return <line key={i} x1={cx} y1={cy} x2={cx+R*Math.cos(ang)} y2={cy+R*Math.sin(ang)} stroke="var(--rule-soft)"/>;
      })}
      {/* series */}
      {seriesCols.map((c, si) => {
        const color = si === 0 ? accent : pal[si % pal.length];
        const pts = data.map((r, i) => {
          const v = toNum(r[c]);
          const rad = (v/max)*R;
          const ang = angleFor(i);
          return [cx + rad*Math.cos(ang), cy + rad*Math.sin(ang)];
        });
        return (
          <g key={si}>
            <polygon points={pts.map(p=>p.join(",")).join(" ")} fill={color} opacity="0.18" stroke={color} strokeWidth="2"/>
            {pts.map(([x,y], i) => <circle key={i} cx={x} cy={y} r="3" fill={color}/>)}
          </g>
        );
      })}
      {/* axis labels */}
      {axes.map((a, i) => {
        const ang = angleFor(i);
        const lr = R + 18;
        const x = cx + lr*Math.cos(ang);
        const y = cy + lr*Math.sin(ang);
        return (
          <text key={i} x={x} y={y} textAnchor="middle" dominantBaseline="middle"
            fontFamily="var(--mono)" fontSize="10" fill="var(--ink-2)">
            {String(a).slice(0,14)}
          </text>
        );
      })}
    </g>
  );
}

/* ------------------------------------------------------------
   Renderer: KPI STACK (big numbers)
   ------------------------------------------------------------ */
function renderKPI(data, cols, opts) {
  const { width: W, height: H, accent } = opts;
  const labelCol = cols[0], valCol = cols[1], deltaCol = cols[2];
  const n = data.length;
  const cols_ = Math.min(n, 3);
  const rows_ = Math.ceil(n/cols_);
  const cw = W/cols_, ch = H/rows_;
  return (
    <g>
      {data.map((r, i) => {
        const cx = (i % cols_) * cw + cw/2;
        const cy = Math.floor(i / cols_) * ch + ch/2;
        const delta = deltaCol ? toNum(r[deltaCol]) : null;
        return (
          <g key={i}>
            <text x={cx} y={cy-18} textAnchor="middle" fontFamily="var(--mono)" fontSize="11" fill="var(--ink-3)" letterSpacing="1.6">
              {String(r[labelCol]).toUpperCase().slice(0,22)}
            </text>
            <text x={cx} y={cy+26} textAnchor="middle" fontFamily="var(--serif)" fontSize="54" fill="var(--ink)" letterSpacing="-1">
              {fmt(toNum(r[valCol]))}
            </text>
            {delta !== null && (
              <text x={cx} y={cy+52} textAnchor="middle" fontFamily="var(--mono)" fontSize="11"
                fill={delta >= 0 ? accent : "var(--danger)"}>
                {delta >= 0 ? "▲" : "▼"} {Math.abs(delta)}%
              </text>
            )}
          </g>
        );
      })}
    </g>
  );
}

/* ------------------------------------------------------------
   Renderer: TIMELINE / GANTT-style
   ------------------------------------------------------------ */
function renderTimeline(data, cols, opts) {
  const { width: W, height: H, accent } = opts;
  const pal = Palette(accent);
  const taskCol = cols[0], startCol = cols[1], endCol = cols[2];
  const padL = 130, padR = 24, padT = 20, padB = 30;
  const iw = W - padL - padR;
  const ih = H - padT - padB;
  const n = data.length;
  const starts = data.map(r => toNum(r[startCol]));
  const ends = data.map(r => toNum(r[endCol]));
  const min = Math.min(...starts);
  const max = Math.max(...ends);
  const xFor = v => padL + ((v-min)/(max-min || 1))*iw;
  const rowH = ih/n;
  const barH = rowH*0.5;
  const ticks = 6;
  return (
    <g>
      {Array.from({length: ticks+1}).map((_,i)=>{
        const v = min + (max-min)*i/ticks;
        const x = xFor(v);
        return (
          <g key={i}>
            <line x1={x} x2={x} y1={padT} y2={padT+ih} stroke="var(--rule-soft)"/>
            <text x={x} y={padT+ih+16} textAnchor="middle" fontFamily="var(--mono)" fontSize="10" fill="var(--ink-3)">{fmt(v)}</text>
          </g>
        );
      })}
      {data.map((r, i) => {
        const x1 = xFor(toNum(r[startCol]));
        const x2 = xFor(toNum(r[endCol]));
        const y = padT + i*rowH + (rowH-barH)/2;
        const color = i === 0 ? accent : pal[i % pal.length];
        return (
          <g key={i}>
            <text x={padL-10} y={y+barH/2+4} textAnchor="end" fontFamily="var(--sans)" fontSize="12" fill="var(--ink)">{String(r[taskCol]).slice(0,22)}</text>
            <rect x={x1} y={y} width={Math.max(x2-x1, 2)} height={barH} rx="3" fill={color} opacity="0.8"/>
          </g>
        );
      })}
    </g>
  );
}

/* ============================================================
   The catalog
   ============================================================ */
const VizCatalog = [
  {
    id: "bar",
    name: "Bar chart",
    desc: "Category vs value",
    glyph: <g><rect x="2" y="10" width="3" height="8" fill="currentColor"/><rect x="7" y="6" width="3" height="12" fill="currentColor"/><rect x="12" y="12" width="3" height="6" fill="currentColor"/><rect x="17" y="3" width="3" height="15" fill="currentColor"/></g>,
    columns: [
      { name: "category", type: "string" },
      { name: "value", type: "number" }
    ],
    sample: [
      { category: "Almonds", value: 42 },
      { category: "Walnuts", value: 67 },
      { category: "Cashews", value: 31 },
      { category: "Pistachios", value: 58 },
      { category: "Pecans", value: 23 }
    ],
    category: "Comparison",
    render: renderBar
  },
  {
    id: "hbar",
    name: "Ranked bars",
    desc: "Sorted horizontal bars",
    glyph: <g><rect x="2" y="3" width="18" height="2.5" fill="currentColor"/><rect x="2" y="8" width="13" height="2.5" fill="currentColor"/><rect x="2" y="13" width="9" height="2.5" fill="currentColor"/><rect x="2" y="18" width="5" height="2.5" fill="currentColor"/></g>,
    columns: [
      { name: "label", type: "string" },
      { name: "score", type: "number" }
    ],
    sample: [
      { label: "Helsinki", score: 7.8 },
      { label: "Copenhagen", score: 7.6 },
      { label: "Reykjavik", score: 7.5 },
      { label: "Zurich", score: 7.2 },
      { label: "Oslo", score: 7.1 }
    ],
    category: "Comparison",
    render: renderHBar
  },
  {
    id: "line",
    name: "Line chart",
    desc: "Trends over time",
    glyph: <g><polyline points="2,16 6,11 10,13 14,7 18,9" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/></g>,
    columns: [
      { name: "date", type: "string" },
      { name: "value", type: "number" }
    ],
    sample: [
      { date: "Jan", value: 120 }, { date: "Feb", value: 132 },
      { date: "Mar", value: 101 }, { date: "Apr", value: 134 },
      { date: "May", value: 190 }, { date: "Jun", value: 230 },
      { date: "Jul", value: 210 }, { date: "Aug", value: 244 }
    ],
    category: "Trends",
    render: renderLine
  },
  {
    id: "multiline",
    name: "Multi-line",
    desc: "Compare series",
    glyph: <g><polyline points="2,16 6,12 10,14 14,8 18,10" fill="none" stroke="currentColor" strokeWidth="1.6"/><polyline points="2,13 6,9 10,11 14,5 18,7" fill="none" stroke="currentColor" strokeWidth="1.6" opacity="0.5"/></g>,
    columns: [
      { name: "date", type: "string" },
      { name: "revenue", type: "number" },
      { name: "cost", type: "number" }
    ],
    sample: [
      { date: "Q1-22", revenue: 120, cost: 90 },
      { date: "Q2-22", revenue: 148, cost: 94 },
      { date: "Q3-22", revenue: 175, cost: 110 },
      { date: "Q4-22", revenue: 210, cost: 120 },
      { date: "Q1-23", revenue: 232, cost: 135 },
      { date: "Q2-23", revenue: 280, cost: 148 }
    ],
    category: "Trends",
    render: renderLine
  },
  {
    id: "area",
    name: "Area chart",
    desc: "Volume over time",
    glyph: <g><path d="M2,18 L2,13 L6,10 L10,12 L14,6 L18,8 L18,18 Z" fill="currentColor" opacity="0.3"/><polyline points="2,13 6,10 10,12 14,6 18,8" fill="none" stroke="currentColor" strokeWidth="1.6"/></g>,
    columns: [
      { name: "month", type: "string" },
      { name: "users", type: "number" }
    ],
    sample: [
      { month: "Jan", users: 1200 }, { month: "Feb", users: 1450 },
      { month: "Mar", users: 1380 }, { month: "Apr", users: 1680 },
      { month: "May", users: 1920 }, { month: "Jun", users: 2310 }
    ],
    category: "Trends",
    render: renderArea
  },
  {
    id: "donut",
    name: "Donut chart",
    desc: "Parts of a whole",
    glyph: <g><circle cx="11" cy="11" r="7" fill="none" stroke="currentColor" strokeWidth="5"/><circle cx="11" cy="11" r="7" fill="none" stroke="var(--paper-2)" strokeWidth="5" strokeDasharray="14 100" transform="rotate(-90 11 11)"/></g>,
    columns: [
      { name: "segment", type: "string" },
      { name: "share", type: "number" }
    ],
    sample: [
      { segment: "Enterprise", share: 42 },
      { segment: "Mid-market", share: 28 },
      { segment: "SMB", share: 18 },
      { segment: "Self-serve", share: 12 }
    ],
    category: "Composition",
    render: (d, c, o) => renderPie(d, c, o, true)
  },
  {
    id: "pie",
    name: "Pie chart",
    desc: "Composition",
    glyph: <g><circle cx="11" cy="11" r="8" fill="currentColor" opacity="0.3"/><path d="M11,11 L11,3 A8,8 0 0,1 18,13 Z" fill="currentColor"/></g>,
    columns: [
      { name: "slice", type: "string" },
      { name: "amount", type: "number" }
    ],
    sample: [
      { slice: "Coffee", amount: 120 },
      { slice: "Groceries", amount: 340 },
      { slice: "Transit", amount: 90 },
      { slice: "Rent", amount: 1200 }
    ],
    category: "Composition",
    render: (d, c, o) => renderPie(d, c, o, false)
  },
  {
    id: "scatter",
    name: "Scatter plot",
    desc: "Correlation / dots",
    glyph: <g><circle cx="5" cy="16" r="1.4" fill="currentColor"/><circle cx="8" cy="12" r="1.4" fill="currentColor"/><circle cx="11" cy="14" r="1.4" fill="currentColor"/><circle cx="14" cy="8" r="1.4" fill="currentColor"/><circle cx="17" cy="6" r="1.4" fill="currentColor"/><circle cx="10" cy="9" r="1.4" fill="currentColor"/></g>,
    columns: [
      { name: "x", type: "number" },
      { name: "y", type: "number" },
      { name: "size", type: "number" }
    ],
    sample: [
      { x: 12, y: 43, size: 14 },  { x: 24, y: 67, size: 22 },
      { x: 33, y: 55, size: 9 },   { x: 45, y: 89, size: 30 },
      { x: 51, y: 42, size: 18 },  { x: 62, y: 76, size: 12 },
      { x: 71, y: 95, size: 26 },  { x: 82, y: 58, size: 8 }
    ],
    category: "Relationships",
    render: renderScatter
  },
  {
    id: "heatmap",
    name: "Heatmap",
    desc: "Matrix of values",
    glyph: <g><rect x="2" y="2" width="5" height="5" fill="currentColor" opacity="0.3"/><rect x="8" y="2" width="5" height="5" fill="currentColor" opacity="0.7"/><rect x="14" y="2" width="5" height="5" fill="currentColor" opacity="1"/><rect x="2" y="8" width="5" height="5" fill="currentColor" opacity="0.5"/><rect x="8" y="8" width="5" height="5" fill="currentColor" opacity="0.2"/><rect x="14" y="8" width="5" height="5" fill="currentColor" opacity="0.8"/><rect x="2" y="14" width="5" height="5" fill="currentColor" opacity="0.9"/><rect x="8" y="14" width="5" height="5" fill="currentColor" opacity="0.4"/><rect x="14" y="14" width="5" height="5" fill="currentColor" opacity="0.6"/></g>,
    columns: [
      { name: "row", type: "string" },
      { name: "column", type: "string" },
      { name: "value", type: "number" }
    ],
    sample: [
      { row: "Mon", column: "9am", value: 12 },  { row: "Mon", column: "12pm", value: 45 }, { row: "Mon", column: "3pm", value: 30 }, { row: "Mon", column: "6pm", value: 88 },
      { row: "Tue", column: "9am", value: 18 }, { row: "Tue", column: "12pm", value: 52 }, { row: "Tue", column: "3pm", value: 40 }, { row: "Tue", column: "6pm", value: 75 },
      { row: "Wed", column: "9am", value: 22 }, { row: "Wed", column: "12pm", value: 60 }, { row: "Wed", column: "3pm", value: 55 }, { row: "Wed", column: "6pm", value: 92 },
      { row: "Thu", column: "9am", value: 16 }, { row: "Thu", column: "12pm", value: 48 }, { row: "Thu", column: "3pm", value: 42 }, { row: "Thu", column: "6pm", value: 80 },
      { row: "Fri", column: "9am", value: 9 },  { row: "Fri", column: "12pm", value: 35 }, { row: "Fri", column: "3pm", value: 28 }, { row: "Fri", column: "6pm", value: 64 }
    ],
    category: "Relationships",
    render: renderHeatmap
  },
  {
    id: "radar",
    name: "Radar chart",
    desc: "Multivariate profile",
    glyph: <g><polygon points="11,3 18,8 16,17 6,17 4,8" fill="none" stroke="currentColor" strokeWidth="1"/><polygon points="11,6 15,9 14,15 8,15 6,9" fill="currentColor" opacity="0.4"/></g>,
    columns: [
      { name: "axis", type: "string" },
      { name: "you", type: "number" },
      { name: "benchmark", type: "number" }
    ],
    sample: [
      { axis: "Speed", you: 72, benchmark: 58 },
      { axis: "Accuracy", you: 84, benchmark: 70 },
      { axis: "Clarity", you: 66, benchmark: 74 },
      { axis: "Depth", you: 58, benchmark: 52 },
      { axis: "Breadth", you: 80, benchmark: 62 },
      { axis: "Rigor", you: 74, benchmark: 68 }
    ],
    category: "Distribution",
    render: renderRadar
  },
  {
    id: "kpi",
    name: "KPI cards",
    desc: "Big headline numbers",
    glyph: <g><rect x="2" y="4" width="8" height="6" fill="none" stroke="currentColor"/><rect x="12" y="4" width="8" height="6" fill="none" stroke="currentColor"/><rect x="2" y="12" width="8" height="6" fill="currentColor" opacity="0.3"/><rect x="12" y="12" width="8" height="6" fill="none" stroke="currentColor"/></g>,
    columns: [
      { name: "metric", type: "string" },
      { name: "value", type: "number" },
      { name: "change_pct", type: "number" }
    ],
    sample: [
      { metric: "Monthly revenue", value: 248000, change_pct: 12 },
      { metric: "Active users", value: 18400, change_pct: 8 },
      { metric: "Churn rate", value: 3.2, change_pct: -1 }
    ],
    category: "Headline",
    render: renderKPI
  },
  {
    id: "timeline",
    name: "Timeline",
    desc: "Schedule / gantt",
    glyph: <g><rect x="2" y="4" width="10" height="2.5" fill="currentColor"/><rect x="6" y="9" width="12" height="2.5" fill="currentColor" opacity="0.6"/><rect x="3" y="14" width="8" height="2.5" fill="currentColor" opacity="0.8"/></g>,
    columns: [
      { name: "task", type: "string" },
      { name: "start", type: "number" },
      { name: "end", type: "number" }
    ],
    sample: [
      { task: "Research", start: 1, end: 4 },
      { task: "Design", start: 3, end: 7 },
      { task: "Build", start: 6, end: 12 },
      { task: "Test", start: 10, end: 14 },
      { task: "Launch", start: 14, end: 15 }
    ],
    category: "Planning",
    render: renderTimeline
  }
];

const VizCategories = ["Comparison", "Trends", "Composition", "Relationships", "Distribution", "Headline", "Planning"];

window.VizCatalog = VizCatalog;
window.VizCategories = VizCategories;
window.VizHelpers = { fmt, toNum, niceMax, Palette };

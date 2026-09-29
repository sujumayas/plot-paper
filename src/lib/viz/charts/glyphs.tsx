/* 22×22 pictograms for the chart picker. They use currentColor. */

export const G = {
  bar: (
    <g fill="currentColor">
      <rect x="2" y="10" width="3.5" height="9" rx="1" />
      <rect x="7" y="6" width="3.5" height="13" rx="1" />
      <rect x="12" y="12" width="3.5" height="7" rx="1" />
      <rect x="17" y="3" width="3.5" height="16" rx="1" />
    </g>
  ),
  hbar: (
    <g fill="currentColor">
      <rect x="2" y="3" width="18" height="3" rx="1" />
      <rect x="2" y="8" width="13" height="3" rx="1" />
      <rect x="2" y="13" width="9" height="3" rx="1" />
      <rect x="2" y="18" width="5" height="3" rx="1" />
    </g>
  ),
  grouped: (
    <g fill="currentColor">
      <rect x="2" y="9" width="3" height="10" rx="0.8" />
      <rect x="5.5" y="12" width="3" height="7" rx="0.8" opacity="0.45" />
      <rect x="12" y="4" width="3" height="15" rx="0.8" />
      <rect x="15.5" y="8" width="3" height="11" rx="0.8" opacity="0.45" />
    </g>
  ),
  stacked: (
    <g fill="currentColor">
      <rect x="3" y="11" width="4" height="8" />
      <rect x="3" y="6" width="4" height="5" opacity="0.45" />
      <rect x="9.5" y="8" width="4" height="11" />
      <rect x="9.5" y="3" width="4" height="5" opacity="0.45" />
      <rect x="16" y="13" width="4" height="6" />
      <rect x="16" y="9" width="4" height="4" opacity="0.45" />
    </g>
  ),
  lollipop: (
    <g stroke="currentColor" strokeWidth="1.6" fill="currentColor">
      <line x1="3" y1="5" x2="16" y2="5" />
      <circle cx="17" cy="5" r="2" />
      <line x1="3" y1="11" x2="12" y2="11" />
      <circle cx="13" cy="11" r="2" />
      <line x1="3" y1="17" x2="7" y2="17" />
      <circle cx="8" cy="17" r="2" />
    </g>
  ),
  dumbbell: (
    <g stroke="currentColor" strokeWidth="1.6">
      <line x1="5" y1="5" x2="16" y2="5" />
      <circle cx="5" cy="5" r="2" fill="none" />
      <circle cx="16" cy="5" r="2" fill="currentColor" />
      <line x1="8" y1="11" x2="19" y2="11" />
      <circle cx="8" cy="11" r="2" fill="none" />
      <circle cx="19" cy="11" r="2" fill="currentColor" />
      <line x1="3" y1="17" x2="11" y2="17" />
      <circle cx="3" cy="17" r="2" fill="none" />
      <circle cx="11" cy="17" r="2" fill="currentColor" />
    </g>
  ),
  waterfall: (
    <g fill="currentColor">
      <rect x="2" y="8" width="3.5" height="11" />
      <rect x="6.5" y="4" width="3.5" height="4" opacity="0.5" />
      <rect x="11" y="4" width="3.5" height="6" opacity="0.8" />
      <rect x="15.5" y="10" width="3.5" height="9" />
    </g>
  ),
  line: (
    <polyline points="2,16 6,11 10,13 14,7 20,9" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
  ),
  multiline: (
    <g fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
      <polyline points="2,17 6,13 10,15 14,9 20,11" />
      <polyline points="2,12 6,9 10,10 14,5 20,4" opacity="0.5" />
    </g>
  ),
  area: (
    <g>
      <path d="M2,19 L2,13 L6,10 L10,12 L14,6 L20,8 L20,19 Z" fill="currentColor" opacity="0.3" />
      <polyline points="2,13 6,10 10,12 14,6 20,8" fill="none" stroke="currentColor" strokeWidth="1.8" />
    </g>
  ),
  slope: (
    <g stroke="currentColor" strokeWidth="1.6" fill="currentColor">
      <line x1="4" y1="4" x2="4" y2="19" opacity="0.3" />
      <line x1="18" y1="4" x2="18" y2="19" opacity="0.3" />
      <line x1="4" y1="15" x2="18" y2="6" />
      <line x1="4" y1="8" x2="18" y2="14" opacity="0.5" />
      <circle cx="4" cy="15" r="1.6" />
      <circle cx="18" cy="6" r="1.6" />
    </g>
  ),
  pie: (
    <g>
      <circle cx="11" cy="11" r="8.5" fill="currentColor" opacity="0.3" />
      <path d="M11,11 L11,2.5 A8.5,8.5 0 0,1 19,14 Z" fill="currentColor" />
    </g>
  ),
  donut: (
    <g fill="none" strokeWidth="4.5">
      <circle cx="11" cy="11" r="7" stroke="currentColor" opacity="0.3" />
      <path d="M11,4 A7,7 0 0,1 17.6,13.3" stroke="currentColor" />
    </g>
  ),
  treemap: (
    <g fill="currentColor">
      <rect x="2" y="2" width="10" height="18" rx="1" />
      <rect x="13" y="2" width="7" height="9" rx="1" opacity="0.6" />
      <rect x="13" y="12" width="7" height="8" rx="1" opacity="0.35" />
    </g>
  ),
  waffle: (
    <g fill="currentColor">
      {[0, 1, 2, 3].map((r) =>
        [0, 1, 2, 3].map((c) => (
          <rect key={`${r}${c}`} x={2.5 + c * 4.5} y={2.5 + r * 4.5} width="3.5" height="3.5" rx="0.7" opacity={r * 4 + c < 10 ? 1 : 0.3} />
        )),
      )}
    </g>
  ),
  funnel: (
    <g fill="currentColor">
      <rect x="2" y="3" width="18" height="4" rx="1" />
      <rect x="4.5" y="9" width="13" height="4" rx="1" opacity="0.7" />
      <rect x="7" y="15" width="8" height="4" rx="1" opacity="0.45" />
    </g>
  ),
  scatter: (
    <g fill="currentColor">
      <circle cx="5" cy="16" r="1.6" />
      <circle cx="8" cy="12" r="1.6" />
      <circle cx="11" cy="14" r="1.6" />
      <circle cx="14" cy="8" r="1.6" />
      <circle cx="17" cy="6" r="1.6" />
      <circle cx="10" cy="9" r="1.6" />
    </g>
  ),
  bubble: (
    <g fill="currentColor">
      <circle cx="6" cy="15" r="3.5" opacity="0.5" />
      <circle cx="13" cy="9" r="5" opacity="0.7" />
      <circle cx="18" cy="16" r="2.2" />
    </g>
  ),
  heatmap: (
    <g fill="currentColor">
      {[0, 1, 2].map((r) =>
        [0, 1, 2].map((c) => (
          <rect key={`${r}${c}`} x={2 + c * 6.3} y={2 + r * 6.3} width="5.5" height="5.5" rx="0.8" opacity={[0.3, 0.7, 1, 0.5, 0.2, 0.8, 0.9, 0.4, 0.6][r * 3 + c]} />
        )),
      )}
    </g>
  ),
  histogram: (
    <g fill="currentColor">
      <rect x="2" y="14" width="3" height="6" />
      <rect x="5.2" y="9" width="3" height="11" />
      <rect x="8.4" y="4" width="3" height="16" />
      <rect x="11.6" y="7" width="3" height="13" />
      <rect x="14.8" y="12" width="3" height="8" />
      <rect x="18" y="16" width="2.5" height="4" />
    </g>
  ),
  boxplot: (
    <g stroke="currentColor" strokeWidth="1.5" fill="none">
      <line x1="6" y1="2" x2="6" y2="6" />
      <rect x="3" y="6" width="6" height="9" fill="currentColor" fillOpacity="0.3" />
      <line x1="3" y1="10" x2="9" y2="10" />
      <line x1="6" y1="15" x2="6" y2="20" />
      <line x1="16" y1="5" x2="16" y2="9" />
      <rect x="13" y="9" width="6" height="6" fill="currentColor" fillOpacity="0.3" />
      <line x1="16" y1="15" x2="16" y2="18" />
    </g>
  ),
  radar: (
    <g>
      <polygon points="11,2 19.5,8 16.5,19 5.5,19 2.5,8" fill="none" stroke="currentColor" strokeWidth="1" opacity="0.5" />
      <polygon points="11,5 16,9 14,16 8,15 5.5,9" fill="currentColor" opacity="0.5" stroke="currentColor" strokeWidth="1.3" />
    </g>
  ),
  kpi: (
    <g fill="none" stroke="currentColor" strokeWidth="1.3">
      <rect x="2" y="4" width="8" height="6" rx="1" />
      <rect x="12" y="4" width="8" height="6" rx="1" />
      <rect x="2" y="12" width="8" height="6" rx="1" fill="currentColor" fillOpacity="0.3" />
      <rect x="12" y="12" width="8" height="6" rx="1" />
    </g>
  ),
  progress: (
    <g fill="none" strokeWidth="3" strokeLinecap="round">
      <circle cx="11" cy="11" r="8" stroke="currentColor" opacity="0.25" />
      <path d="M11,3 A8,8 0 1,1 3.4,13.5" stroke="currentColor" />
    </g>
  ),
  timeline: (
    <g fill="currentColor">
      <rect x="2" y="4" width="10" height="3" rx="1.5" />
      <rect x="7" y="9.5" width="12" height="3" rx="1.5" opacity="0.6" />
      <rect x="4" y="15" width="8" height="3" rx="1.5" opacity="0.8" />
    </g>
  ),
  calendar: (
    <g fill="currentColor">
      {Array.from({ length: 20 }).map((_, i) => (
        <rect key={i} x={2 + (i % 5) * 3.8} y={3 + Math.floor(i / 5) * 4.2} width="3" height="3.4" rx="0.6" opacity={[0.2, 0.6, 1, 0.4, 0.8][(i * 7) % 5]} />
      ))}
    </g>
  ),
  spec: (
    <g fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
      <path d="M8,4 L3,11 L8,18" />
      <path d="M14,4 L19,11 L14,18" />
      <circle cx="11" cy="11" r="1.6" fill="currentColor" />
    </g>
  ),
};

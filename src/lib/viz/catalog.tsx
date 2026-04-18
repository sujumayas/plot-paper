import type { BaseRendererId, VizCatalogEntry } from "./types";

export const SEED_CATALOG: VizCatalogEntry[] = [
  {
    id: "bar",
    name: "Bar chart",
    desc: "Category vs value",
    glyph: (
      <g>
        <rect x="2" y="10" width="3" height="8" fill="currentColor" />
        <rect x="7" y="6" width="3" height="12" fill="currentColor" />
        <rect x="12" y="12" width="3" height="6" fill="currentColor" />
        <rect x="17" y="3" width="3" height="15" fill="currentColor" />
      </g>
    ),
    columns: [
      { name: "category", type: "string" },
      { name: "value", type: "number" },
    ],
    sample: [
      { category: "Almonds", value: 42 },
      { category: "Walnuts", value: 67 },
      { category: "Cashews", value: 31 },
      { category: "Pistachios", value: 58 },
      { category: "Pecans", value: 23 },
    ],
    category: "Comparison",
    baseRendererId: "bar",
  },
  {
    id: "hbar",
    name: "Ranked bars",
    desc: "Sorted horizontal bars",
    glyph: (
      <g>
        <rect x="2" y="3" width="18" height="2.5" fill="currentColor" />
        <rect x="2" y="8" width="13" height="2.5" fill="currentColor" />
        <rect x="2" y="13" width="9" height="2.5" fill="currentColor" />
        <rect x="2" y="18" width="5" height="2.5" fill="currentColor" />
      </g>
    ),
    columns: [
      { name: "label", type: "string" },
      { name: "score", type: "number" },
    ],
    sample: [
      { label: "Helsinki", score: 7.8 },
      { label: "Copenhagen", score: 7.6 },
      { label: "Reykjavik", score: 7.5 },
      { label: "Zurich", score: 7.2 },
      { label: "Oslo", score: 7.1 },
    ],
    category: "Comparison",
    baseRendererId: "hbar",
  },
  {
    id: "line",
    name: "Line chart",
    desc: "Trends over time",
    glyph: (
      <g>
        <polyline
          points="2,16 6,11 10,13 14,7 18,9"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinejoin="round"
        />
      </g>
    ),
    columns: [
      { name: "date", type: "string" },
      { name: "value", type: "number" },
    ],
    sample: [
      { date: "Jan", value: 120 },
      { date: "Feb", value: 132 },
      { date: "Mar", value: 101 },
      { date: "Apr", value: 134 },
      { date: "May", value: 190 },
      { date: "Jun", value: 230 },
      { date: "Jul", value: 210 },
      { date: "Aug", value: 244 },
    ],
    category: "Trends",
    baseRendererId: "line",
  },
  {
    id: "multiline",
    name: "Multi-line",
    desc: "Compare series",
    glyph: (
      <g>
        <polyline
          points="2,16 6,12 10,14 14,8 18,10"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
        />
        <polyline
          points="2,13 6,9 10,11 14,5 18,7"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          opacity="0.5"
        />
      </g>
    ),
    columns: [
      { name: "date", type: "string" },
      { name: "revenue", type: "number" },
      { name: "cost", type: "number" },
    ],
    sample: [
      { date: "Q1-22", revenue: 120, cost: 90 },
      { date: "Q2-22", revenue: 148, cost: 94 },
      { date: "Q3-22", revenue: 175, cost: 110 },
      { date: "Q4-22", revenue: 210, cost: 120 },
      { date: "Q1-23", revenue: 232, cost: 135 },
      { date: "Q2-23", revenue: 280, cost: 148 },
    ],
    category: "Trends",
    baseRendererId: "multiline",
  },
  {
    id: "area",
    name: "Area chart",
    desc: "Volume over time",
    glyph: (
      <g>
        <path
          d="M2,18 L2,13 L6,10 L10,12 L14,6 L18,8 L18,18 Z"
          fill="currentColor"
          opacity="0.3"
        />
        <polyline
          points="2,13 6,10 10,12 14,6 18,8"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
        />
      </g>
    ),
    columns: [
      { name: "month", type: "string" },
      { name: "users", type: "number" },
    ],
    sample: [
      { month: "Jan", users: 1200 },
      { month: "Feb", users: 1450 },
      { month: "Mar", users: 1380 },
      { month: "Apr", users: 1680 },
      { month: "May", users: 1920 },
      { month: "Jun", users: 2310 },
    ],
    category: "Trends",
    baseRendererId: "area",
  },
  {
    id: "donut",
    name: "Donut chart",
    desc: "Parts of a whole",
    glyph: (
      <g>
        <circle
          cx="11"
          cy="11"
          r="7"
          fill="none"
          stroke="currentColor"
          strokeWidth="5"
        />
        <circle
          cx="11"
          cy="11"
          r="7"
          fill="none"
          stroke="var(--paper-2)"
          strokeWidth="5"
          strokeDasharray="14 100"
          transform="rotate(-90 11 11)"
        />
      </g>
    ),
    columns: [
      { name: "segment", type: "string" },
      { name: "share", type: "number" },
    ],
    sample: [
      { segment: "Enterprise", share: 42 },
      { segment: "Mid-market", share: 28 },
      { segment: "SMB", share: 18 },
      { segment: "Self-serve", share: 12 },
    ],
    category: "Composition",
    baseRendererId: "donut",
  },
  {
    id: "pie",
    name: "Pie chart",
    desc: "Composition",
    glyph: (
      <g>
        <circle cx="11" cy="11" r="8" fill="currentColor" opacity="0.3" />
        <path d="M11,11 L11,3 A8,8 0 0,1 18,13 Z" fill="currentColor" />
      </g>
    ),
    columns: [
      { name: "slice", type: "string" },
      { name: "amount", type: "number" },
    ],
    sample: [
      { slice: "Coffee", amount: 120 },
      { slice: "Groceries", amount: 340 },
      { slice: "Transit", amount: 90 },
      { slice: "Rent", amount: 1200 },
    ],
    category: "Composition",
    baseRendererId: "pie",
  },
  {
    id: "scatter",
    name: "Scatter plot",
    desc: "Correlation / dots",
    glyph: (
      <g>
        <circle cx="5" cy="16" r="1.4" fill="currentColor" />
        <circle cx="8" cy="12" r="1.4" fill="currentColor" />
        <circle cx="11" cy="14" r="1.4" fill="currentColor" />
        <circle cx="14" cy="8" r="1.4" fill="currentColor" />
        <circle cx="17" cy="6" r="1.4" fill="currentColor" />
        <circle cx="10" cy="9" r="1.4" fill="currentColor" />
      </g>
    ),
    columns: [
      { name: "x", type: "number" },
      { name: "y", type: "number" },
      { name: "size", type: "number" },
    ],
    sample: [
      { x: 12, y: 43, size: 14 },
      { x: 24, y: 67, size: 22 },
      { x: 33, y: 55, size: 9 },
      { x: 45, y: 89, size: 30 },
      { x: 51, y: 42, size: 18 },
      { x: 62, y: 76, size: 12 },
      { x: 71, y: 95, size: 26 },
      { x: 82, y: 58, size: 8 },
    ],
    category: "Relationships",
    baseRendererId: "scatter",
  },
  {
    id: "heatmap",
    name: "Heatmap",
    desc: "Matrix of values",
    glyph: (
      <g>
        <rect x="2" y="2" width="5" height="5" fill="currentColor" opacity="0.3" />
        <rect x="8" y="2" width="5" height="5" fill="currentColor" opacity="0.7" />
        <rect x="14" y="2" width="5" height="5" fill="currentColor" opacity="1" />
        <rect x="2" y="8" width="5" height="5" fill="currentColor" opacity="0.5" />
        <rect x="8" y="8" width="5" height="5" fill="currentColor" opacity="0.2" />
        <rect x="14" y="8" width="5" height="5" fill="currentColor" opacity="0.8" />
        <rect x="2" y="14" width="5" height="5" fill="currentColor" opacity="0.9" />
        <rect x="8" y="14" width="5" height="5" fill="currentColor" opacity="0.4" />
        <rect x="14" y="14" width="5" height="5" fill="currentColor" opacity="0.6" />
      </g>
    ),
    columns: [
      { name: "row", type: "string" },
      { name: "column", type: "string" },
      { name: "value", type: "number" },
    ],
    sample: [
      { row: "Mon", column: "9am", value: 12 },
      { row: "Mon", column: "12pm", value: 45 },
      { row: "Mon", column: "3pm", value: 30 },
      { row: "Mon", column: "6pm", value: 88 },
      { row: "Tue", column: "9am", value: 18 },
      { row: "Tue", column: "12pm", value: 52 },
      { row: "Tue", column: "3pm", value: 40 },
      { row: "Tue", column: "6pm", value: 75 },
      { row: "Wed", column: "9am", value: 22 },
      { row: "Wed", column: "12pm", value: 60 },
      { row: "Wed", column: "3pm", value: 55 },
      { row: "Wed", column: "6pm", value: 92 },
      { row: "Thu", column: "9am", value: 16 },
      { row: "Thu", column: "12pm", value: 48 },
      { row: "Thu", column: "3pm", value: 42 },
      { row: "Thu", column: "6pm", value: 80 },
      { row: "Fri", column: "9am", value: 9 },
      { row: "Fri", column: "12pm", value: 35 },
      { row: "Fri", column: "3pm", value: 28 },
      { row: "Fri", column: "6pm", value: 64 },
    ],
    category: "Relationships",
    baseRendererId: "heatmap",
  },
  {
    id: "radar",
    name: "Radar chart",
    desc: "Multivariate profile",
    glyph: (
      <g>
        <polygon
          points="11,3 18,8 16,17 6,17 4,8"
          fill="none"
          stroke="currentColor"
          strokeWidth="1"
        />
        <polygon
          points="11,6 15,9 14,15 8,15 6,9"
          fill="currentColor"
          opacity="0.4"
        />
      </g>
    ),
    columns: [
      { name: "axis", type: "string" },
      { name: "you", type: "number" },
      { name: "benchmark", type: "number" },
    ],
    sample: [
      { axis: "Speed", you: 72, benchmark: 58 },
      { axis: "Accuracy", you: 84, benchmark: 70 },
      { axis: "Clarity", you: 66, benchmark: 74 },
      { axis: "Depth", you: 58, benchmark: 52 },
      { axis: "Breadth", you: 80, benchmark: 62 },
      { axis: "Rigor", you: 74, benchmark: 68 },
    ],
    category: "Distribution",
    baseRendererId: "radar",
  },
  {
    id: "kpi",
    name: "KPI cards",
    desc: "Big headline numbers",
    glyph: (
      <g>
        <rect x="2" y="4" width="8" height="6" fill="none" stroke="currentColor" />
        <rect x="12" y="4" width="8" height="6" fill="none" stroke="currentColor" />
        <rect x="2" y="12" width="8" height="6" fill="currentColor" opacity="0.3" />
        <rect x="12" y="12" width="8" height="6" fill="none" stroke="currentColor" />
      </g>
    ),
    columns: [
      { name: "metric", type: "string" },
      { name: "value", type: "number" },
      { name: "change_pct", type: "number" },
    ],
    sample: [
      { metric: "Monthly revenue", value: 248000, change_pct: 12 },
      { metric: "Active users", value: 18400, change_pct: 8 },
      { metric: "Churn rate", value: 3.2, change_pct: -1 },
    ],
    category: "Headline",
    baseRendererId: "kpi",
  },
  {
    id: "timeline",
    name: "Timeline",
    desc: "Schedule / gantt",
    glyph: (
      <g>
        <rect x="2" y="4" width="10" height="2.5" fill="currentColor" />
        <rect x="6" y="9" width="12" height="2.5" fill="currentColor" opacity="0.6" />
        <rect x="3" y="14" width="8" height="2.5" fill="currentColor" opacity="0.8" />
      </g>
    ),
    columns: [
      { name: "task", type: "string" },
      { name: "start", type: "number" },
      { name: "end", type: "number" },
    ],
    sample: [
      { task: "Research", start: 1, end: 4 },
      { task: "Design", start: 3, end: 7 },
      { task: "Build", start: 6, end: 12 },
      { task: "Test", start: 10, end: 14 },
      { task: "Launch", start: 14, end: 15 },
    ],
    category: "Planning",
    baseRendererId: "timeline",
  },
];

export const findSeedViz = (id: string): VizCatalogEntry | undefined =>
  SEED_CATALOG.find((v) => v.id === id);

export const glyphForRenderer = (
  baseRendererId: BaseRendererId,
): VizCatalogEntry["glyph"] =>
  SEED_CATALOG.find((v) => v.baseRendererId === baseRendererId)?.glyph ?? null;

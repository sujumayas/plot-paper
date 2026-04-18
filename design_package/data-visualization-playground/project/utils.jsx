/* global React */
/* Utility functions: CSV, PNG/SVG/PDF export, sample public graphs */

/* ---------------- CSV ---------------- */
const CSVUtil = {
  // parse simple CSV (quoted fields supported)
  parse(text) {
    const rows = [];
    let cur = [], field = "", inQuotes = false;
    for (let i = 0; i < text.length; i++) {
      const c = text[i], n = text[i+1];
      if (inQuotes) {
        if (c === '"' && n === '"') { field += '"'; i++; }
        else if (c === '"') { inQuotes = false; }
        else field += c;
      } else {
        if (c === '"') inQuotes = true;
        else if (c === ",") { cur.push(field); field = ""; }
        else if (c === "\n") { cur.push(field); rows.push(cur); cur = []; field = ""; }
        else if (c === "\r") { /* skip */ }
        else field += c;
      }
    }
    if (field.length || cur.length) { cur.push(field); rows.push(cur); }
    if (!rows.length) return { headers: [], data: [] };
    const headers = rows[0].map(h => h.trim());
    const data = rows.slice(1).filter(r => r.some(c => c && c.trim() !== ""))
      .map(r => {
        const o = {};
        headers.forEach((h, i) => {
          const v = (r[i] ?? "").trim();
          const n = parseFloat(v);
          o[h] = v !== "" && !isNaN(n) && String(n) === v.replace(/^0+(?=\d)/, "") ? n : (v !== "" && !isNaN(n) ? n : v);
        });
        return o;
      });
    return { headers, data };
  },
  stringify(headers, data) {
    const escape = (v) => {
      if (v === null || v === undefined) return "";
      const s = String(v);
      if (s.includes(",") || s.includes('"') || s.includes("\n")) {
        return '"' + s.replace(/"/g, '""') + '"';
      }
      return s;
    };
    const lines = [headers.map(escape).join(",")];
    for (const row of data) {
      lines.push(headers.map(h => escape(row[h])).join(","));
    }
    return lines.join("\n");
  },
  templateFor(viz) {
    const headers = viz.columns.map(c => c.name);
    const sample = viz.sample.slice(0, 3);
    return CSVUtil.stringify(headers, sample);
  }
};

/* ---------------- download ---------------- */
function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click();
  setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(url); }, 100);
}
function downloadText(text, filename, mime = "text/plain") {
  downloadBlob(new Blob([text], { type: mime }), filename);
}

/* ---------------- SVG export ---------------- */
function exportSVG(svgEl, filename) {
  const clone = svgEl.cloneNode(true);
  // inline CSS vars
  const map = {
    "var(--paper)": "#f4efe6",
    "var(--paper-2)": "#ece6d9",
    "var(--ink)": "#1a1915",
    "var(--ink-2)": "#3a372f",
    "var(--ink-3)": "#6b665a",
    "var(--ink-4)": "#9a9486",
    "var(--rule)": "#cbc4b0",
    "var(--rule-soft)": "#ddd5c2",
    "var(--mono)": "ui-monospace, Menlo, monospace",
    "var(--sans)": "Helvetica, Arial, sans-serif",
    "var(--serif)": "Georgia, serif"
  };
  let serialized = new XMLSerializer().serializeToString(clone);
  Object.entries(map).forEach(([k,v]) => {
    serialized = serialized.split(k).join(v);
  });
  if (!serialized.startsWith("<?xml")) serialized = '<?xml version="1.0" encoding="UTF-8"?>\n' + serialized;
  downloadText(serialized, filename, "image/svg+xml");
}

function exportPNG(svgEl, filename, scale = 2) {
  const clone = svgEl.cloneNode(true);
  const map = {
    "var(--paper)": "#f4efe6", "var(--paper-2)": "#ece6d9",
    "var(--ink)": "#1a1915", "var(--ink-2)": "#3a372f",
    "var(--ink-3)": "#6b665a", "var(--ink-4)": "#9a9486",
    "var(--rule)": "#cbc4b0", "var(--rule-soft)": "#ddd5c2",
    "var(--mono)": "ui-monospace, Menlo, monospace",
    "var(--sans)": "Helvetica, Arial, sans-serif",
    "var(--serif)": "Georgia, serif"
  };
  let serialized = new XMLSerializer().serializeToString(clone);
  Object.entries(map).forEach(([k,v]) => { serialized = serialized.split(k).join(v); });
  const vb = svgEl.viewBox.baseVal;
  const w = (vb && vb.width) || svgEl.clientWidth || 800;
  const h = (vb && vb.height) || svgEl.clientHeight || 500;
  const img = new Image();
  const svgBlob = new Blob([serialized], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(svgBlob);
  img.onload = () => {
    const canvas = document.createElement("canvas");
    canvas.width = w*scale; canvas.height = h*scale;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#f4efe6";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    canvas.toBlob(b => { downloadBlob(b, filename); URL.revokeObjectURL(url); }, "image/png");
  };
  img.src = url;
}

function exportPDF(svgEl, filename, title) {
  // simple PDF via printing approach: open new window with SVG and call print.
  const clone = svgEl.cloneNode(true);
  const map = {
    "var(--paper)": "#f4efe6", "var(--paper-2)": "#ece6d9",
    "var(--ink)": "#1a1915", "var(--ink-2)": "#3a372f",
    "var(--ink-3)": "#6b665a", "var(--ink-4)": "#9a9486",
    "var(--rule)": "#cbc4b0", "var(--rule-soft)": "#ddd5c2",
    "var(--mono)": "ui-monospace, Menlo, monospace",
    "var(--sans)": "Helvetica, Arial, sans-serif",
    "var(--serif)": "Georgia, serif"
  };
  let serialized = new XMLSerializer().serializeToString(clone);
  Object.entries(map).forEach(([k,v]) => { serialized = serialized.split(k).join(v); });
  const w = window.open("", "_blank");
  if (!w) return;
  w.document.write(`<!doctype html><html><head><title>${title || filename}</title>
    <style>
      @page { size: A4 landscape; margin: 20mm; }
      body { margin: 0; padding: 32px; font-family: Helvetica, Arial, sans-serif; background: #f4efe6; color: #1a1915; }
      h1 { font-family: Georgia, serif; font-weight: 400; font-size: 32px; margin: 0 0 6px; letter-spacing: -0.01em; }
      .sub { font-family: ui-monospace, Menlo, monospace; font-size: 10px; letter-spacing: 0.14em; text-transform: uppercase; color: #6b665a; margin-bottom: 24px; }
      svg { max-width: 100%; height: auto; }
      .foot { margin-top: 20px; font-family: ui-monospace, Menlo, monospace; font-size: 10px; color: #6b665a; letter-spacing: 0.08em; text-transform: uppercase; border-top: 1px solid #cbc4b0; padding-top: 10px; }
    </style></head><body>
    <h1>${title || filename}</h1>
    <div class="sub">Plotpaper · ${new Date().toLocaleDateString()}</div>
    ${serialized}
    <div class="foot">Exported from Plotpaper</div>
    <script>setTimeout(() => { window.print(); }, 350);</script>
    </body></html>`);
  w.document.close();
}

/* ---------------- Public gallery seeds ---------------- */
const seededGraphs = [
  {
    id: "g-metro-rents",
    title: "Metro rent index",
    desc: "Median 1-bedroom rent across 9 metros, Q1 2026. Gathered from local listing boards — directional, not authoritative.",
    vizId: "hbar",
    author: "mara.k",
    likes: 184, remixes: 22, views: 2104,
    tags: ["housing", "geography"],
    data: [
      { label: "San Francisco", score: 3420 },
      { label: "New York", score: 3180 },
      { label: "Boston", score: 2790 },
      { label: "Seattle", score: 2410 },
      { label: "Los Angeles", score: 2380 },
      { label: "Austin", score: 1920 },
      { label: "Denver", score: 1780 },
      { label: "Atlanta", score: 1640 },
      { label: "Pittsburgh", score: 1180 }
    ]
  },
  {
    id: "g-coffee-week",
    title: "One week of coffee",
    desc: "Self-logged cups of coffee across seven days, broken out by hour. Yes I have a problem.",
    vizId: "heatmap",
    author: "jules.t",
    likes: 92, remixes: 12, views: 803,
    tags: ["personal", "time-series"],
    data: [
      { row: "Mon", column: "7am", value: 1 }, { row: "Mon", column: "10am", value: 2 }, { row: "Mon", column: "2pm", value: 1 }, { row: "Mon", column: "5pm", value: 0 },
      { row: "Tue", column: "7am", value: 1 }, { row: "Tue", column: "10am", value: 1 }, { row: "Tue", column: "2pm", value: 2 }, { row: "Tue", column: "5pm", value: 1 },
      { row: "Wed", column: "7am", value: 2 }, { row: "Wed", column: "10am", value: 2 }, { row: "Wed", column: "2pm", value: 2 }, { row: "Wed", column: "5pm", value: 1 },
      { row: "Thu", column: "7am", value: 1 }, { row: "Thu", column: "10am", value: 3 }, { row: "Thu", column: "2pm", value: 1 }, { row: "Thu", column: "5pm", value: 0 },
      { row: "Fri", column: "7am", value: 2 }, { row: "Fri", column: "10am", value: 2 }, { row: "Fri", column: "2pm", value: 0 }, { row: "Fri", column: "5pm", value: 1 },
      { row: "Sat", column: "7am", value: 0 }, { row: "Sat", column: "10am", value: 2 }, { row: "Sat", column: "2pm", value: 0 }, { row: "Sat", column: "5pm", value: 0 },
      { row: "Sun", column: "7am", value: 0 }, { row: "Sun", column: "10am", value: 1 }, { row: "Sun", column: "2pm", value: 0 }, { row: "Sun", column: "5pm", value: 0 }
    ]
  },
  {
    id: "g-startup-runway",
    title: "Seed-stage burn vs revenue",
    desc: "Rolling 6-quarter view for a synthetic startup. Good teaching example for unit economics conversations.",
    vizId: "multiline",
    author: "finn.v",
    likes: 318, remixes: 41, views: 4382,
    tags: ["business", "time-series"],
    data: [
      { date: "Q1-24", revenue: 42, cost: 180 },
      { date: "Q2-24", revenue: 68, cost: 195 },
      { date: "Q3-24", revenue: 94, cost: 210 },
      { date: "Q4-24", revenue: 138, cost: 225 },
      { date: "Q1-25", revenue: 201, cost: 240 },
      { date: "Q2-25", revenue: 286, cost: 262 },
      { date: "Q3-25", revenue: 342, cost: 280 }
    ]
  },
  {
    id: "g-election-turnout",
    title: "Youth turnout by region",
    desc: "Share of 18-29 year-olds voting in the last midterm, aggregated from state records.",
    vizId: "bar",
    author: "rina.a",
    likes: 241, remixes: 18, views: 3010,
    tags: ["politics", "geography"],
    data: [
      { category: "Northeast", value: 48 },
      { category: "Midwest", value: 41 },
      { category: "South", value: 34 },
      { category: "Mountain", value: 37 },
      { category: "Pacific", value: 52 }
    ]
  },
  {
    id: "g-spotify-mood",
    title: "Listening mood profile",
    desc: "Audio-feature averages across my 2025 most-played. I listen to almost no sad music, apparently.",
    vizId: "radar",
    author: "ori.s",
    likes: 156, remixes: 9, views: 1430,
    tags: ["personal", "music"],
    data: [
      { axis: "Energy", you: 78, benchmark: 62 },
      { axis: "Danceability", you: 68, benchmark: 58 },
      { axis: "Valence", you: 72, benchmark: 50 },
      { axis: "Acoustic", you: 34, benchmark: 48 },
      { axis: "Speechiness", you: 18, benchmark: 22 },
      { axis: "Tempo", you: 66, benchmark: 60 }
    ]
  },
  {
    id: "g-marathon-splits",
    title: "Marathon training splits",
    desc: "18 weeks of Sunday long runs. Pace in seconds per km — lower is faster.",
    vizId: "line",
    author: "dani.o",
    likes: 74, remixes: 6, views: 612,
    tags: ["fitness", "personal"],
    data: Array.from({length: 18}, (_, i) => ({
      date: "W"+(i+1),
      value: 340 - i*2.2 + (i%3===0 ? 6 : -3)
    }))
  },
  {
    id: "g-food-budget",
    title: "Where my grocery money goes",
    desc: "One month of grocery spending categorized by aisle. Produce won, which is a first.",
    vizId: "donut",
    author: "sam.l",
    likes: 112, remixes: 8, views: 840,
    tags: ["personal", "finance"],
    data: [
      { segment: "Produce", share: 32 },
      { segment: "Proteins", share: 24 },
      { segment: "Pantry", share: 18 },
      { segment: "Dairy", share: 12 },
      { segment: "Snacks", share: 8 },
      { segment: "Other", share: 6 }
    ]
  },
  {
    id: "g-happiness-income",
    title: "Happiness vs income, 120 countries",
    desc: "WHR 2025 life-satisfaction score plotted against log GDP per capita. Bubble size is population.",
    vizId: "scatter",
    author: "eli.m",
    likes: 402, remixes: 58, views: 6130,
    tags: ["economics", "global"],
    data: Array.from({length: 24}, (_, i) => ({
      x: 8 + i*1.6 + Math.random()*2,
      y: 4 + i*0.22 + Math.random()*1.8,
      size: 5 + Math.random()*25
    }))
  },
  {
    id: "g-product-launch",
    title: "Q2 launch plan",
    desc: "Cross-functional timeline for the v3 release. Numbers are week-of-quarter.",
    vizId: "timeline",
    author: "noa.b",
    likes: 89, remixes: 14, views: 1120,
    tags: ["product", "planning"],
    data: [
      { task: "Design spike", start: 1, end: 3 },
      { task: "API contracts", start: 2, end: 5 },
      { task: "Frontend build", start: 4, end: 10 },
      { task: "Backend build", start: 4, end: 9 },
      { task: "Beta cohort", start: 9, end: 11 },
      { task: "Marketing prep", start: 8, end: 12 },
      { task: "GA launch", start: 12, end: 13 }
    ]
  }
];

window.CSVUtil = CSVUtil;
window.downloadBlob = downloadBlob;
window.downloadText = downloadText;
window.exportSVG = exportSVG;
window.exportPNG = exportPNG;
window.exportPDF = exportPDF;
window.seededGraphs = seededGraphs;

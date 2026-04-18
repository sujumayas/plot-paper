/* global React, VizCatalog, VizHelpers, CSVUtil, downloadText, exportSVG, exportPNG, exportPDF, seededGraphs */

const { useState: useStateC, useEffect: useEffectC, useRef: useRefC, useMemo: useMemoC } = React;

/* ---------------- Icons ---------------- */
const Icons = {
  download: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M12 4v12m0 0l-5-5m5 5l5-5M4 20h16" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  upload:   <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M12 20V8m0 0l-5 5m5-5l5 5M4 4h16" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  plus:     <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M12 5v14M5 12h14" strokeLinecap="round"/></svg>,
  sparkle:  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M12 3l1.8 5.4L19 10l-5.2 1.6L12 17l-1.8-5.4L5 10l5.2-1.6L12 3zM18 16l.8 2.2L21 19l-2.2.8L18 22l-.8-2.2L15 19l2.2-.8L18 16z" strokeLinejoin="round"/></svg>,
  eye:      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" strokeLinecap="round" strokeLinejoin="round"/><circle cx="12" cy="12" r="3"/></svg>,
  heart:    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z" strokeLinejoin="round"/></svg>,
  fork:     <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><circle cx="6" cy="5" r="2"/><circle cx="18" cy="5" r="2"/><circle cx="12" cy="19" r="2"/><path d="M6 7v3a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V7M12 12v5"/></svg>,
  share:    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><circle cx="18" cy="5" r="2"/><circle cx="6" cy="12" r="2"/><circle cx="18" cy="19" r="2"/><path d="M8 11l8-5M8 13l8 5"/></svg>,
  close:    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M6 6l12 12M18 6L6 18" strokeLinecap="round"/></svg>,
  image:    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="9" cy="9" r="2"/><path d="M21 15l-5-5L5 21"/></svg>,
  search:   <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/></svg>,
  arrow:    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M5 12h14m0 0l-6-6m6 6l-6 6" strokeLinecap="round"/></svg>,
  check:    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M5 13l5 5L20 7" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  file:     <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9l-6-6z"/><path d="M14 3v6h6"/></svg>,
  json:     <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M8 4c-2 0-2 2-2 4s0 4-2 4c2 0 2 2 2 4s0 4 2 4M16 4c2 0 2 2 2 4s0 4 2 4c-2 0-2 2-2 4s0 4-2 4" strokeLinecap="round"/></svg>,
  trash:    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13" strokeLinecap="round" strokeLinejoin="round"/></svg>
};

/* ============================================================
   ChartView — renders a viz with title + footer
   ============================================================ */
function ChartView({ viz, data, title, subtitle, opts, showChrome = true, svgRef }) {
  const W = 820, H = 460;
  const columns = viz.columns.map(c => c.name);
  const content = viz.render(data, columns, { width: W, height: H, accent: opts.accent, grid: opts.grid, labels: opts.labels });
  return (
    <div className="chart-wrap" style={{ background: opts.chartBg || "var(--paper)" }}>
      {showChrome && <h2 className="chart-title">{title}</h2>}
      {showChrome && <div className="chart-subtitle">{subtitle || viz.name}</div>}
      <div className="chart-svg-holder">
        <svg ref={svgRef} viewBox={`0 0 ${W} ${H}`} xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid meet">
          {content}
        </svg>
      </div>
      {showChrome && (
        <div className="chart-footer">
          <span>Source · Plotpaper</span>
          <span>n = {data.length} · {viz.name}</span>
        </div>
      )}
    </div>
  );
}

/* ============================================================
   Compact preview for cards + detail
   ============================================================ */
function ChartPreview({ viz, data, accent = "oklch(64% 0.16 48)", grid = true }) {
  const W = 400, H = 220;
  const columns = viz.columns.map(c => c.name);
  const content = viz.render(data, columns, { width: W, height: H, accent, grid, labels: false });
  return (
    <svg viewBox={`0 0 ${W} ${H}`} xmlns="http://www.w3.org/2000/svg" style={{width:"100%", height:"100%"}}>
      {content}
    </svg>
  );
}

/* ============================================================
   Editable data table
   ============================================================ */
function DataTable({ viz, data, onChange }) {
  const headers = viz.columns.map(c => c.name);
  const addRow = () => {
    const blank = {};
    viz.columns.forEach(c => { blank[c.name] = c.type === "number" ? 0 : ""; });
    onChange([...data, blank]);
  };
  const edit = (i, key, val) => {
    const next = data.map((r, idx) => idx === i ? { ...r, [key]: val } : r);
    onChange(next);
  };
  const remove = (i) => onChange(data.filter((_, idx) => idx !== i));
  return (
    <div>
      <div className="data-table-wrap">
        <table className="data-table">
          <thead>
            <tr>{headers.map(h => <th key={h}>{h}</th>)}<th style={{width:"28px"}}></th></tr>
          </thead>
          <tbody>
            {data.map((row, i) => (
              <tr key={i}>
                {viz.columns.map(col => (
                  <td key={col.name} className={col.type === "number" ? "num" : ""}>
                    <input
                      value={row[col.name] ?? ""}
                      onChange={e => {
                        const v = col.type === "number" ? (e.target.value === "" ? "" : (isNaN(+e.target.value) ? e.target.value : +e.target.value)) : e.target.value;
                        edit(i, col.name, v);
                      }}
                    />
                  </td>
                ))}
                <td style={{padding:"0 4px"}}>
                  <button className="btn ghost sm icon" style={{padding:"2px"}} onClick={() => remove(i)} title="Remove row">
                    {Icons.trash}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <button className="btn sm block" style={{marginTop:8}} onClick={addRow}>
        {Icons.plus} Add row
      </button>
    </div>
  );
}

/* ============================================================
   CSV upload panel
   ============================================================ */
function CSVPanel({ viz, data, onData, toast }) {
  const [drag, setDrag] = useStateC(false);
  const inputRef = useRefC(null);

  const handleFile = (file) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const { headers, data } = CSVUtil.parse(e.target.result);
      // coerce numbers for known numeric cols
      const coerced = data.map(row => {
        const o = { ...row };
        viz.columns.forEach(c => {
          if (c.type === "number" && o[c.name] !== undefined) {
            const n = parseFloat(String(o[c.name]).replace(/[,\s$€£]/g, ""));
            if (!isNaN(n)) o[c.name] = n;
          }
        });
        return o;
      });
      onData(coerced);
      toast(`Loaded ${coerced.length} rows from ${file.name}`);
    };
    reader.readAsText(file);
  };

  const downloadTemplate = () => {
    const csv = CSVUtil.templateFor(viz);
    downloadText(csv, `${viz.id}-template.csv`, "text/csv");
    toast(`Template downloaded: ${viz.id}-template.csv`);
  };

  return (
    <>
      <div className="tmpl-row" style={{marginBottom:12}}>
        <button className="btn sm" onClick={downloadTemplate}>
          {Icons.download} Template.csv
        </button>
        <button className="btn sm" onClick={() => onData(viz.sample)}>
          {Icons.sparkle} Use sample
        </button>
      </div>
      <div
        className={`upload-zone ${drag ? "drag" : ""}`}
        onDragOver={e => { e.preventDefault(); setDrag(true); }}
        onDragLeave={() => setDrag(false)}
        onDrop={e => {
          e.preventDefault(); setDrag(false);
          const f = e.dataTransfer.files[0];
          if (f) handleFile(f);
        }}
        onClick={() => inputRef.current?.click()}
        style={{cursor:"pointer"}}
      >
        <input ref={inputRef} type="file" accept=".csv,text/csv" hidden
          onChange={e => e.target.files[0] && handleFile(e.target.files[0])}/>
        <div className="drop-title">Drop CSV here</div>
        <div className="drop-sub">or click to browse</div>
      </div>
      <div className="csv-status">
        <span>Rows</span><strong>{data.length}</strong>
      </div>
    </>
  );
}

/* ============================================================
   Explore page
   ============================================================ */
function ExplorePage({ graphs, onOpen, onGoBuild, tweaks }) {
  const [filter, setFilter] = useStateC("all");
  const [sort, setSort] = useStateC("trending");
  const [query, setQuery] = useStateC("");

  const filtered = useMemoC(() => {
    let g = graphs;
    if (filter !== "all") g = g.filter(x => x.vizId === filter);
    if (query) {
      const q = query.toLowerCase();
      g = g.filter(x =>
        x.title.toLowerCase().includes(q) ||
        x.author.toLowerCase().includes(q) ||
        (x.tags || []).some(t => t.includes(q)));
    }
    if (sort === "trending") g = [...g].sort((a,b) => (b.likes + b.remixes*5) - (a.likes + a.remixes*5));
    if (sort === "new") g = [...g].sort((a,b) => (b.createdAt||0) - (a.createdAt||0));
    if (sort === "liked") g = [...g].sort((a,b) => b.likes - a.likes);
    return g;
  }, [graphs, filter, query, sort]);

  const types = ["all", ...new Set(graphs.map(g => g.vizId))];

  return (
    <>
      <div className="page-head">
        <div>
          <div className="eyebrow">Vol. 01 · Spring 2026</div>
          <h1>A field guide to <em>reading</em><br/>the shape of things.</h1>
          <p>Plotpaper is a visualization playground. Browse graphs other people published, fork their data, or start from a CSV template of your own.</p>
        </div>
        <div style={{display:"flex", flexDirection:"column", alignItems:"flex-end", gap:10}}>
          <div className="mono small">{graphs.length} public graphs · {graphs.reduce((a,g)=>a+g.views,0).toLocaleString()} views</div>
          <button className="btn primary" onClick={onGoBuild}>
            {Icons.plus} Build a new graph
          </button>
        </div>
      </div>

      <div className="explore-filter">
        {types.map(t => (
          <button key={t} className={`chip ${filter === t ? "on" : ""}`} onClick={() => setFilter(t)}>
            {t === "all" ? "All types" : (VizCatalog.find(v => v.id === t)?.name || t)}
          </button>
        ))}
        <div style={{flex:1}}/>
        <div style={{display:"flex", alignItems:"center", gap:6, border:"1px solid var(--rule-soft)", borderRadius:999, padding:"4px 10px", background:"var(--paper-2)"}}>
          <span style={{color:"var(--ink-3)", display:"flex"}}>{Icons.search}</span>
          <input value={query} onChange={e=>setQuery(e.target.value)} placeholder="search..." 
            style={{border:0, background:"transparent", outline:0, fontSize:12, width:140, color:"var(--ink)", fontFamily:"var(--mono)"}}/>
        </div>
      </div>

      <div className="sort-bar">
        <span>{filtered.length} / {graphs.length} results</span>
        <div style={{display:"flex", gap:14}}>
          {["trending","new","liked"].map(s => (
            <button key={s} onClick={()=>setSort(s)}
              style={{background:"transparent", border:0, padding:0, fontFamily:"inherit", fontSize:"inherit", letterSpacing:"inherit", textTransform:"inherit",
                color: sort === s ? "var(--ink)" : "var(--ink-3)",
                textDecoration: sort === s ? "underline" : "none",
                textUnderlineOffset: 4, cursor:"pointer"}}>
              {s}
            </button>
          ))}
        </div>
      </div>

      <div className="grid">
        {filtered.map(g => {
          const viz = VizCatalog.find(v => v.id === g.vizId);
          if (!viz) return null;
          return (
            <div key={g.id} className="card" onClick={() => onOpen(g)}>
              <div className="card-head">
                <h3 className="card-title">{g.title}</h3>
                <span className="card-type">{viz.name}</span>
              </div>
              <div className="card-preview">
                <ChartPreview viz={viz} data={g.data} accent={tweaks?.accent} grid={tweaks?.grid ?? true}/>
              </div>
              <div className="card-foot">
                <div className="card-author">
                  <div className="avatar">{g.author.slice(0,2).toUpperCase()}</div>
                  <span>{g.author}</span>
                </div>
                <div style={{display:"flex", gap:12}}>
                  <span className="stat">{Icons.heart} {g.likes}</span>
                  <span className="stat">{Icons.fork} {g.remixes}</span>
                  <span className="stat">{Icons.eye} {g.views}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}

window.ChartView = ChartView;
window.ChartPreview = ChartPreview;
window.DataTable = DataTable;
window.CSVPanel = CSVPanel;
window.ExplorePage = ExplorePage;
window.IconSet = Icons;

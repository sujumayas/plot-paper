/* global React, ReactDOM, VizCatalog, VizHelpers, CSVUtil, downloadText, exportSVG, exportPNG, exportPDF, seededGraphs,
         ChartView, ChartPreview, DataTable, CSVPanel, ExplorePage, IconSet */

const { useState, useEffect, useRef, useMemo } = React;
const I = IconSet;

/* ============================================================
   Toast hook
   ============================================================ */
function useToasts() {
  const [toasts, setToasts] = useState([]);
  const push = (text) => {
    const id = Math.random().toString(36).slice(2);
    setToasts(t => [...t, { id, text }]);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 2600);
  };
  const node = (
    <div className="toast-wrap">
      {toasts.map(t => <div key={t.id} className="toast"><span className="dot"/>{t.text}</div>)}
    </div>
  );
  return [push, node];
}

/* ============================================================
   Builder page
   ============================================================ */
function BuilderPage({ initialGraph, onPublish, onBack, onOpenAI, toast, customVizzes, tweaks }) {
  const [vizId, setVizId] = useState(initialGraph?.vizId || "bar");
  const [title, setTitle] = useState(initialGraph?.title || "Untitled graph");
  const [data, setData] = useState(initialGraph?.data || VizCatalog[0].sample);
  const [dataModalOpen, setDataModalOpen] = useState(false);

  const allVizzes = [...VizCatalog, ...customVizzes];
  const viz = allVizzes.find(v => v.id === vizId) || allVizzes[0];
  const svgRef = useRef(null);

  useEffect(() => {
    // if switching viz type, try to preserve compatible columns; else load sample
    if (!data || data.length === 0) { setData(viz.sample); return; }
    const cols = viz.columns.map(c => c.name);
    const firstRow = data[0] || {};
    const compatible = cols.every(c => c in firstRow);
    if (!compatible) setData(viz.sample);
    // eslint-disable-next-line
  }, [vizId]);

  const exportJSON = () => {
    const payload = { title, vizId, data, columns: viz.columns, exportedAt: new Date().toISOString() };
    downloadText(JSON.stringify(payload, null, 2), `${title.replace(/\s+/g,"-").toLowerCase()}.json`, "application/json");
    toast("Exported JSON");
  };

  const importJSON = () => {
    const inp = document.createElement("input");
    inp.type = "file"; inp.accept = "application/json,.json";
    inp.onchange = (e) => {
      const f = e.target.files[0];
      if (!f) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        try {
          const obj = JSON.parse(ev.target.result);
          if (obj.vizId) setVizId(obj.vizId);
          if (obj.title) setTitle(obj.title);
          if (Array.isArray(obj.data)) setData(obj.data);
          toast("Imported JSON");
        } catch (err) { toast("Invalid JSON file"); }
      };
      reader.readAsText(f);
    };
    inp.click();
  };

  const exportAsImage = (kind) => {
    if (!svgRef.current) return;
    const safe = title.replace(/\s+/g, "-").toLowerCase();
    if (kind === "svg") exportSVG(svgRef.current, `${safe}.svg`);
    if (kind === "png") exportPNG(svgRef.current, `${safe}.png`);
    if (kind === "pdf") exportPDF(svgRef.current, `${safe}.pdf`, title);
    toast(`Exporting ${kind.toUpperCase()}…`);
  };

  const publish = () => {
    onPublish({
      id: "g-" + Math.random().toString(36).slice(2,8),
      title, vizId, data,
      author: "you",
      likes: 0, remixes: 0, views: 1,
      tags: ["yours"],
      createdAt: Date.now()
    });
    toast("Published to Explore");
  };

  return (
    <>
      <div style={{display:"flex", alignItems:"center", justifyContent:"space-between", padding:"28px 0 14px"}}>
        <button className="btn ghost" onClick={onBack}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" style={{width:14,height:14,strokeWidth:1.6}}><path d="M19 12H5m0 0l6-6m-6 6l6 6" strokeLinecap="round"/></svg>
          Back to Explore
        </button>
        <div className="eyebrow" style={{margin:0}}>Composer</div>
        <div style={{display:"flex", gap:8}}>
          <button className="btn primary" onClick={publish}>{I.share} Publish</button>
        </div>
      </div>

      <div className="builder">
        <aside className="builder-side">
          <div className="side-section">
            <div className="side-title"><span>Visualization type</span><span className="num">1</span></div>
            <div className="viz-list">
              {window.VizCategories.map(cat => {
                const vizzesInCat = allVizzes.filter(v => v.category === cat);
                if (vizzesInCat.length === 0) return null;
                return (
                  <React.Fragment key={cat}>
                    <div style={{
                      fontFamily:"var(--mono)", fontSize:9, letterSpacing:"0.18em",
                      textTransform:"uppercase", color:"var(--ink-4)",
                      padding:"8px 12px 4px"
                    }}>{cat}</div>
                    {vizzesInCat.map(v => (
                      <button key={v.id} className={`viz-option ${v.id === vizId ? "on" : ""}`}
                        onClick={() => setVizId(v.id)}>
                        <span className="glyph" style={{color: v.id === vizId ? "var(--accent)" : "var(--ink-2)"}}>
                          <svg viewBox="0 0 22 22">{v.glyph}</svg>
                        </span>
                        <span>
                          <div className="name">{v.name}</div>
                          <div className="desc">{v.desc}</div>
                        </span>
                        <span className="arrow">{v.id === vizId ? "●" : "○"}</span>
                      </button>
                    ))}
                  </React.Fragment>
                );
              })}
              {allVizzes.filter(v => !v.category).map(v => (
                <button key={v.id} className={`viz-option ${v.id === vizId ? "on" : ""}`}
                  onClick={() => setVizId(v.id)}>
                  <span className="glyph" style={{color: v.id === vizId ? "var(--accent)" : "var(--ink-2)"}}>
                    <svg viewBox="0 0 22 22">{v.glyph}</svg>
                  </span>
                  <span>
                    <div className="name">{v.name}</div>
                    <div className="desc">{v.desc}</div>
                  </span>
                  <span className="arrow">{v.id === vizId ? "●" : "○"}</span>
                </button>
              ))}
              <button className="viz-option" onClick={onOpenAI} style={{marginTop:8, borderTop:"1px solid var(--rule-soft)", borderRadius:0, paddingTop:14}}>
                <span className="glyph" style={{color:"var(--accent)"}}>
                  <svg viewBox="0 0 22 22">{I.sparkle}</svg>
                </span>
                <span>
                  <div className="name" style={{color:"var(--accent)"}}>Generate with AI</div>
                  <div className="desc">Describe or upload a reference</div>
                </span>
                <span className="arrow">＋</span>
              </button>
            </div>
          </div>

          <div className="side-section">
            <div className="side-title"><span>Data &amp; export</span><span className="num">2</span></div>
            <button className="btn block primary" onClick={() => setDataModalOpen(true)}>
              {I.file} Data &amp; export…
            </button>
            <div className="csv-status" style={{marginTop:10}}>
              <span>Rows loaded</span><strong>{data.length}</strong>
            </div>
          </div>
        </aside>

        <main className="builder-main">
          <div className="canvas-head">
            <div className="canvas-title">
              <input className="canvas-title-input" value={title} onChange={e => setTitle(e.target.value)}/>
            </div>
            <div className="canvas-actions">
              <button className="btn sm" onClick={() => setDataModalOpen(true)}>{I.file} Data &amp; export</button>
            </div>
          </div>
          <div className="canvas-body">
            {data.length === 0 ? (
              <div className="canvas-empty">
                <div className="box">
                  <div className="ascii-box">{`┌─────────────────┐
│                 │
│   NO DATA YET   │
│                 │
└─────────────────┘`}</div>
                  <h3>Bring data to this graph.</h3>
                  <p>Open <strong>Data &amp; export</strong> to download the CSV template, drop your filled file back in, or load a sample.</p>
                  <button className="btn primary" onClick={() => setDataModalOpen(true)}>{I.file} Open Data &amp; export</button>
                </div>
              </div>
            ) : (
              <ChartView
                viz={viz}
                data={data}
                title={title}
                subtitle={`${data.length} rows · ${viz.columns.map(c=>c.name).join(" × ")}`}
                opts={{ accent: tweaks.accent, grid: tweaks.grid, labels: tweaks.labels }}
                svgRef={svgRef}
              />
            )}
          </div>
        </main>
      </div>

      {dataModalOpen && (
        <div className="modal-backdrop" onClick={() => setDataModalOpen(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{maxWidth:560}}>
            <div className="modal-head">
              <div>
                <span className="pill">Data &amp; export</span>
                <h2 style={{marginTop:10}}>Bring data in, send graph out.</h2>
                <p>Download a CSV template matching this viz type, drop your filled CSV back in, or export the finished graph in any format.</p>
              </div>
              <button className="close-x" onClick={() => setDataModalOpen(false)}>{I.close}</button>
            </div>
            <div className="modal-body">
              <div className="field">
                <label>1 · Get the template</label>
                <div className="tmpl-row">
                  <button className="btn" onClick={() => {
                    const csv = CSVUtil.templateFor(viz);
                    downloadText(csv, `${viz.id}-template.csv`, "text/csv");
                    toast(`Template downloaded: ${viz.id}-template.csv`);
                  }}>{I.download} Template.csv</button>
                  <button className="btn" onClick={() => { setData(viz.sample); toast("Sample data loaded"); }}>
                    {I.sparkle} Use AI sample
                  </button>
                </div>
              </div>

              <div className="field" style={{marginTop:18}}>
                <label>2 · Upload filled CSV</label>
                <CSVPanel viz={viz} data={data} onData={(d) => { setData(d); }} toast={toast}/>
              </div>

              <div className="field" style={{marginTop:18}}>
                <label>3 · Export graph</label>
                <div style={{display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:8}}>
                  <button className="btn" onClick={() => exportAsImage("png")}>{I.download} PNG</button>
                  <button className="btn" onClick={() => exportAsImage("svg")}>{I.download} SVG</button>
                  <button className="btn" onClick={() => exportAsImage("pdf")}>{I.download} PDF</button>
                </div>
              </div>

              <div className="field" style={{marginTop:18}}>
                <label>4 · Data portability (JSON)</label>
                <div style={{display:"grid", gridTemplateColumns:"1fr 1fr", gap:8}}>
                  <button className="btn" onClick={importJSON}>{I.upload} Import JSON</button>
                  <button className="btn" onClick={exportJSON}>{I.json} Export JSON</button>
                </div>
              </div>
            </div>
            <div className="modal-foot">
              <div className="small mono">Schema: {viz.columns.map(c => c.name + ":" + c.type).join(" · ")}</div>
              <button className="btn" onClick={() => setDataModalOpen(false)}>Done</button>
            </div>
          </div>
        </div>
      )}

      <div style={{display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:20, marginTop:32}}>
        <div style={{padding:"20px 0", borderTop:"1px solid var(--rule)"}}>
          <div className="eyebrow" style={{margin:"0 0 8px"}}>Step 01</div>
          <div style={{fontFamily:"var(--serif)", fontSize:22, letterSpacing:"-0.01em", lineHeight:1.15, marginBottom:6}}>Pick a shape.</div>
          <div className="small">Each viz type defines what columns the CSV expects.</div>
        </div>
        <div style={{padding:"20px 0", borderTop:"1px solid var(--rule)"}}>
          <div className="eyebrow" style={{margin:"0 0 8px"}}>Step 02</div>
          <div style={{fontFamily:"var(--serif)", fontSize:22, letterSpacing:"-0.01em", lineHeight:1.15, marginBottom:6}}>Bring the data.</div>
          <div className="small">Download the template, fill it offline, drop it back in.</div>
        </div>
        <div style={{padding:"20px 0", borderTop:"1px solid var(--rule)"}}>
          <div className="eyebrow" style={{margin:"0 0 8px"}}>Step 03</div>
          <div style={{fontFamily:"var(--serif)", fontSize:22, letterSpacing:"-0.01em", lineHeight:1.15, marginBottom:6}}>Ship or share.</div>
          <div className="small">Export PNG, SVG, PDF, JSON — or publish it to Explore.</div>
        </div>
      </div>
    </>
  );
}

/* ============================================================
   AI Generate modal
   ============================================================ */
function AIModal({ open, onClose, onGenerate, toast }) {
  const [prompt, setPrompt] = useState("");
  const [refImg, setRefImg] = useState(null);
  const [phase, setPhase] = useState("idle"); // idle | thinking | done
  const [log, setLog] = useState("");

  if (!open) return null;

  const suggestions = [
    "Bubble matrix with nested categories",
    "Step chart with milestone markers",
    "Slope graph for before/after",
    "Beeswarm plot of single-variable distribution",
    "Marimekko / mosaic chart"
  ];

  const handleRef = (f) => {
    const r = new FileReader();
    r.onload = e => setRefImg(e.target.result);
    r.readAsDataURL(f);
  };

  const generate = async () => {
    if (!prompt.trim() && !refImg) { toast("Write a prompt or attach a reference"); return; }
    setPhase("thinking");
    const steps = [
      "Parsing intent…",
      "Inspecting reference image…",
      "Choosing encoding channels…",
      "Drafting column schema…",
      "Sketching SVG primitives…",
      "Finalizing renderer…"
    ];
    for (let i = 0; i < steps.length; i++) {
      setLog(steps[i]);
      await new Promise(r => setTimeout(r, 520));
    }
    // Generate a new viz definition — this is a mock (no real AI call).
    // Picks a base from catalog most-similar by keyword and tweaks name.
    const lower = prompt.toLowerCase();
    let base = VizCatalog[0];
    if (/pie|donut|share|slice/.test(lower)) base = VizCatalog.find(v => v.id === "donut");
    else if (/line|trend|over time|growth/.test(lower)) base = VizCatalog.find(v => v.id === "line");
    else if (/scatter|bubble|correlat/.test(lower)) base = VizCatalog.find(v => v.id === "scatter");
    else if (/heat|matrix|grid/.test(lower)) base = VizCatalog.find(v => v.id === "heatmap");
    else if (/radar|spider|profile/.test(lower)) base = VizCatalog.find(v => v.id === "radar");
    else if (/timeline|gantt|schedule/.test(lower)) base = VizCatalog.find(v => v.id === "timeline");
    else if (/rank|sorted|league/.test(lower)) base = VizCatalog.find(v => v.id === "hbar");
    else base = VizCatalog.find(v => v.id === "bar");

    const newViz = {
      ...base,
      id: "custom-" + Math.random().toString(36).slice(2, 7),
      name: prompt.slice(0, 30) || "Custom viz",
      desc: "Generated " + new Date().toLocaleDateString(),
      isCustom: true,
      sourcePrompt: prompt,
      sourceRef: refImg
    };
    setPhase("idle");
    setPrompt(""); setRefImg(null); setLog("");
    onGenerate(newViz);
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-head">
          <div>
            <span className="pill accent">AI · Beta</span>
            <h2 style={{marginTop:10}}>Generate a new visualization type.</h2>
            <p>Describe the shape of chart you want, or drop a screenshot. We'll synthesize a renderer and add it to your catalog.</p>
          </div>
          <button className="close-x" onClick={onClose}>{I.close}</button>
        </div>
        <div className="modal-body">
          {phase === "thinking" ? (
            <div className="thinking">
              <div style={{fontFamily:"var(--serif)", fontSize:24, letterSpacing:"-0.01em"}}>Synthesizing renderer…</div>
              <div className="thinking-bar"><span/></div>
              <div className="think-log">{log}</div>
            </div>
          ) : (
            <div className="ai-form">
              <div className="field">
                <label>Prompt</label>
                <textarea placeholder="A chart that compares two quantities for each category, where one is plotted as a bar and the other as a small line on top of it…"
                  value={prompt} onChange={e => setPrompt(e.target.value)}/>
              </div>

              <div className="ai-suggestions">
                {suggestions.map(s => (
                  <button key={s} onClick={() => setPrompt(s)}>{s}</button>
                ))}
              </div>

              <div className="field">
                <label>Reference image (optional)</label>
                <label htmlFor="ref-inp" className={`ref-dropzone ${refImg ? "has-file" : ""}`}>
                  {refImg ? (
                    <>
                      <img src={refImg} alt="reference"/>
                      <button className="rm" onClick={(e) => { e.preventDefault(); setRefImg(null); }}>Remove</button>
                    </>
                  ) : (
                    <>{I.image}<div style={{marginTop:6}}>Drop a screenshot or click to browse</div></>
                  )}
                </label>
                <input id="ref-inp" type="file" accept="image/*" hidden
                  onChange={e => e.target.files[0] && handleRef(e.target.files[0])}/>
              </div>
            </div>
          )}
        </div>
        <div className="modal-foot">
          <div className="small mono">Generated vizzes are mock-wired to an existing renderer family in this prototype.</div>
          <div style={{display:"flex", gap:8}}>
            <button className="btn" onClick={onClose}>Cancel</button>
            <button className="btn accent" onClick={generate} disabled={phase==="thinking"}>
              {I.sparkle} Generate
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   Graph detail modal (from explore card)
   ============================================================ */
function DetailModal({ graph, tweaks, onClose, onFork, onSaveType, onUseData, toast }) {
  if (!graph) return null;
  const viz = VizCatalog.find(v => v.id === graph.vizId);
  const svgRef = useRef(null);
  const [liked, setLiked] = useState(false);

  const exportJSON = () => {
    const payload = { title: graph.title, vizId: graph.vizId, data: graph.data };
    downloadText(JSON.stringify(payload, null, 2), `${graph.title.replace(/\s+/g,"-").toLowerCase()}.json`, "application/json");
    toast("Exported JSON");
  };
  const download = (kind) => {
    if (!svgRef.current) return;
    const name = graph.title.replace(/\s+/g, "-").toLowerCase();
    if (kind === "svg") exportSVG(svgRef.current, `${name}.svg`);
    if (kind === "png") exportPNG(svgRef.current, `${name}.png`);
    if (kind === "pdf") exportPDF(svgRef.current, `${name}.pdf`, graph.title);
    toast(`Exporting ${kind.toUpperCase()}…`);
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" style={{maxWidth:1040}} onClick={e => e.stopPropagation()}>
        <div className="detail">
          <div className="detail-chart">
            <ChartView
              viz={viz}
              data={graph.data}
              title={graph.title}
              subtitle={`by ${graph.author} · ${graph.data.length} rows`}
              opts={{ accent: tweaks?.accent || "oklch(64% 0.16 48)", grid: tweaks?.grid ?? true, labels: tweaks?.labels ?? false }}
              svgRef={svgRef}
            />
          </div>
          <div className="detail-meta">
            <div style={{display:"flex", justifyContent:"space-between", alignItems:"start"}}>
              <div>
                <span className="card-type">{viz.name}</span>
              </div>
              <button className="close-x" onClick={onClose}>{I.close}</button>
            </div>
            <h2 style={{marginTop:14}}>{graph.title}</h2>
            <div className="by">
              <div className="avatar">{graph.author.slice(0,2).toUpperCase()}</div>
              <span>{graph.author}</span>
              <span style={{color:"var(--ink-4)"}}>·</span>
              <span>{graph.tags?.join(" · ")}</span>
            </div>
            <p>{graph.desc}</p>

            <div className="meta-stats">
              <div className="meta-stat"><div className="k">Views</div><div className="v">{graph.views.toLocaleString()}</div></div>
              <div className="meta-stat"><div className="k">Likes</div><div className="v">{(graph.likes + (liked?1:0)).toLocaleString()}</div></div>
              <div className="meta-stat"><div className="k">Remixes</div><div className="v">{graph.remixes.toLocaleString()}</div></div>
            </div>

            <div className="action-stack">
              <button className="btn primary block" onClick={() => onFork(graph)}>
                {I.fork} Fork this graph (edit data + type)
              </button>
              <div style={{display:"grid", gridTemplateColumns:"1fr 1fr", gap:8}}>
                <button className="btn" onClick={() => onUseData(graph)}>
                  {I.arrow} Use data in new graph
                </button>
                <button className="btn" onClick={() => onSaveType(viz)}>
                  {I.plus} Save this type
                </button>
              </div>
              <div style={{display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:6}}>
                <button className="btn sm" onClick={() => download("png")}>PNG</button>
                <button className="btn sm" onClick={() => download("svg")}>SVG</button>
                <button className="btn sm" onClick={() => download("pdf")}>PDF</button>
                <button className="btn sm" onClick={exportJSON}>JSON</button>
              </div>
              <button className="btn ghost block" onClick={() => { setLiked(!liked); toast(liked ? "Unliked" : "Liked"); }}>
                {I.heart} {liked ? "Liked" : "Like this graph"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   Tweaks panel
   ============================================================ */
function TweaksPanel({ open, tweaks, setTweaks }) {
  if (!open) return null;
  const accents = [
    { c: "oklch(64% 0.16 48)", n: "Warm"  },
    { c: "oklch(64% 0.16 240)", n: "Cool" },
    { c: "oklch(64% 0.16 150)", n: "Fern" },
    { c: "oklch(64% 0.16 340)", n: "Plum" },
    { c: "oklch(24% 0.02 80)",  n: "Ink"  }
  ];
  return (
    <div className="tweaks">
      <div className="tweaks-head">
        <span>Tweaks</span>
        <span style={{color:"var(--ink-4)"}}>design</span>
      </div>
      <div className="tweaks-body">
        <div className="tweak-row">
          <label>Accent color</label>
          <div className="swatches">
            {accents.map(a => (
              <button key={a.c} style={{background:a.c}} className={tweaks.accent === a.c ? "on" : ""}
                title={a.n} onClick={() => setTweaks({...tweaks, accent: a.c})}/>
            ))}
          </div>
        </div>
        <div className="tweak-row">
          <label>Gridlines</label>
          <div className="seg">
            {["on","off"].map(v => (
              <button key={v} className={(tweaks.grid ? "on" : "off") === v ? "on" : ""}
                onClick={() => setTweaks({...tweaks, grid: v === "on"})}>{v}</button>
            ))}
          </div>
        </div>
        <div className="tweak-row">
          <label>Value labels</label>
          <div className="seg">
            {["on","off"].map(v => (
              <button key={v} className={(tweaks.labels ? "on" : "off") === v ? "on" : ""}
                onClick={() => setTweaks({...tweaks, labels: v === "on"})}>{v}</button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   APP ROOT
   ============================================================ */
function App() {
  const [toast, toastNode] = useToasts();
  const [view, setView] = useState(() => localStorage.getItem("pp-view") || "explore"); // explore | build
  const [graphs, setGraphs] = useState(() => {
    try {
      const saved = localStorage.getItem("pp-graphs");
      if (saved) return JSON.parse(saved);
    } catch(e) {}
    return seededGraphs;
  });
  const [customVizzes, setCustomVizzes] = useState([]);
  const [detail, setDetail] = useState(null);
  const [aiOpen, setAIOpen] = useState(false);
  const [builderSeed, setBuilderSeed] = useState(null);
  const [editOpen, setEditOpen] = useState(false);

  const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
    "accent": "oklch(64% 0.16 48)",
    "grid": true,
    "labels": false
  }/*EDITMODE-END*/;
  const [tweaks, setTweaks] = useState(TWEAK_DEFAULTS);

  useEffect(() => { localStorage.setItem("pp-view", view); }, [view]);
  useEffect(() => {
    try { localStorage.setItem("pp-graphs", JSON.stringify(graphs)); } catch(e) {}
  }, [graphs]);

  // Edit-mode protocol
  useEffect(() => {
    const handler = (ev) => {
      if (ev.data?.type === "__activate_edit_mode") setEditOpen(true);
      if (ev.data?.type === "__deactivate_edit_mode") setEditOpen(false);
    };
    window.addEventListener("message", handler);
    window.parent?.postMessage({ type: "__edit_mode_available" }, "*");
    return () => window.removeEventListener("message", handler);
  }, []);
  useEffect(() => {
    window.parent?.postMessage({ type: "__edit_mode_set_keys", edits: tweaks }, "*");
  }, [tweaks]);

  const handleFork = (graph) => {
    setBuilderSeed({ ...graph, title: graph.title + " (fork)" });
    setDetail(null);
    setView("build");
    toast("Forked — edit away");
  };
  const handleUseData = (graph) => {
    setBuilderSeed({ title: graph.title + " (new lens)", vizId: graph.vizId, data: graph.data });
    setDetail(null); setView("build");
    toast("Data imported — pick a new viz type");
  };
  const handleSaveType = (viz) => {
    toast(`"${viz.name}" added to your types`);
  };
  const handleAIGenerate = (newViz) => {
    setCustomVizzes(prev => [...prev, newViz]);
    setBuilderSeed({ title: newViz.name, vizId: newViz.id, data: newViz.sample });
    setAIOpen(false);
    setView("build");
    toast(`"${newViz.name}" created — try it`);
  };
  const handlePublish = (graph) => {
    setGraphs(g => [graph, ...g]);
    setView("explore");
  };

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <div className="brand-mark">Plot<em>paper</em></div>
          <div className="brand-sub">v0.4 · composer</div>
        </div>
        <nav className="nav">
          <button className={view === "explore" ? "on" : ""} onClick={() => setView("explore")}>Explore</button>
          <button className={view === "build" ? "on" : ""} onClick={() => setView("build")}>Build</button>
        </nav>
        <div className="top-actions">
          <button className="btn ghost sm" onClick={() => setAIOpen(true)}>{I.sparkle} New type…</button>
          <button className="btn sm" onClick={() => { setBuilderSeed(null); setView("build"); }}>{I.plus} New graph</button>
          <div className="avatar" title="you">YO</div>
        </div>
      </header>

      {view === "explore" && (
        <ExplorePage
          graphs={graphs}
          tweaks={tweaks}
          onOpen={(g) => { setDetail(g); setGraphs(gs => gs.map(x => x.id === g.id ? {...x, views: x.views+1} : x)); }}
          onGoBuild={() => { setBuilderSeed(null); setView("build"); }}
        />
      )}

      {view === "build" && (
        <BuilderPage
          initialGraph={builderSeed}
          onBack={() => setView("explore")}
          onPublish={handlePublish}
          onOpenAI={() => setAIOpen(true)}
          customVizzes={customVizzes}
          tweaks={tweaks}
          toast={toast}
        />
      )}

      <DetailModal
        graph={detail}
        tweaks={tweaks}
        onClose={() => setDetail(null)}
        onFork={handleFork}
        onUseData={handleUseData}
        onSaveType={handleSaveType}
        toast={toast}
      />

      <AIModal
        open={aiOpen}
        onClose={() => setAIOpen(false)}
        onGenerate={handleAIGenerate}
        toast={toast}
      />

      <TweaksPanel open={editOpen} tweaks={tweaks} setTweaks={setTweaks}/>

      {toastNode}
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App/>);

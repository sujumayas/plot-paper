"use client";

import { useCallback, useDeferredValue, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { siteConfig } from "@/config/site";
import { IconAlert, IconRedo, IconUndo } from "@/components/icons";
import { usePoster } from "@/components/chart/Poster";
import { useToast } from "@/components/ui/Toasts";
import { useHistory } from "@/hooks/useHistory";
import { useChartRegistry } from "@/lib/customTypes";
import { exampleToDoc, type RawExample } from "@/lib/examples";
import { EXAMPLE_LOADERS } from "@/lib/examples/loaders";
import { useI18n } from "@/lib/i18n";
import { decodeDoc } from "@/lib/share";
import { KEYS, readJSON, writeJSON } from "@/lib/storage";
import { barChart } from "@/lib/viz/charts/bars";
import { autoMap, inferColumns, parseJSONRows } from "@/lib/viz/data";
import { withData } from "@/lib/viz/docOps";
import { docFromSample, sanitizeDoc, switchChartType } from "@/lib/viz/engine";
import { SIZE_PRESETS } from "@/lib/viz/themes";
import type { ChartDefinition, ChartDoc, ColumnInfo, DataRow } from "@/lib/viz/types";
import { ChartPanel } from "./ChartPanel";
import { ChartPicker } from "./ChartPicker";
import { DataPanel } from "./DataPanel";
import { ExportMenu } from "./ExportMenu";
import { PublishButton } from "./PublishButton";
import { StylePanel } from "./StylePanel";

type Tab = "data" | "chart" | "style";

function defaultDoc(def: ChartDefinition, locale: "en" | "es"): ChartDoc {
  const size = SIZE_PRESETS.find((s) => s.id === siteConfig.chartDefaults.size) ?? SIZE_PRESETS[0];
  return docFromSample(
    def,
    { theme: siteConfig.chartDefaults.theme, branding: siteConfig.chartDefaults.branding, size: size.id, width: size.width, height: size.height },
    locale,
  );
}

export function Builder() {
  const { t, l, locale } = useI18n();
  const toast = useToast();
  const search = useSearchParams();
  const registry = useChartRegistry();
  const history = useHistory<ChartDoc>(defaultDoc(barChart, locale));
  const doc = history.value;
  const def = registry.get(doc.chartType) ?? barChart;
  const [tab, setTab] = useState<Tab>("data");
  const [ready, setReady] = useState(false);
  const storageWarned = useRef(false);
  const loadStarted = useRef(false);

  const update = useCallback((fn: (d: ChartDoc) => ChartDoc, coalesce?: string) => history.set(fn, { coalesce }), [history]);

  // ── Initial load: share link > example > chart type > local draft > default
  useEffect(() => {
    if (!registry.loaded || loadStarted.current) return;
    loadStarted.current = true;
    (async () => {
      const hash = window.location.hash;
      if (hash.startsWith("#d=")) {
        const shared = await decodeDoc(hash.slice(3));
        if (shared) {
          history.reset(shared);
          toast(t("builder.loadedShare"));
        } else toast(t("builder.shareInvalid"), "error");
        setReady(true);
        return;
      }
      const example = search.get("example");
      if (example && EXAMPLE_LOADERS[example]) {
        try {
          const mod = await EXAMPLE_LOADERS[example]();
          const d = exampleToDoc(mod.default as RawExample);
          history.reset(d);
          toast(t("builder.loadedExample", { title: d.title }));
          setReady(true);
          return;
        } catch {
          /* fall through */
        }
      }
      const type = search.get("type");
      const typeDef = type ? registry.get(type) : undefined;
      if (typeDef) {
        history.reset(defaultDoc(typeDef, locale));
        setReady(true);
        return;
      }
      const saved = readJSON<ChartDoc | null>(KEYS.doc, null);
      if (saved && typeof saved === "object" && Array.isArray(saved.data)) {
        history.reset(sanitizeDoc(saved));
      }
      setReady(true);
    })();
    // Runs once, after custom types are loaded (`type=custom:…` needs them).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [registry.loaded]);

  // ── Autosave
  useEffect(() => {
    if (!ready) return;
    const id = setTimeout(() => {
      const ok = writeJSON(KEYS.doc, doc);
      if (!ok && !storageWarned.current) {
        storageWarned.current = true;
        toast(t("builder.storageFull"), "error");
      }
    }, 400);
    return () => clearTimeout(id);
  }, [doc, ready, toast, t]);

  // ── Keyboard shortcuts
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement;
      if (el.closest("input, textarea, select, [contenteditable]")) return;
      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.key.toLowerCase() === "z") {
        e.preventDefault();
        if (e.shiftKey) history.redo();
        else history.undo();
      } else if (mod && e.key.toLowerCase() === "y") {
        e.preventDefault();
        history.redo();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [history]);

  const selectType = (next: ChartDefinition) => {
    if (next.id === doc.chartType) return;
    update((d) => (d.data.length ? switchChartType(d, next) : { ...defaultDoc(next, locale), style: d.style }));
  };

  const loadTable = (columns: ColumnInfo[], rows: DataRow[], label: string) => {
    update((d) => withData(d, def, columns, rows));
    toast(t("data.loaded", { rows: rows.length.toLocaleString(), cols: columns.length }) + (label ? ` · ${label}` : ""));
  };

  const useSample = () => {
    update((d) => {
      const s = docFromSample(def, d.style, locale);
      return { ...d, columns: s.columns, data: s.data, mapping: s.mapping, title: s.title, subtitle: s.subtitle, source: s.source };
    });
  };

  const importFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result ?? ""));
        if (parsed && typeof parsed === "object" && !Array.isArray(parsed) && typeof parsed.chartType === "string" && Array.isArray(parsed.data)) {
          const d = sanitizeDoc(parsed as ChartDoc);
          if (!parsed.columns) d.columns = inferColumns(d.data);
          history.set(d);
          return;
        }
        const table = parseJSONRows(String(reader.result ?? ""));
        if (table && table.rows.length) {
          loadTable(table.columns, table.rows, file.name);
          return;
        }
        toast(t("export.importFailed"), "error");
      } catch {
        toast(t("export.importFailed"), "error");
      }
    };
    reader.readAsText(file);
  };

  // Fix a doc pointing to a custom type that no longer exists.
  useEffect(() => {
    if (ready && !registry.get(doc.chartType) && doc.chartType.startsWith("custom:")) {
      history.set((d) => ({ ...d, chartType: "bar", mapping: autoMap(barChart, d.columns, d.mapping) }), { replace: true });
    }
  }, [ready, doc.chartType, registry, history]);

  return (
    <div className="builder" data-ready={ready}>
      <ChartPicker charts={registry.all} selected={def.id} columns={doc.columns} onSelect={selectType} />
      <Canvas
        doc={doc}
        def={def}
        resolve={(id) => registry.get(id) ?? barChart}
        onUndo={history.undo}
        onRedo={history.redo}
        canUndo={history.canUndo}
        canRedo={history.canRedo}
        onImport={importFile}
        onUseSample={useSample}
        onReset={() => {
          if (window.confirm(t("builder.resetConfirm"))) history.reset(defaultDoc(def, locale));
        }}
      />
      <aside className="inspector" aria-label={l(def.name)}>
        <div className="tabs" role="tablist">
          {(["data", "chart", "style"] as Tab[]).map((k) => (
            <button key={k} role="tab" type="button" aria-selected={tab === k} onClick={() => setTab(k)} data-tab={k}>
              {t(`builder.tabs.${k}`)}
            </button>
          ))}
        </div>
        <div className="inspector-body" role="tabpanel">
          {tab === "data" && <DataPanel doc={doc} def={def} update={update} onLoadTable={loadTable} onUseSample={useSample} />}
          {tab === "chart" && <ChartPanel doc={doc} def={def} update={update} charts={registry.all} onSwitchType={selectType} />}
          {tab === "style" && <StylePanel doc={doc} update={update} />}
        </div>
      </aside>
    </div>
  );
}

function Canvas({
  doc,
  def,
  resolve,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  onImport,
  onUseSample,
  onReset,
}: {
  doc: ChartDoc;
  def: ChartDefinition;
  resolve: (id: string) => ChartDefinition;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  onImport: (f: File) => void;
  onUseSample: () => void;
  onReset: () => void;
}) {
  const { t, l } = useI18n();
  // Rendering big datasets can take a moment; keep typing and clicks responsive.
  const deferredDoc = useDeferredValue(doc);
  const previewDef = resolve(deferredDoc.chartType);
  const { element, issues } = usePoster(deferredDoc, previewDef);
  const stageRef = useRef<HTMLDivElement>(null);
  const [box, setBox] = useState({ w: 800, h: 500 });

  useLayoutEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const measure = () => setBox({ w: el.clientWidth - 56, h: el.clientHeight - 56 });
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const { width, height } = doc.style;
  const scale = Math.min(1, Math.max(0.05, box.w / width), Math.max(0.05, (box.h > 120 ? box.h : Infinity) / height));
  const displayW = Math.max(120, Math.floor(width * scale));
  const issueText = useMemo(
    () =>
      issues.map((i) =>
        i.kind === "mapping"
          ? t("builder.issueMapping", { field: l(previewDef.fields.find((f) => f.key === i.issues[0].field)?.label ?? i.issues[0].field) })
          : i.kind === "rows"
            ? t("builder.issueRows", { n: i.needed })
            : t("builder.issueError", { message: i.message }),
      ),
    [issues, t, l, previewDef],
  );

  return (
    <section className="canvas" aria-label={doc.title || l(def.name)}>
      <div className="canvas-bar">
        <button className="btn ghost icon sm" type="button" onClick={onUndo} disabled={!canUndo} title={`${t("builder.undo")} (⌘Z)`} aria-label={t("builder.undo")}>
          <IconUndo />
        </button>
        <button className="btn ghost icon sm" type="button" onClick={onRedo} disabled={!canRedo} title={`${t("builder.redo")} (⇧⌘Z)`} aria-label={t("builder.redo")}>
          <IconRedo />
        </button>
        <span className="hint mono" style={{ marginLeft: 6 }}>
          {width}×{height} · {Math.round(scale * 100)}%
        </span>
        <div className="spacer" />
        <button className="btn ghost sm" type="button" onClick={onReset}>
          {t("builder.resetChart")}
        </button>
        <PublishButton doc={doc} def={def} />
        <ExportMenu doc={doc} def={def} onImport={onImport} />
      </div>
      {issueText.length > 0 && (
        <div className="stage-issues" style={{ paddingTop: 12 }}>
          {issueText.map((m, i) => (
            <div key={i} className="alert warn" role="status">
              <IconAlert style={{ width: 18, height: 18, flex: "none" }} />
              <span>{m}</span>
              {issues[i].kind !== "error" && (
                <button className="btn sm" type="button" onClick={onUseSample}>
                  {t("builder.useSample")}
                </button>
              )}
            </div>
          ))}
        </div>
      )}
      <div ref={stageRef} className={`stage ${doc.style.background === "transparent" ? "checker" : ""}`}>
        <div className="poster" style={{ width: displayW }} data-testid="poster">
          {element}
        </div>
      </div>
    </section>
  );
}

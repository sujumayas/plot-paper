"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { usePoster } from "@/components/chart/Poster";
import { IconDownload, IconImage, IconSparkle, IconTrash, IconUpload } from "@/components/icons";
import { useToast } from "@/components/ui/Toasts";
import { AIRequestError, generateSpec, getAIStatus } from "@/lib/ai/client";
import { AI_LIMITS, type AIStatus } from "@/lib/ai/protocol";
import { CUSTOM_PREFIX, useChartRegistry } from "@/lib/customTypes";
import { downloadText } from "@/lib/download";
import { useI18n } from "@/lib/i18n";
import { KEYS, readJSON, writeJSON } from "@/lib/storage";
import { docFromSample } from "@/lib/viz/engine";
import { specToDefinition } from "@/lib/viz/spec/render";
import { SPEC_TEMPLATES } from "@/lib/viz/spec/templates";
import type { PlotSpec } from "@/lib/viz/spec/types";
import { parseSpecText } from "@/lib/viz/spec/validate";
import { THEMES } from "@/lib/viz/themes";

type Draft = { text: string; editingId: string | null };

const IDEAS = {
  en: ["Bullet chart: each region vs its target, grey range behind", "Diverging bars for gains and losses, sorted", "Temperature range band with an average line", "Dot plot of salaries by level with the mean marked", "Thin ring chart of ticket topics"],
  es: ["Gráfico de bala: cada región vs su meta, con rango gris", "Barras divergentes para ganancias y pérdidas, ordenadas", "Banda de rango de temperatura con línea de promedio", "Puntos de sueldos por nivel con el promedio marcado", "Anillo delgado de temas de tickets"],
};

export function Studio() {
  const { t, l, locale } = useI18n();
  const toast = useToast();
  const router = useRouter();
  const registry = useChartRegistry();
  const [text, setText] = useState(() => JSON.stringify(SPEC_TEMPLATES[0].spec, null, 2));
  const [editingId, setEditingId] = useState<string | null>(null);
  const [debounced, setDebounced] = useState(text);
  const [theme, setTheme] = useState("clean");
  const [status, setStatus] = useState<AIStatus | null>(null);
  const [prompt, setPrompt] = useState("");
  const [image, setImage] = useState<string | null>(null);
  const [refine, setRefine] = useState(false);
  const [busy, setBusy] = useState(false);
  const [aiNotes, setAiNotes] = useState("");
  const abort = useRef<AbortController | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const imgRef = useRef<HTMLInputElement>(null);
  const hydrated = useRef(false);

  useEffect(() => {
    getAIStatus().then(setStatus);
    const draft = readJSON<Draft | null>(KEYS.studioDraft, null);
    const params = new URLSearchParams(window.location.search);
    const edit = params.get("edit");
    const found = edit ? registry.custom.find((c) => c.id === edit) : undefined;
    if (found) {
      setText(JSON.stringify(found.spec, null, 2));
      setEditingId(found.id);
    } else if (draft?.text) {
      setText(draft.text);
      setEditingId(draft.editingId);
    }
    hydrated.current = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [registry.loaded]);

  useEffect(() => {
    const id = setTimeout(() => setDebounced(text), 250);
    if (hydrated.current) writeJSON(KEYS.studioDraft, { text, editingId });
    return () => clearTimeout(id);
  }, [text, editingId]);

  const validation = useMemo(() => parseSpecText(debounced), [debounced]);
  const lastGood = useRef<PlotSpec>(SPEC_TEMPLATES[0].spec);
  if (validation.spec) lastGood.current = validation.spec;
  const spec = lastGood.current;
  const def = useMemo(() => specToDefinition(spec, "custom:preview"), [spec]);
  const doc = useMemo(() => docFromSample(def, { theme }, locale), [def, theme, locale]);

  const load = (s: PlotSpec, id: string | null = null) => {
    setText(JSON.stringify(s, null, 2));
    setEditingId(id);
  };

  const save = () => {
    if (!validation.spec) return;
    const item = registry.upsert(validation.spec, { id: editingId ?? undefined, origin: aiNotes ? "ai" : "studio", prompt: prompt || undefined });
    setEditingId(item.id);
    toast(t("studio.saved", { name: item.spec.name }));
    return item;
  };

  const runAI = async () => {
    if (!prompt.trim()) return;
    abort.current?.abort();
    const ctrl = new AbortController();
    abort.current = ctrl;
    setBusy(true);
    setAiNotes("");
    try {
      const res = await generateSpec({ prompt, image, current: refine ? validation.spec : null, locale }, ctrl.signal);
      load(res.spec, refine ? editingId : null);
      setAiNotes(res.notes || t("studio.aiDone"));
      toast(t("studio.aiDone"));
    } catch (err) {
      if ((err as Error).name === "AbortError") return;
      const e = err as AIRequestError;
      toast(e.code === "rate_limited" ? t("studio.aiRateLimited") : e.code === "unauthenticated" ? t("studio.aiSignIn") : t("studio.aiError", { message: e.message }), "error");
    } finally {
      setBusy(false);
    }
  };

  const onImage = (file: File) => {
    if (!/^image\/(png|jpeg|webp|gif)$/.test(file.type)) return toast(t("studio.aiImageType"), "error");
    if (file.size > AI_LIMITS.imageBytes) return toast(t("studio.aiImageTooBig"), "error");
    const reader = new FileReader();
    reader.onload = () => setImage(String(reader.result));
    reader.readAsDataURL(file);
  };

  return (
    <div className="studio">
      <aside className="studio-side">
        <section className="ai-box" aria-labelledby="ai-title">
          <h3 id="ai-title">
            <IconSparkle /> {t("studio.aiTitle")}
            {status?.provider === "mock" && <span className="badge gray">demo</span>}
          </h3>
          {!status ? (
            <p className="hint">{t("common.loading")}</p>
          ) : !status.enabled ? (
            <p className="hint">{t("studio.aiDisabled")}</p>
          ) : (
            <>
              {status.provider === "mock" && <p className="hint">{t("studio.aiMock")}</p>}
              <textarea className="textarea" rows={4} value={prompt} maxLength={AI_LIMITS.promptChars} placeholder={t("studio.aiPlaceholder")} onChange={(e) => setPrompt(e.target.value)} aria-label={t("studio.aiTitle")} data-testid="ai-prompt" />
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {!refine &&
                  IDEAS[locale].slice(0, 3).map((idea) => (
                    <button key={idea} type="button" className="chip" style={{ height: "auto", padding: "4px 10px", whiteSpace: "normal", textAlign: "left" }} onClick={() => setPrompt(idea)}>
                      {idea}
                    </button>
                  ))}
              </div>
              <label className="switch">
                <span>{t("studio.aiRefine")}</span>
                <input type="checkbox" checked={refine} onChange={(e) => setRefine(e.target.checked)} disabled={!validation.spec} />
              </label>
              {image ? (
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={image} alt="" style={{ width: 64, height: 44, objectFit: "cover", borderRadius: 6, border: "1px solid var(--line)" }} />
                  <button className="btn ghost sm" type="button" onClick={() => setImage(null)}>
                    {t("studio.aiRemoveImage")}
                  </button>
                </div>
              ) : (
                <button className="btn sm" type="button" onClick={() => imgRef.current?.click()} title={t("studio.aiImageHint")}>
                  <IconImage /> {t("studio.aiImage")}
                </button>
              )}
              <input ref={imgRef} type="file" hidden accept="image/png,image/jpeg,image/webp,image/gif" onChange={(e) => e.target.files?.[0] && onImage(e.target.files[0])} />
              {busy ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  <div className="thinking-bar">
                    <span />
                  </div>
                  <span className="hint">{t("studio.aiThinking")}</span>
                  <button className="btn sm" type="button" onClick={() => abort.current?.abort()}>
                    {t("common.cancel")}
                  </button>
                </div>
              ) : (
                <button className="btn dark" type="button" onClick={runAI} disabled={!prompt.trim()} data-testid="ai-generate">
                  <IconSparkle /> {t("studio.aiGenerate")}
                </button>
              )}
              {aiNotes && <div className="alert ok">{aiNotes}</div>}
            </>
          )}
        </section>

        <section className="panel-section">
          <h3>{t("studio.templates")}</h3>
          <div className="tpl-list">
            {SPEC_TEMPLATES.map((tpl) => (
              <button key={tpl.id} type="button" className="palette-btn" onClick={() => load(tpl.spec)} title={tpl.spec.description}>
                {tpl.spec.name}
              </button>
            ))}
          </div>
        </section>

        <section className="panel-section">
          <h3>{t("studio.myTypes")}</h3>
          {registry.custom.length === 0 && <p className="hint">{t("studio.noTypes")}</p>}
          {registry.custom.map((c) => (
            <div key={c.id} className="mytype">
              <button type="button" className="name" style={{ border: 0, background: "none", textAlign: "left", padding: 0 }} onClick={() => load(c.spec, c.id)} title={c.spec.description}>
                {c.spec.name}
              </button>
              <Link className="btn ghost sm" href={`/build?type=${encodeURIComponent(CUSTOM_PREFIX + c.id)}` as never}>
                {t("common.open")}
              </Link>
              <button
                className="btn ghost icon sm"
                type="button"
                aria-label={t("common.delete")}
                onClick={() => {
                  if (window.confirm(t("studio.deleteConfirm", { name: c.spec.name }))) {
                    registry.remove(c.id);
                    if (editingId === c.id) setEditingId(null);
                  }
                }}
              >
                <IconTrash />
              </button>
            </div>
          ))}
        </section>

        <section className="panel-section">
          <div className="data-actions">
            <button className="btn sm" type="button" onClick={() => validation.spec && downloadText(JSON.stringify(validation.spec, null, 2), `${validation.spec.name.toLowerCase().replace(/[^a-z0-9]+/g, "-") || "spec"}.plotspec.json`, "application/json")} disabled={!validation.spec}>
              <IconDownload /> {t("studio.exportSpec")}
            </button>
            <button className="btn sm" type="button" onClick={() => fileRef.current?.click()}>
              <IconUpload /> {t("studio.importSpec")}
            </button>
          </div>
          <input
            ref={fileRef}
            type="file"
            hidden
            accept=".json,application/json"
            onChange={(e) => {
              const f = e.target.files?.[0];
              e.target.value = "";
              if (!f) return;
              f.text().then((txt) => {
                const v = parseSpecText(txt);
                if (v.spec) load(v.spec);
                else toast(t("studio.importFailed") + " " + (v.errors[0] ?? ""), "error");
              });
            }}
          />
          <Link href={"/guide/plotspec" as never} className="hint">
            {t("studio.docs")} →
          </Link>
        </section>
      </aside>

      <section className="studio-editor" aria-label={t("studio.editor")}>
        <div className="bar">
          <strong style={{ color: "var(--ink)" }}>{t("studio.editor")}</strong>
          {editingId && <span className="badge">{t("studio.update")}</span>}
          <div style={{ flex: 1 }} />
          <button
            className="btn ghost sm"
            type="button"
            onClick={() => {
              try {
                setText(JSON.stringify(JSON.parse(text), null, 2));
              } catch {
                /* keep as is */
              }
            }}
          >
            {t("studio.format")}
          </button>
          <button className="btn primary sm" type="button" onClick={save} disabled={!validation.spec} data-testid="save-type">
            {editingId ? t("studio.update") : t("studio.save")}
          </button>
          <button
            className="btn sm"
            type="button"
            disabled={!validation.spec}
            onClick={() => {
              const item = save();
              if (item) router.push(`/build?type=${encodeURIComponent(CUSTOM_PREFIX + item.id)}` as never);
            }}
          >
            {t("studio.useInBuilder")}
          </button>
        </div>
        <textarea
          className="code"
          spellCheck={false}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Tab") {
              e.preventDefault();
              const el = e.currentTarget;
              const { selectionStart: a, selectionEnd: b } = el;
              const next = text.slice(0, a) + "  " + text.slice(b);
              setText(next);
              requestAnimationFrame(() => el.setSelectionRange(a + 2, a + 2));
            }
          }}
          aria-label={t("studio.editor")}
          data-testid="spec-editor"
        />
        <div className="issues" aria-live="polite" data-testid="spec-issues">
          {validation.spec && !validation.warnings.length ? (
            <span className="badge ok">✓ {t("studio.valid")}</span>
          ) : (
            <>
              <div style={{ display: "flex", gap: 6 }}>
                {validation.errors.length > 0 && <span className="badge warn" style={{ background: "var(--danger-soft)", color: "var(--danger)" }}>{t("studio.errors", { n: validation.errors.length })}</span>}
                {validation.warnings.length > 0 && <span className="badge warn">{t("studio.warnings", { n: validation.warnings.length })}</span>}
              </div>
              <ul>
                {validation.errors.map((e, i) => (
                  <li key={`e${i}`} className="issue-err">
                    {e}
                  </li>
                ))}
                {validation.warnings.map((w, i) => (
                  <li key={`w${i}`} className="issue-warn">
                    {w}
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      </section>

      <section className="studio-preview" aria-label={t("studio.preview")}>
        <div className="bar">
          <strong style={{ color: "var(--ink)" }}>{t("studio.preview")}</strong>
          <span className="hint">{spec.name}</span>
          <div style={{ flex: 1 }} />
          <select className="select sm" style={{ width: "auto" }} value={theme} onChange={(e) => setTheme(e.target.value)} aria-label={t("style.theme")}>
            {THEMES.map((th) => (
              <option key={th.id} value={th.id}>
                {l(th.name)}
              </option>
            ))}
          </select>
        </div>
        <div className="stage">
          <PreviewPoster doc={doc} def={def} />
        </div>
      </section>
    </div>
  );
}

function PreviewPoster({ doc, def }: { doc: ReturnType<typeof docFromSample>; def: ReturnType<typeof specToDefinition> }) {
  const { element } = usePoster(doc, def);
  return (
    <div className="poster" style={{ width: "100%", maxWidth: 900 }} data-testid="studio-preview">
      {element}
    </div>
  );
}

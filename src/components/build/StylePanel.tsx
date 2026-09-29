"use client";

import { useState } from "react";
import { useI18n } from "@/lib/i18n";
import { isHexColor } from "@/lib/viz/scale";
import { FONT_PAIRINGS, MAX_SIZE, MIN_SIZE, PALETTES, SIZE_PRESETS, THEMES, findPalette, findTheme } from "@/lib/viz/themes";
import type { ChartDoc, ChartStyle, NumberFormat } from "@/lib/viz/types";

type Props = {
  doc: ChartDoc;
  update: (fn: (d: ChartDoc) => ChartDoc, coalesce?: string) => void;
};

const LOCALES: { value: string; label: string }[] = [
  { value: "en-US", label: "1,234.56" },
  { value: "es-PE", label: "1,234.56 (es-PE)" },
  { value: "es-ES", label: "1.234,56" },
  { value: "de-DE", label: "1.234,56 (de)" },
  { value: "fr-FR", label: "1 234,56" },
  { value: "pt-BR", label: "1.234,56 (pt-BR)" },
  { value: "en-IN", label: "1,23,456.7" },
];

export function StylePanel({ doc, update }: Props) {
  const { t, l } = useI18n();
  const s = doc.style;
  const set = (patch: Partial<ChartStyle>, coalesce?: string) => update((d) => ({ ...d, style: { ...d.style, ...patch } }), coalesce);
  const setNum = (patch: Partial<NumberFormat>, coalesce?: string) =>
    update((d) => ({ ...d, style: { ...d.style, number: { ...d.style.number, ...patch } } }), coalesce);
  const theme = findTheme(s.theme);
  const palette = findPalette(s.palette) ?? findPalette(theme.palette) ?? PALETTES[0];

  return (
    <>
      <section className="panel-section">
        <h3>{t("style.theme")}</h3>
        <div className="theme-grid">
          {THEMES.map((th) => {
            const pal = findPalette(th.palette)?.colors ?? [];
            return (
              <button key={th.id} type="button" className="theme-card" aria-pressed={s.theme === th.id} onClick={() => set({ theme: th.id, palette: null, accent: null, fonts: null, background: null })} data-theme={th.id}>
                <span className="sw" style={{ background: th.background }}>
                  {pal.slice(0, 5).map((c, i) => (
                    <i key={i} style={{ background: c, height: [18, 28, 14, 24, 10][i] }} />
                  ))}
                  <b style={{ marginLeft: "auto", color: th.ink, fontSize: 12, fontFamily: FONT_PAIRINGS.find((f) => f.id === th.fonts)?.display }}>Aa</b>
                </span>
                <span className="nm">{l(th.name)}</span>
              </button>
            );
          })}
        </div>
      </section>

      <section className="panel-section">
        <h3>{t("style.palette")}</h3>
        <div className="palette-list">
          {[{ id: null as string | null, name: t("style.themeDefault"), colors: findPalette(theme.palette)?.colors ?? [] }, ...PALETTES.map((p) => ({ id: p.id as string | null, name: l(p.name), colors: p.colors }))].map((p) => (
            <button key={p.id ?? "default"} type="button" className="palette-btn" aria-pressed={s.palette === p.id} onClick={() => set({ palette: p.id, accent: null })}>
              <span className="dots">
                {p.colors.slice(0, 6).map((c, i) => (
                  <i key={i} style={{ background: c }} />
                ))}
              </span>
              {p.name}
            </button>
          ))}
        </div>
        <div className="field">
          <label>{t("style.accent")}</label>
          <div className="swatches">
            {palette.colors.slice(0, 8).map((c) => (
              <button key={c} type="button" className="swatch" style={{ background: c }} aria-pressed={(s.accent ?? palette.colors[0]).toLowerCase() === c.toLowerCase()} aria-label={c} onClick={() => set({ accent: c })} />
            ))}
            <input className="color-input" type="color" aria-label={t("style.custom")} value={isHexColor(s.accent) && s.accent!.length === 7 ? s.accent! : palette.colors[0]} onChange={(e) => set({ accent: e.target.value }, "accent")} />
            {s.accent && (
              <button className="btn ghost sm" type="button" onClick={() => set({ accent: null })}>
                {t("common.reset")}
              </button>
            )}
          </div>
        </div>
      </section>

      <section className="panel-section">
        <h3>{t("style.fonts")}</h3>
        <div className="palette-list">
          {[{ id: null as string | null, name: t("style.themeDefault"), display: FONT_PAIRINGS.find((f) => f.id === theme.fonts)?.display }, ...FONT_PAIRINGS.map((f) => ({ id: f.id as string | null, name: l(f.name), display: f.display }))].map((f) => (
            <button key={f.id ?? "default"} type="button" className="palette-btn" aria-pressed={s.fonts === f.id} onClick={() => set({ fonts: f.id })}>
              <span style={{ fontFamily: f.display, fontWeight: 700, fontSize: 15, width: 28 }}>Ag</span>
              {f.name}
            </button>
          ))}
        </div>
      </section>

      <section className="panel-section">
        <h3>{t("style.size")}</h3>
        <div className="size-grid">
          {SIZE_PRESETS.map((p) => {
            const r = p.width / p.height;
            const w = r >= 1 ? 22 : 22 * r;
            const h = r >= 1 ? 22 / r : 22;
            return (
              <button key={p.id} type="button" className="size-btn" aria-pressed={s.size === p.id} title={p.hint} onClick={() => set({ size: p.id, width: p.width, height: p.height })} data-size={p.id}>
                <span className="shape">
                  <i style={{ width: w, height: h }} />
                </span>
                <span>
                  {l(p.name)}
                  <small>
                    {p.width}×{p.height}
                  </small>
                </span>
              </button>
            );
          })}
        </div>
        <div className="field-row">
          <div className="field">
            <label htmlFor="w">{t("style.width")}</label>
            <SizeInput id="w" value={s.width} onCommit={(width) => set({ size: "custom", width }, "w")} />
          </div>
          <div className="field">
            <label htmlFor="h">{t("style.height")}</label>
            <SizeInput id="h" value={s.height} onCommit={(height) => set({ size: "custom", height }, "h")} />
          </div>
        </div>
      </section>

      <section className="panel-section">
        <h3>{t("style.textSize")}</h3>
        <input className="range" type="range" min={0.7} max={1.5} step={0.05} value={s.fontScale} onChange={(e) => set({ fontScale: Number(e.target.value) }, "fontScale")} aria-label={t("style.textSize")} />
        <label className="switch">
          <span>{t("style.grid")}</span>
          <input type="checkbox" checked={s.grid} onChange={(e) => set({ grid: e.target.checked })} />
        </label>
        <label className="switch">
          <span>{t("style.labels")}</span>
          <input type="checkbox" checked={s.labels} onChange={(e) => set({ labels: e.target.checked })} />
        </label>
        <div className="field">
          <label>{t("style.legend")}</label>
          <div className="seg">
            {(["top", "bottom", "none"] as const).map((v) => (
              <button key={v} type="button" aria-pressed={s.legend === v} onClick={() => set({ legend: v })}>
                {t(v === "top" ? "style.legendTop" : v === "bottom" ? "style.legendBottom" : "style.legendNone")}
              </button>
            ))}
          </div>
        </div>
        <div className="field">
          <label>{t("style.align")}</label>
          <div className="seg">
            {(["left", "center"] as const).map((v) => (
              <button key={v} type="button" aria-pressed={s.titleAlign === v} onClick={() => set({ titleAlign: v })}>
                {t(v === "left" ? "style.left" : "style.center")}
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="panel-section">
        <h3>{t("style.numbers")}</h3>
        <div className="field-row">
          <div className="field">
            <label htmlFor="pre">{t("style.prefix")}</label>
            <input id="pre" className="input sm" maxLength={6} placeholder="$" value={s.number.prefix} onChange={(e) => setNum({ prefix: e.target.value }, "prefix")} />
          </div>
          <div className="field">
            <label htmlFor="suf">{t("style.suffix")}</label>
            <input id="suf" className="input sm" maxLength={8} placeholder="%" value={s.number.suffix} onChange={(e) => setNum({ suffix: e.target.value }, "suffix")} />
          </div>
        </div>
        <div className="field-row">
          <div className="field">
            <label htmlFor="dec">{t("style.decimals")}</label>
            <select id="dec" className="select sm" value={s.number.decimals === null ? "auto" : String(s.number.decimals)} onChange={(e) => setNum({ decimals: e.target.value === "auto" ? null : Number(e.target.value) })}>
              <option value="auto">{t("common.auto")}</option>
              {[0, 1, 2, 3, 4].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="loc">{t("style.locale")}</label>
            <select id="loc" className="select sm" value={s.number.locale} onChange={(e) => setNum({ locale: e.target.value })}>
              {LOCALES.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
        </div>
        <label className="switch">
          <span>{t("style.compact")}</span>
          <input type="checkbox" checked={s.number.compact} onChange={(e) => setNum({ compact: e.target.checked })} />
        </label>
      </section>

      <section className="panel-section">
        <h3>{t("style.more")}</h3>
        <div className="field">
          <label>{t("style.background")}</label>
          <div className="seg">
            <button type="button" aria-pressed={!s.background} onClick={() => set({ background: null })}>
              {t("style.bgTheme")}
            </button>
            <button type="button" aria-pressed={s.background === "transparent"} onClick={() => set({ background: "transparent" })}>
              {t("style.bgTransparent")}
            </button>
            <button type="button" aria-pressed={isHexColor(s.background)} onClick={() => set({ background: isHexColor(s.background) ? s.background : "#FFFFFF" })}>
              {t("style.bgCustom")}
            </button>
          </div>
          {isHexColor(s.background) && (
            <input className="color-input" type="color" value={s.background!.length === 7 ? s.background! : "#ffffff"} onChange={(e) => set({ background: e.target.value }, "bg")} aria-label={t("style.bgCustom")} />
          )}
        </div>
        <div className="field">
          <label>
            {t("style.corners")} <span className="badge gray">{s.corners}</span>
          </label>
          <input className="range" type="range" min={0} max={16} step={1} value={s.corners} onChange={(e) => set({ corners: Number(e.target.value) }, "corners")} />
        </div>
        <label className="switch">
          <span>{t("style.branding")}</span>
          <input type="checkbox" checked={s.branding} onChange={(e) => set({ branding: e.target.checked })} />
        </label>
      </section>
    </>
  );
}

const clampSize = (v: number) => Math.min(MAX_SIZE, Math.max(MIN_SIZE, Math.round(v)));

/**
 * Pixel size field. Typing is free-form (so "1200" can be typed through "1", "12"…);
 * in-range values apply live, and the value is clamped on blur or Enter.
 */
function SizeInput({ id, value, onCommit }: { id: string; value: number; onCommit: (v: number) => void }) {
  const [draft, setDraft] = useState<string | null>(null);
  const finish = () => {
    const n = Number(draft);
    if (draft !== null && draft.trim() !== "" && Number.isFinite(n) && clampSize(n) !== value) onCommit(clampSize(n));
    setDraft(null);
  };
  return (
    <input
      id={id}
      className="input sm"
      type="number"
      inputMode="numeric"
      min={MIN_SIZE}
      max={MAX_SIZE}
      value={draft ?? value}
      onChange={(e) => {
        setDraft(e.target.value);
        const n = Number(e.target.value);
        if (e.target.value.trim() !== "" && Number.isInteger(n) && n >= MIN_SIZE && n <= MAX_SIZE) onCommit(n);
      }}
      onBlur={finish}
      onKeyDown={(e) => {
        if (e.key === "Enter") finish();
        else if (e.key === "Escape") setDraft(null);
      }}
    />
  );
}

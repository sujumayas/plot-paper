"use client";

import { useI18n } from "@/lib/i18n";
import { mappingIssues } from "@/lib/viz/data";
import type { ChartDefinition, ChartDoc, OptionDef } from "@/lib/viz/types";
import { AISuggest } from "./AISuggest";

type Props = {
  doc: ChartDoc;
  def: ChartDefinition;
  update: (fn: (d: ChartDoc) => ChartDoc, coalesce?: string) => void;
  charts: ChartDefinition[];
  onSwitchType: (def: ChartDefinition) => void;
};

export function ChartPanel({ doc, def, update, charts, onSwitchType }: Props) {
  const { t, l } = useI18n();
  const issues = mappingIssues(def, doc.mapping, doc.columns);
  const text = (key: "title" | "subtitle" | "source" | "note", multiline = false) => {
    const common = {
      id: `f-${key}`,
      value: doc[key],
      placeholder: t(`chart.${key}Placeholder`),
      onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const v = e.target.value.slice(0, key === "note" ? 400 : 200);
        update((d) => ({ ...d, [key]: v }), `text-${key}`);
      },
    };
    return (
      <div className="field">
        <label htmlFor={`f-${key}`}>{t(`chart.${key}`)}</label>
        {multiline ? <textarea className="textarea" rows={2} style={{ minHeight: 56 }} {...common} /> : <input className="input" {...common} />}
      </div>
    );
  };

  return (
    <>
      <AISuggest doc={doc} charts={charts} update={update} onSwitchType={onSwitchType} />

      <section className="panel-section">
        <h3>{t("chart.text")}</h3>
        {text("title", true)}
        {text("subtitle")}
        {text("source")}
        {text("note")}
      </section>

      <section className="panel-section">
        <h3>{t("chart.mapping")}</h3>
        <p className="hint">{t("chart.mappingHelp")}</p>
        {def.fields.map((f) => {
          const current = doc.mapping[f.key];
          const issue = issues.find((i) => i.field === f.key);
          const eligible = doc.columns.filter((c) => f.type !== "number" || c.type === "number");
          return (
            <div key={f.key} className="mapping-row" data-field={f.key}>
              <div className="label">
                {l(f.label)}
                <small>{f.required === false ? t("chart.optional") : t("chart.required")}</small>
              </div>
              {f.multiple ? (
                <div className="multi-cols">
                  {eligible.length === 0 && <span className="hint">—</span>}
                  {eligible.map((c) => {
                    const list = Array.isArray(current) ? current : current ? [current] : [];
                    const on = list.includes(c.name);
                    return (
                      <label key={c.name}>
                        <input
                          type="checkbox"
                          checked={on}
                          onChange={() =>
                            update((d) => {
                              const cur = d.mapping[f.key];
                              const arr = Array.isArray(cur) ? cur : cur ? [cur] : [];
                              const next = on ? arr.filter((n) => n !== c.name) : [...arr, c.name];
                              return { ...d, mapping: { ...d.mapping, [f.key]: next } };
                            })
                          }
                        />
                        {c.name}
                      </label>
                    );
                  })}
                </div>
              ) : (
                <select
                  className="select sm"
                  value={typeof current === "string" ? current : ""}
                  aria-invalid={!!issue}
                  aria-label={l(f.label)}
                  onChange={(e) => {
                    const v = e.target.value || undefined;
                    update((d) => ({ ...d, mapping: { ...d.mapping, [f.key]: v } }));
                  }}
                >
                  <option value="">{t("chart.notMapped")}</option>
                  {doc.columns.map((c) => (
                    <option key={c.name} value={c.name}>
                      {c.name}
                      {c.type === "number" ? " (123)" : c.type === "date" ? " (date)" : ""}
                    </option>
                  ))}
                </select>
              )}
              {issue?.kind === "type" && <div className="error-text" style={{ gridColumn: "1 / -1" }}>{t("chart.typeMismatch")}</div>}
            </div>
          );
        })}
      </section>

      <section className="panel-section">
        <h3>{t("chart.options")}</h3>
        {(def.options ?? []).length === 0 && <p className="hint">{t("chart.noOptions")}</p>}
        {(def.options ?? []).map((o) => (
          <OptionControl key={o.key} opt={o} value={doc.options[o.key]} onChange={(v) => update((d) => ({ ...d, options: { ...d.options, [o.key]: v } }), `opt-${o.key}`)} />
        ))}
      </section>
    </>
  );
}

function OptionControl({ opt, value, onChange }: { opt: OptionDef; value: unknown; onChange: (v: string | number | boolean) => void }) {
  const { l } = useI18n();
  const id = `opt-${opt.key}`;
  if (opt.type === "boolean") {
    return (
      <label className="switch" htmlFor={id}>
        <span>{l(opt.label)}</span>
        <input id={id} type="checkbox" checked={typeof value === "boolean" ? value : opt.default} onChange={(e) => onChange(e.target.checked)} />
      </label>
    );
  }
  if (opt.type === "select") {
    const v = typeof value === "string" ? value : opt.default;
    return (
      <div className="field">
        <label htmlFor={id}>{l(opt.label)}</label>
        {opt.choices.length <= 3 ? (
          <div className="seg" role="group" aria-label={l(opt.label)}>
            {opt.choices.map((c) => (
              <button key={c.value} type="button" aria-pressed={v === c.value} onClick={() => onChange(c.value)}>
                {l(c.label)}
              </button>
            ))}
          </div>
        ) : (
          <select id={id} className="select sm" value={v} onChange={(e) => onChange(e.target.value)}>
            {opt.choices.map((c) => (
              <option key={c.value} value={c.value}>
                {l(c.label)}
              </option>
            ))}
          </select>
        )}
        {opt.help && <span className="hint">{l(opt.help)}</span>}
      </div>
    );
  }
  if (opt.type === "number") {
    const v = typeof value === "number" ? value : opt.default;
    return (
      <div className="field">
        <label htmlFor={id}>
          {l(opt.label)} <span className="badge gray">{v}</span>
        </label>
        <input id={id} className="range" type="range" min={opt.min} max={opt.max} step={opt.step ?? 1} value={v} onChange={(e) => onChange(Number(e.target.value))} />
        {opt.help && <span className="hint">{l(opt.help)}</span>}
      </div>
    );
  }
  return (
    <div className="field">
      <label htmlFor={id}>{l(opt.label)}</label>
      <input id={id} className="input sm" value={typeof value === "string" ? value : opt.default} maxLength={80} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}

"use client";

import { memo, useRef, useState, type ChangeEvent, type KeyboardEvent } from "react";
import { IconDownload, IconPlus, IconSparkle, IconTrash, IconUpload } from "@/components/icons";
import { useToast } from "@/components/ui/Toasts";
import { downloadText } from "@/lib/download";
import { useI18n, type MessageKey } from "@/lib/i18n";
import { MAX_COLUMNS, MAX_ROWS, parseTextToTable } from "@/lib/viz/data";
import { addColumn, addRow, deleteColumn, deleteRow, docToCSV, renameColumn, setCell, templateCSV } from "@/lib/viz/docOps";
import { fileBase } from "@/lib/viz/export/filename";
import type { Cell, ChartDefinition, ChartDoc, ColumnInfo, DataRow } from "@/lib/viz/types";

export const MAX_FILE_MB = 20;
const GRID_ROWS = 200;

type Props = {
  doc: ChartDoc;
  def: ChartDefinition;
  update: (fn: (d: ChartDoc) => ChartDoc, coalesce?: string) => void;
  onLoadTable: (columns: ColumnInfo[], rows: DataRow[], label: string) => void;
  onUseSample: () => void;
};

const WARNINGS: Record<string, MessageKey> = {
  "truncated-rows": "data.warnTruncated",
  "ragged-rows": "data.warnRagged",
  "unterminated-quote": "data.warnQuote",
  "too-many-columns": "data.warnColumns",
};

export function DataPanel({ doc, def, update, onLoadTable, onUseSample }: Props) {
  const { t } = useI18n();
  const toast = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [drag, setDrag] = useState(false);
  const [paste, setPaste] = useState("");
  const [showPaste, setShowPaste] = useState(false);

  const ingest = (text: string, label: string) => {
    if (/\u0000/.test(text.slice(0, 2000))) {
      toast(t("data.notText"), "error");
      return;
    }
    const { columns, rows, warnings } = parseTextToTable(text);
    if (!columns.length || !rows.length) {
      toast(t("data.unreadable"), "error");
      return;
    }
    for (const w of warnings) {
      const key = WARNINGS[w];
      if (key) toast(t(key, { n: w === "too-many-columns" ? MAX_COLUMNS : MAX_ROWS }), "error");
    }
    onLoadTable(columns, rows, label);
  };

  const readFile = (file: File) => {
    if (file.size > MAX_FILE_MB * 1024 * 1024) {
      toast(t("data.fileTooBig", { mb: MAX_FILE_MB }), "error");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => ingest(String(reader.result ?? ""), file.name);
    reader.onerror = () => toast(t("data.unreadable"), "error");
    reader.readAsText(file);
  };

  return (
    <>
      <section className="panel-section">
        <h3>{t("data.importTitle")}</h3>
        <div
          className={`dropzone ${drag ? "drag" : ""}`}
          role="button"
          tabIndex={0}
          onClick={() => fileRef.current?.click()}
          onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && fileRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            setDrag(true);
          }}
          onDragLeave={() => setDrag(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDrag(false);
            const f = e.dataTransfer.files?.[0];
            if (f) readFile(f);
          }}
          data-testid="dropzone"
        >
          <IconUpload style={{ width: 22, height: 22, color: "var(--muted)" }} />
          <strong>{t("data.dropHere")}</strong>
          <span>{t("data.orClick")}</span>
        </div>
        <input
          ref={fileRef}
          type="file"
          accept=".csv,.tsv,.txt,.json,text/csv,text/plain,application/json"
          hidden
          data-testid="file-input"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) readFile(f);
            e.target.value = "";
          }}
        />
        <div className="data-actions">
          <button className="btn sm" type="button" onClick={() => setShowPaste((v) => !v)} aria-expanded={showPaste}>
            {t("data.paste")}
          </button>
          <button className="btn sm" type="button" onClick={onUseSample}>
            <IconSparkle /> {t("data.sample")}
          </button>
          <button className="btn sm" type="button" onClick={() => downloadText(templateCSV(def), `${def.id.replace(/[^a-z0-9-]/gi, "")}-template.csv`, "text/csv")}>
            <IconDownload /> {t("data.template")}
          </button>
          {doc.data.length > 0 && (
            <button className="btn sm" type="button" onClick={() => downloadText(docToCSV(doc), `${fileBase(doc)}.csv`, "text/csv")}>
              <IconDownload /> {t("data.exportCsv")}
            </button>
          )}
        </div>
        {showPaste && (
          <div className="field">
            <textarea
              className="textarea mono"
              rows={6}
              placeholder={t("data.pastePlaceholder")}
              value={paste}
              onChange={(e) => setPaste(e.target.value)}
              aria-label={t("data.paste")}
              data-testid="paste-area"
            />
            <button
              className="btn primary sm"
              type="button"
              disabled={!paste.trim()}
              onClick={() => {
                ingest(paste, t("data.paste"));
                setPaste("");
                setShowPaste(false);
              }}
            >
              {t("data.pasteApply")}
            </button>
          </div>
        )}
      </section>

      <section className="panel-section">
        <h3>
          <span>{t("data.table")}</span>
          <span className="badge gray">
            {t("common.rows", { n: doc.data.length.toLocaleString() })} · {t("common.columns", { n: doc.columns.length })}
          </span>
        </h3>
        {doc.columns.length === 0 ? (
          <p className="hint">{t("data.empty")}</p>
        ) : (
          <DataGrid doc={doc} update={update} />
        )}
        <div className="data-actions">
          <button className="btn sm" type="button" onClick={() => update(addRow)} disabled={!doc.columns.length}>
            <IconPlus /> {t("data.addRow")}
          </button>
          <button className="btn sm" type="button" onClick={() => update((d) => addColumn(d, t("data.newColumn")))}>
            <IconPlus /> {t("data.addColumn")}
          </button>
          {doc.data.length > 0 && (
            <button className="btn sm ghost danger" type="button" onClick={() => update((d) => ({ ...d, data: [], columns: [], mapping: {} }))}>
              <IconTrash /> {t("data.clear")}
            </button>
          )}
        </div>
        {doc.data.length > GRID_ROWS && <p className="hint">{t("data.showing", { shown: GRID_ROWS, total: doc.data.length.toLocaleString() })}</p>}
      </section>
    </>
  );
}

const typeKey: Record<string, MessageKey> = { number: "data.typeNumber", string: "data.typeText", date: "data.typeDate" };

function DataGrid({ doc, update }: { doc: ChartDoc; update: Props["update"] }) {
  const { t } = useI18n();
  const rows = doc.data.slice(0, GRID_ROWS);
  return (
    <div className="grid-wrap">
      <table className="datagrid" data-testid="datagrid">
        <thead>
          <tr>
            <th>#</th>
            {doc.columns.map((c) => (
              <th key={c.name}>
                <div className="colhead">
                  <HeaderCell name={c.name} onCommit={(to) => update((d) => renameColumn(d, c.name, to))} label={t("data.renameColumn")} />
                  <span className="type-tag" title={t(typeKey[c.type])}>
                    {c.type === "number" ? "123" : c.type === "date" ? "📅" : "Aa"}
                  </span>
                  <button className="row-del" type="button" style={{ visibility: "visible" }} title={t("data.deleteColumn")} aria-label={`${t("data.deleteColumn")} ${c.name}`} onClick={() => update((d) => deleteColumn(d, c.name))}>
                    ×
                  </button>
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i}>
              <td>
                <button className="row-del" type="button" title={t("data.deleteRow")} aria-label={`${t("data.deleteRow")} ${i + 1}`} onClick={() => update((d) => deleteRow(d, i))}>
                  ×
                </button>
                <span className="row-num">{i + 1}</span>
              </td>
              {doc.columns.map((c) => (
                <td key={c.name} className={c.type === "number" ? "num" : undefined}>
                  <Cell value={r[c.name]} onCommit={(raw) => update((d) => setCell(d, i, c.name, raw))} label={`${c.name} ${i + 1}`} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/**
 * A text input that edits a draft and commits on blur/Enter. Escape discards the
 * draft (a ref, because blur() fires synchronously before the state update lands).
 */
function useDraftInput(shown: string, commit: (draft: string) => void) {
  const [draft, setDraft] = useState<string | null>(null);
  const cancelled = useRef(false);
  return {
    value: draft ?? shown,
    onFocus: () => {
      cancelled.current = false;
      setDraft(shown);
    },
    onChange: (e: ChangeEvent<HTMLInputElement>) => setDraft(e.target.value),
    onBlur: () => {
      if (!cancelled.current && draft !== null && draft !== shown) commit(draft);
      cancelled.current = false;
      setDraft(null);
    },
    onKeyDown: (e: KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") e.currentTarget.blur();
      else if (e.key === "Escape") {
        cancelled.current = true;
        e.currentTarget.blur();
      }
    },
  };
}

const Cell = memo(function Cell({ value, onCommit, label }: { value: Cell; onCommit: (raw: string) => void; label: string }) {
  const input = useDraftInput(value === null || value === undefined ? "" : String(value), onCommit);
  return <input {...input} aria-label={label} />;
});

function HeaderCell({ name, onCommit, label }: { name: string; onCommit: (to: string) => void; label: string }) {
  const input = useDraftInput(name, (draft) => {
    if (draft.trim()) onCommit(draft);
  });
  return <input {...input} aria-label={`${label}: ${name}`} />;
}

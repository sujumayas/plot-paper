"use client";

import { useRef, useState } from "react";
import { IconDownload, IconSparkle } from "@/components/icons";
import { CSVUtil } from "@/lib/csv";
import { downloadText } from "@/lib/download";
import type { VizCatalogEntry, VizRow } from "@/lib/viz/types";

type Props = {
  viz: VizCatalogEntry;
  data: VizRow[];
  onData: (rows: VizRow[]) => void;
  toast: (msg: string) => void;
};

export function CSVPanel({ viz, data, onData, toast }: Props) {
  const [drag, setDrag] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = String(e.target?.result ?? "");
      const parsed = CSVUtil.parse(text);
      const coerced = CSVUtil.coerceToSchema(viz, parsed.data);
      onData(coerced);
      toast(`Cargadas ${coerced.length} filas desde ${file.name}`);
    };
    reader.readAsText(file);
  };

  const downloadTemplate = () => {
    const csv = CSVUtil.templateFor(viz);
    downloadText(csv, `${viz.id}-plantilla.csv`, "text/csv");
    toast(`Plantilla descargada: ${viz.id}-plantilla.csv`);
  };

  return (
    <>
      <div className="tmpl-row" style={{ marginBottom: 12 }}>
        <button type="button" className="btn sm" onClick={downloadTemplate}>
          <IconDownload /> Plantilla.csv
        </button>
        <button
          type="button"
          className="btn sm"
          onClick={() => onData(viz.sample)}
        >
          <IconSparkle /> Usar muestra
        </button>
      </div>
      <div
        className={`upload-zone ${drag ? "drag" : ""}`}
        onDragOver={(e) => {
          e.preventDefault();
          setDrag(true);
        }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDrag(false);
          const f = e.dataTransfer.files[0];
          if (f) handleFile(f);
        }}
        onClick={() => inputRef.current?.click()}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".csv,text/csv"
          hidden
          onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
        />
        <div className="drop-title">Arrastra tu CSV aquí</div>
        <div className="drop-sub">o haz clic para subirlo</div>
      </div>
      <div className="csv-status">
        <span>Filas</span>
        <strong>{data.length}</strong>
      </div>
    </>
  );
}

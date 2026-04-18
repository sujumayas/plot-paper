"use client";

import type { RefObject } from "react";
import { useRef } from "react";
import { CSVPanel } from "./CSVPanel";
import {
  IconClose,
  IconDownload,
  IconFile,
  IconImage,
  IconJson,
  IconUpload,
} from "@/components/icons";
import { Button } from "@/components/ui/Button";
import { exportJSON, exportPDF, exportPNG, exportSVG } from "@/lib/export";
import type { VizCatalogEntry, VizRow } from "@/lib/viz/types";

type Props = {
  open: boolean;
  viz: VizCatalogEntry;
  data: VizRow[];
  title: string;
  svgRef: RefObject<SVGSVGElement | null>;
  onData: (rows: VizRow[]) => void;
  onImportJSON: (payload: {
    title?: string;
    vizId?: string;
    data?: VizRow[];
  }) => void;
  onClose: () => void;
  toast: (msg: string) => void;
};

export function DataExportModal({
  open,
  viz,
  data,
  title,
  svgRef,
  onData,
  onImportJSON,
  onClose,
  toast,
}: Props) {
  const jsonInputRef = useRef<HTMLInputElement>(null);

  if (!open) return null;

  const fileBase = (title || viz.id).toLowerCase().replace(/[^a-z0-9]+/g, "-");

  const handleJSONFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const parsed = JSON.parse(String(e.target?.result ?? ""));
        onImportJSON({
          title: typeof parsed.title === "string" ? parsed.title : undefined,
          vizId:
            typeof parsed.vizId === "string"
              ? parsed.vizId
              : typeof parsed.vizSlug === "string"
                ? parsed.vizSlug
                : undefined,
          data: Array.isArray(parsed.data) ? parsed.data : undefined,
        });
        toast(`Imported JSON from ${file.name}`);
      } catch {
        toast("Could not parse JSON file");
      }
    };
    reader.readAsText(file);
  };

  return (
    <div
      className="modal-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="modal"
        style={{ maxWidth: 560 }}
        role="dialog"
        aria-modal="true"
      >
        <div className="modal-head">
          <div>
            <span className="pill">Data &amp; export</span>
            <h2 style={{ marginTop: 10 }}>Bring data in, send graph out.</h2>
            <p>
              Download a CSV template that matches this viz, drop the filled
              file back, and export your graph in any format.
            </p>
          </div>
          <button className="close-x" onClick={onClose} aria-label="Close">
            <IconClose />
          </button>
        </div>
        <div className="modal-body" style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <section>
            <div
              className="mono small"
              style={{ letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: 8 }}
            >
              1. Data
            </div>
            <CSVPanel viz={viz} data={data} onData={onData} toast={toast} />
          </section>

          <section>
            <div
              className="mono small"
              style={{ letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: 8 }}
            >
              2. Export image
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 6 }}>
              <Button
                size="sm"
                onClick={() => svgRef.current && exportPNG(svgRef.current, `${fileBase}.png`)}
              >
                <IconImage /> PNG
              </Button>
              <Button
                size="sm"
                onClick={() => svgRef.current && exportSVG(svgRef.current, `${fileBase}.svg`)}
              >
                <IconFile /> SVG
              </Button>
              <Button
                size="sm"
                onClick={() => svgRef.current && exportPDF(svgRef.current, `${fileBase}.pdf`, title)}
              >
                <IconFile /> PDF
              </Button>
            </div>
          </section>

          <section>
            <div
              className="mono small"
              style={{ letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: 8 }}
            >
              3. Data portability (JSON)
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
              <Button size="sm" onClick={() => jsonInputRef.current?.click()}>
                <IconUpload /> Import JSON
              </Button>
              <Button
                size="sm"
                onClick={() =>
                  exportJSON(`${fileBase}.json`, {
                    title,
                    vizId: viz.id,
                    columns: viz.columns,
                    data,
                    exportedAt: new Date().toISOString(),
                  })
                }
              >
                <IconJson /> Export JSON
              </Button>
            </div>
            <input
              ref={jsonInputRef}
              type="file"
              hidden
              accept=".json,application/json"
              onChange={(e) =>
                e.target.files?.[0] && handleJSONFile(e.target.files[0])
              }
            />
          </section>
        </div>
        <div className="modal-foot">
          <span className="small">
            {viz.columns.map((c) => `${c.name}:${c.type}`).join("  ")}
          </span>
          <Button variant="primary" onClick={onClose}>
            <IconDownload /> Done
          </Button>
        </div>
      </div>
    </div>
  );
}

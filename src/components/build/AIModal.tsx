"use client";

import { useEffect, useRef, useState } from "react";
import { IconClose, IconImage, IconSparkle } from "@/components/icons";
import { Button } from "@/components/ui/Button";
import { generateVizType, uploadReferenceImage } from "@/lib/ai/generateVizType";
import type { VizCatalogEntry } from "@/lib/viz/types";

type Props = {
  open: boolean;
  userId: string | null;
  onClose: () => void;
  onGenerated: (viz: VizCatalogEntry) => void;
  toast: (msg: string) => void;
};

const SUGGESTIONS = [
  "Matriz de burbujas con categorías anidadas",
  "Gráfico escalonado con marcadores de hitos",
  "Radar de desempeño por equipo vs benchmark",
  "Tabla de posiciones de ventas YTD",
  "Gantt trimestral de lanzamientos con dependencias",
];

const STATUS_MESSAGES = [
  "Interpretando tu intención…",
  "Revisando la referencia…",
  "Eligiendo el renderizador base…",
  "Diseñando el esquema de columnas…",
  "Generando filas de muestra…",
  "Afinando los detalles…",
];

export function AIModal({
  open,
  userId,
  onClose,
  onGenerated,
  toast,
}: Props) {
  const [prompt, setPrompt] = useState("");
  const [refFile, setRefFile] = useState<File | null>(null);
  const [refPreview, setRefPreview] = useState<string | null>(null);
  const [thinking, setThinking] = useState(false);
  const [statusIdx, setStatusIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!thinking) return;
    const id = setInterval(() => {
      setStatusIdx((i) => (i + 1) % STATUS_MESSAGES.length);
    }, 520);
    return () => clearInterval(id);
  }, [thinking]);

  useEffect(() => {
    if (!open) {
      setPrompt("");
      setRefFile(null);
      setRefPreview(null);
      setThinking(false);
      setStatusIdx(0);
    }
  }, [open]);

  if (!open) return null;

  const handleFile = (file: File) => {
    setRefFile(file);
    const reader = new FileReader();
    reader.onload = (e) => setRefPreview(String(e.target?.result ?? ""));
    reader.readAsDataURL(file);
  };

  const doGenerate = async () => {
    if (!prompt.trim()) return;
    if (!userId) {
      toast("Inicia sesión para generar");
      return;
    }
    setThinking(true);
    let referenceImageUrl: string | undefined;
    if (refFile) {
      const uploaded = await uploadReferenceImage(refFile, userId);
      if (uploaded) referenceImageUrl = uploaded;
    }
    const res = await generateVizType({ prompt, referenceImageUrl });
    setThinking(false);
    if (!res.ok) {
      toast(`IA: ${res.error}`);
      return;
    }
    toast(`Agregado "${res.viz.name}"`);
    onGenerated(res.viz);
    onClose();
  };

  return (
    <div
      className="modal-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget && !thinking) onClose();
      }}
    >
      <div
        className="modal"
        style={{ maxWidth: 620 }}
        role="dialog"
        aria-modal="true"
      >
        <div className="modal-head">
          <div>
            <span className="pill accent">IA · Beta</span>
            <h2 style={{ marginTop: 10 }}>Describe el gráfico que quieres.</h2>
            <p>
              Claude elige un renderizador base, infiere las columnas y deja
              listas filas de muestra para empezar.
            </p>
          </div>
          <button
            className="close-x"
            onClick={onClose}
            aria-label="Cerrar"
            disabled={thinking}
          >
            <IconClose />
          </button>
        </div>
        <div className="modal-body">
          {thinking ? (
            <div className="thinking">
              <div
                style={{
                  fontFamily: "var(--display)",
                  fontSize: 22,
                  letterSpacing: "-0.4px",
                  color: "var(--ibk-blue)",
                }}
              >
                Generando…
              </div>
              <div className="thinking-bar">
                <span />
              </div>
              <div className="think-log">{STATUS_MESSAGES[statusIdx]}</div>
            </div>
          ) : (
            <div className="ai-form">
              <div className="field">
                <label htmlFor="ai-prompt">Prompt</label>
                <textarea
                  id="ai-prompt"
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="ej: Heatmap mensual de churn por tipo de plan"
                />
              </div>

              <div className="ai-suggestions">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setPrompt(s)}
                  >
                    {s}
                  </button>
                ))}
              </div>

              <div className="field">
                <label>Imagen de referencia (opcional)</label>
                <div
                  className={`ref-dropzone ${refPreview ? "has-file" : ""}`}
                  onClick={() => !refPreview && inputRef.current?.click()}
                >
                  {refPreview ? (
                    <>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={refPreview} alt="referencia" />
                      <button
                        type="button"
                        className="rm"
                        onClick={(e) => {
                          e.stopPropagation();
                          setRefFile(null);
                          setRefPreview(null);
                        }}
                      >
                        Quitar
                      </button>
                    </>
                  ) : (
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 10,
                      }}
                    >
                      <IconImage /> Arrastra un screenshot o haz clic para subirlo
                    </div>
                  )}
                </div>
                <input
                  ref={inputRef}
                  type="file"
                  hidden
                  accept="image/*"
                  onChange={(e) =>
                    e.target.files?.[0] && handleFile(e.target.files[0])
                  }
                />
              </div>
            </div>
          )}
        </div>
        <div className="modal-foot">
          <span className="small mono">
            Modelo: claude-opus-4-7
          </span>
          <div style={{ display: "flex", gap: 8 }}>
            <Button onClick={onClose} disabled={thinking}>
              Cancelar
            </Button>
            <Button
              variant="primary"
              onClick={doGenerate}
              disabled={thinking || !prompt.trim()}
            >
              <IconSparkle /> Generar
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

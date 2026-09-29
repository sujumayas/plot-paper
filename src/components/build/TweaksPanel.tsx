"use client";

import { useState } from "react";
import { IconClose } from "@/components/icons";
import { ACCENT_SWATCHES, type Tweaks } from "@/lib/tweaks";

type Props = {
  tweaks: Tweaks;
  onChange: (next: Partial<Tweaks>) => void;
};

export function TweaksPanel({ tweaks, onChange }: Props) {
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <button
        type="button"
        className="btn primary tweaks-trigger"
        onClick={() => setOpen(true)}
        aria-label="Abrir panel de ajustes"
      >
        Ajustes
      </button>
    );
  }

  return (
    <div className="tweaks" role="dialog" aria-label="Ajustes del gráfico">
      <div className="tweaks-head">
        <span>Ajustes</span>
        <button onClick={() => setOpen(false)} aria-label="Cerrar ajustes">
          <IconClose />
        </button>
      </div>
      <div className="tweaks-body">
        <div className="tweak-row">
          <label>Color de acento</label>
          <div className="swatches">
            {ACCENT_SWATCHES.map((s) => (
              <button
                key={s.value}
                title={s.name}
                className={tweaks.accent === s.value ? "on" : ""}
                style={{ background: s.value }}
                onClick={() => onChange({ accent: s.value })}
                aria-label={`Usar acento ${s.name}`}
              />
            ))}
          </div>
        </div>
        <div className="tweak-row">
          <label>Cuadrícula</label>
          <div className="seg">
            <button
              className={tweaks.grid ? "on" : ""}
              onClick={() => onChange({ grid: true })}
            >
              Sí
            </button>
            <button
              className={!tweaks.grid ? "on" : ""}
              onClick={() => onChange({ grid: false })}
            >
              No
            </button>
          </div>
        </div>
        <div className="tweak-row">
          <label>Etiquetas de valor</label>
          <div className="seg">
            <button
              className={tweaks.labels ? "on" : ""}
              onClick={() => onChange({ labels: true })}
            >
              Sí
            </button>
            <button
              className={!tweaks.labels ? "on" : ""}
              onClick={() => onChange({ labels: false })}
            >
              No
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

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
        className="btn tweaks-trigger"
        onClick={() => setOpen(true)}
        aria-label="Open tweaks panel"
      >
        Tweaks
      </button>
    );
  }

  return (
    <div className="tweaks" role="dialog" aria-label="Tweaks">
      <div className="tweaks-head">
        <span>Tweaks</span>
        <button onClick={() => setOpen(false)} aria-label="Close tweaks">
          <IconClose />
        </button>
      </div>
      <div className="tweaks-body">
        <div className="tweak-row">
          <label>Accent</label>
          <div className="swatches">
            {ACCENT_SWATCHES.map((s) => (
              <button
                key={s.value}
                title={s.name}
                className={tweaks.accent === s.value ? "on" : ""}
                style={{ background: s.value }}
                onClick={() => onChange({ accent: s.value })}
                aria-label={`Set accent to ${s.name}`}
              />
            ))}
          </div>
        </div>
        <div className="tweak-row">
          <label>Gridlines</label>
          <div className="seg">
            <button
              className={tweaks.grid ? "on" : ""}
              onClick={() => onChange({ grid: true })}
            >
              on
            </button>
            <button
              className={!tweaks.grid ? "on" : ""}
              onClick={() => onChange({ grid: false })}
            >
              off
            </button>
          </div>
        </div>
        <div className="tweak-row">
          <label>Value labels</label>
          <div className="seg">
            <button
              className={tweaks.labels ? "on" : ""}
              onClick={() => onChange({ labels: true })}
            >
              on
            </button>
            <button
              className={!tweaks.labels ? "on" : ""}
              onClick={() => onChange({ labels: false })}
            >
              off
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

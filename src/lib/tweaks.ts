"use client";

import { useEffect, useRef, useState } from "react";

export type Tweaks = {
  accent: string;
  grid: boolean;
  labels: boolean;
};

const DEFAULT: Tweaks = {
  accent: "oklch(64% 0.16 48)",
  grid: true,
  labels: true,
};

const KEY = "pp-tweaks";

export const ACCENT_SWATCHES: { name: string; value: string }[] = [
  { name: "Warm", value: "oklch(64% 0.16 48)" },
  { name: "Cool", value: "oklch(64% 0.16 240)" },
  { name: "Fern", value: "oklch(64% 0.16 150)" },
  { name: "Plum", value: "oklch(64% 0.16 340)" },
  { name: "Ochre", value: "oklch(64% 0.16 80)" },
];

export function useTweaks(): [Tweaks, (next: Partial<Tweaks>) => void] {
  const [tweaks, setTweaks] = useState<Tweaks>(DEFAULT);
  const hydrated = useRef(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        setTweaks({ ...DEFAULT, ...parsed });
      }
    } catch {
      /* ignore */
    }
    hydrated.current = true;
  }, []);

  useEffect(() => {
    if (!hydrated.current) return;
    try {
      localStorage.setItem(KEY, JSON.stringify(tweaks));
    } catch {
      /* ignore */
    }
  }, [tweaks]);

  const update = (next: Partial<Tweaks>) =>
    setTweaks((cur) => ({ ...cur, ...next }));

  return [tweaks, update];
}

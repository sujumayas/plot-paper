"use client";

import { useEffect, useRef, useState } from "react";

export type Tweaks = {
  accent: string;
  grid: boolean;
  labels: boolean;
};

const DEFAULT: Tweaks = {
  accent: "#05BE50",
  grid: true,
  labels: true,
};

const KEY = "pp-tweaks";

export const ACCENT_SWATCHES: { name: string; value: string }[] = [
  { name: "Verde IBK", value: "#05BE50" },
  { name: "Azul IBK", value: "#0039A6" },
  { name: "Azul cielo", value: "#64B4E6" },
  { name: "Ámbar", value: "#FFB406" },
  { name: "Rojo", value: "#EB0046" },
  { name: "Mint", value: "#CDF2DC" },
];

export function useTweaks(): [Tweaks, (next: Partial<Tweaks>) => void] {
  const [tweaks, setTweaks] = useState<Tweaks>(DEFAULT);
  const hydrated = useRef(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        // Migrate old oklch swatches to IBK default.
        const accent =
          typeof parsed.accent === "string" && !parsed.accent.startsWith("oklch")
            ? parsed.accent
            : DEFAULT.accent;
        setTweaks({ ...DEFAULT, ...parsed, accent });
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

"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { BUILTIN_CHARTS, getBuiltinChart } from "./viz/charts";
import { specToDefinition } from "./viz/spec/render";
import type { CustomType, PlotSpec } from "./viz/spec/types";
import { validateSpec } from "./viz/spec/validate";
import type { ChartDefinition } from "./viz/types";
import { KEYS, readJSON, writeJSON } from "./storage";

export const CUSTOM_PREFIX = "custom:";

export function newId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID().slice(0, 12);
  return Math.random().toString(36).slice(2, 14);
}

export function loadCustomTypes(): CustomType[] {
  const list = readJSON<unknown>(KEYS.customTypes, []);
  if (!Array.isArray(list)) return [];
  return list
    .map((t) => {
      if (!t || typeof t !== "object") return null;
      const ct = t as CustomType;
      const v = validateSpec(ct.spec);
      return v.spec && typeof ct.id === "string" ? { ...ct, spec: v.spec } : null;
    })
    .filter((t): t is CustomType => t !== null);
}

export function saveCustomTypes(list: CustomType[]): boolean {
  return writeJSON(KEYS.customTypes, list);
}

export function customDefinition(t: CustomType): ChartDefinition {
  return specToDefinition(t.spec, CUSTOM_PREFIX + t.id);
}

/** Built-in + custom chart types, kept in sync across tabs. */
export function useChartRegistry() {
  const [custom, setCustom] = useState<CustomType[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setCustom(loadCustomTypes());
    setLoaded(true);
    const onStorage = (e: StorageEvent) => {
      if (e.key === KEYS.customTypes) setCustom(loadCustomTypes());
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const customDefs = useMemo(() => custom.map(customDefinition), [custom]);
  const all = useMemo(() => [...customDefs, ...BUILTIN_CHARTS], [customDefs]);

  const get = useCallback(
    (id: string): ChartDefinition | undefined => getBuiltinChart(id) ?? customDefs.find((d) => d.id === id),
    [customDefs],
  );

  const upsert = useCallback((spec: PlotSpec, meta: Partial<CustomType> = {}): CustomType => {
    const now = new Date().toISOString();
    const current = loadCustomTypes();
    const existing = meta.id ? current.find((t) => t.id === meta.id) : undefined;
    const item: CustomType = existing
      ? { ...existing, ...meta, spec, updatedAt: now }
      : { id: meta.id ?? newId(), spec, createdAt: now, updatedAt: now, origin: meta.origin, prompt: meta.prompt };
    const next = existing ? current.map((t) => (t.id === item.id ? item : t)) : [item, ...current];
    saveCustomTypes(next);
    setCustom(next);
    return item;
  }, []);

  const remove = useCallback((id: string) => {
    const next = loadCustomTypes().filter((t) => t.id !== id);
    saveCustomTypes(next);
    setCustom(next);
  }, []);

  return { all, builtin: BUILTIN_CHARTS, custom, customDefs, get, upsert, remove, loaded };
}

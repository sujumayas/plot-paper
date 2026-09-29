import { groupRows, parseNumber, topN, type Aggregate } from "../data";
import { mixHex } from "../scale";
import type { OptionDef, RenderContext } from "../types";

export const sortOption = (def: "none" | "desc" | "asc" = "none"): OptionDef => ({
  key: "sort",
  label: { en: "Sort", es: "Orden" },
  type: "select",
  default: def,
  choices: [
    { value: "none", label: { en: "As in data", es: "Como en los datos" } },
    { value: "desc", label: { en: "Largest first", es: "Mayor primero" } },
    { value: "asc", label: { en: "Smallest first", es: "Menor primero" } },
    { value: "alpha", label: { en: "A → Z", es: "A → Z" } },
  ],
});

export const aggregateOption: OptionDef = {
  key: "aggregate",
  label: { en: "Combine duplicates", es: "Combinar duplicados" },
  type: "select",
  default: "sum",
  help: { en: "How rows with the same label are combined", es: "Cómo se combinan filas con la misma etiqueta" },
  choices: [
    { value: "sum", label: { en: "Sum", es: "Suma" } },
    { value: "mean", label: { en: "Average", es: "Promedio" } },
    { value: "max", label: { en: "Maximum", es: "Máximo" } },
    { value: "min", label: { en: "Minimum", es: "Mínimo" } },
    { value: "count", label: { en: "Count rows", es: "Contar filas" } },
    { value: "first", label: { en: "First value", es: "Primer valor" } },
  ],
};

export const maxItemsOption = (def = 30, max = 100): OptionDef => ({
  key: "maxItems",
  label: { en: "Max items", es: "Máx. elementos" },
  type: "number",
  default: def,
  min: 2,
  max,
  step: 1,
  help: { en: "Smaller items are grouped as “Other”", es: "Los menores se agrupan como “Otros”" },
});

export const highlightOption: OptionDef = {
  key: "highlight",
  label: { en: "Highlight", es: "Resaltar" },
  type: "select",
  default: "none",
  choices: [
    { value: "none", label: { en: "Nothing", es: "Nada" } },
    { value: "max", label: { en: "Largest", es: "El mayor" } },
    { value: "min", label: { en: "Smallest", es: "El menor" } },
    { value: "last", label: { en: "Last", es: "El último" } },
    { value: "first", label: { en: "First", es: "El primero" } },
  ],
};

export const colorByOption: OptionDef = {
  key: "colorBy",
  label: { en: "Colors", es: "Colores" },
  type: "select",
  default: "single",
  choices: [
    { value: "single", label: { en: "One color", es: "Un color" } },
    { value: "category", label: { en: "One per item", es: "Uno por elemento" } },
    { value: "sign", label: { en: "Positive / negative", es: "Positivo / negativo" } },
  ],
};

export const curveOption: OptionDef = {
  key: "curve",
  label: { en: "Line shape", es: "Forma de línea" },
  type: "select",
  default: "smooth",
  choices: [
    { value: "smooth", label: { en: "Smooth", es: "Suave" } },
    { value: "linear", label: { en: "Straight", es: "Recta" } },
    { value: "step", label: { en: "Steps", es: "Escalones" } },
  ],
};

export type CatItem = { label: string; values: number[]; count: number };

/** Label/value(s) rows → aggregated, sorted, top-N items. */
export function categoryItems(
  c: RenderContext,
  labelKey: string,
  valueCols: string[],
  opts: { sortDefault?: string; maxDefault?: number; otherLabel?: string } = {},
): CatItem[] {
  const how = c.opt("aggregate", "sum") as Aggregate;
  const labelCol = c.col(labelKey);
  let items = groupRows(
    c.rows,
    (r) => {
      const v = labelCol ? r[labelCol] : undefined;
      return v === null || v === undefined || String(v).trim() === "" ? c.words.blank : String(v);
    },
    valueCols.map((col) => (r) => parseNumber(r[col])),
    how,
  );
  const sort = c.opt("sort", opts.sortDefault ?? "none");
  const total = (it: CatItem) => it.values.reduce((a, b) => a + b, 0);
  if (sort === "desc") items.sort((a, b) => total(b) - total(a));
  else if (sort === "asc") items.sort((a, b) => total(a) - total(b));
  else if (sort === "alpha") items.sort((a, b) => a.label.localeCompare(b.label, undefined, { numeric: true }));
  const max = c.opt("maxItems", opts.maxDefault ?? 0);
  if (max > 0 && items.length > max) {
    const other = opts.otherLabel ?? c.words.other;
    items = topN(items, max, other);
    if (sort === "desc") items.sort((a, b) => (a.label === other ? 1 : b.label === other ? -1 : total(b) - total(a)));
    else if (sort === "asc") items.sort((a, b) => (a.label === other ? 1 : b.label === other ? -1 : total(a) - total(b)));
  }
  return items;
}

/** A dimmed version of a color, used for non-highlighted marks. */
export function dim(c: RenderContext, color: string, amount = 0.72): string {
  const bg = c.theme.background === "transparent" ? (c.theme.dark ? "#000000" : "#FFFFFF") : c.theme.background;
  return /^#/.test(color) && /^#/.test(bg) ? mixHex(color, bg, amount) : color;
}

export function highlightIndex(values: number[], mode: string): number {
  if (!values.length || mode === "none") return -1;
  if (mode === "first") return 0;
  if (mode === "last") return values.length - 1;
  let idx = 0;
  values.forEach((v, i) => {
    if (mode === "max" ? v > values[idx] : v < values[idx]) idx = i;
  });
  return idx;
}

/** Color for mark `i` according to highlight / colorBy options. */
export function markColor(c: RenderContext, i: number, value: number, hi: number): string {
  const by = c.opt("colorBy", "single");
  let color = by === "category" ? c.color(i) : by === "sign" ? (value < 0 ? c.theme.negative : c.theme.positive) : c.color(0);
  if (hi >= 0 && i !== hi) color = dim(c, color);
  return color;
}

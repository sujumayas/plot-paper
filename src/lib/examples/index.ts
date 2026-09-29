import { coerceRows, inferColumns } from "../viz/data";
import { defaultStyle, SIZE_PRESETS } from "../viz/themes";
import type { ChartDoc } from "../viz/types";
import type { RawExample } from "./types";

export type { RawExample } from "./types";

export interface Example {
  id: string;
  doc: ChartDoc;
  description: string;
  tags: string[];
  author: string;
  sourceUrl: string;
  lang: "en" | "es";
}

/** Converts an example file into an editable chart document. */
export function exampleToDoc(raw: RawExample): ChartDoc {
  const columns = inferColumns(raw.rows, raw.columns);
  const size = SIZE_PRESETS.find((s) => s.id === raw.style?.size) ?? SIZE_PRESETS[0];
  const style = defaultStyle({
    theme: raw.style?.theme ?? "clean",
    palette: raw.style?.palette ?? null,
    size: size.id,
    width: size.width,
    height: size.height,
  });
  // Spanish examples use Spanish separators (8,8 %), matching their titles.
  if ((raw.tags ?? []).includes("es")) style.number = { ...style.number, locale: "es-ES" };
  return {
    version: 1,
    chartType: raw.chartType,
    title: raw.title ?? "",
    subtitle: raw.subtitle ?? "",
    source: raw.source ?? "",
    note: raw.note ?? "",
    columns,
    data: coerceRows(raw.rows, columns),
    mapping: raw.mapping ?? {},
    options: raw.options ?? {},
    style,
  };
}

export function toExample(raw: RawExample): Example {
  return {
    id: raw.id,
    doc: exampleToDoc(raw),
    description: raw.description ?? "",
    tags: raw.tags ?? [],
    author: raw.author ?? "plotpaper",
    sourceUrl: raw.sourceUrl ?? "",
    lang: (raw.tags ?? []).includes("es") ? "es" : "en",
  };
}

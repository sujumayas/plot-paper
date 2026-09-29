import type { DataRow, Mapping, OptionValues } from "../viz/types";

/** The on-disk format of src/lib/examples/datasets/*.json. */
export interface RawExample {
  id: string;
  chartType: string;
  title: string;
  subtitle: string;
  source: string;
  sourceUrl?: string;
  note?: string;
  description: string;
  tags: string[];
  author: string;
  columns: string[];
  rows: DataRow[];
  mapping: Mapping;
  options?: OptionValues;
  style?: { theme?: string; palette?: string | null; size?: string };
}

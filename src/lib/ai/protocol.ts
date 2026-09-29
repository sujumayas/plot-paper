/** Request/response shapes shared by the AI API routes and the browser client. */
import type { PlotSpec } from "../viz/spec/types";
import type { ColumnInfo, DataRow, Mapping, OptionValues } from "../viz/types";

export type AIStatus = {
  enabled: boolean;
  provider: "anthropic" | "mock" | "none";
  model: string | null;
  requiresAuth: boolean;
};

export type SuggestRequest = {
  prompt: string;
  columns: ColumnInfo[];
  rows: DataRow[];
  locale: "en" | "es";
};

export type ChartSuggestion = {
  chartType: string;
  mapping: Mapping;
  title: string;
  subtitle: string;
  options: OptionValues;
  reason: string;
};

export type SpecRequest = {
  prompt: string;
  /** The current spec when refining. */
  current?: PlotSpec | null;
  /** data:image/...;base64,... (max ~4 MB). */
  image?: string | null;
  locale: "en" | "es";
};

export type SpecResponse = { spec: PlotSpec; warnings: string[]; notes: string };

export type AIError = { error: string; code: "disabled" | "unauthenticated" | "rate_limited" | "bad_request" | "upstream" | "invalid_output" | "too_large" };

export const AI_LIMITS = {
  promptChars: 2000,
  imageBytes: 4 * 1024 * 1024,
  sampleRows: 30,
  columns: 60,
};

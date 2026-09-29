import { BUILTIN_CHARTS } from "@/lib/viz/charts";
import { validateSpec } from "@/lib/viz/spec/validate";
import type { PlotSpec } from "@/lib/viz/spec/types";
import type { ColumnInfo, DataRow, Mapping, OptionValues } from "@/lib/viz/types";
import { AI_LIMITS, type AIStatus, type ChartSuggestion, type SpecResponse } from "../protocol";
import type { AIConfig } from "./config";
import { AIError, type AIProvider, type ImageInput } from "./provider";
import { SPEC_SYSTEM, SUGGEST_SYSTEM } from "./prompts";
import { RateLimiter } from "./rateLimit";
import { SPEC_SCHEMA, SUGGEST_SCHEMA, aiOutputToSpec } from "./schemas";

export type Deps = {
  config: AIConfig;
  provider: AIProvider | null;
  /** Signed-in user id, or null. */
  getUserId: () => Promise<string | null>;
  limiter: RateLimiter;
  clientKey: string;
};

const MAX_BODY = 6 * 1024 * 1024;

function json(body: unknown, status = 200, headers: Record<string, string> = {}) {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json", "cache-control": "no-store", ...headers } });
}

function fail(err: AIError, headers: Record<string, string> = {}) {
  return json({ error: err.message, code: err.code }, err.status, headers);
}

export function statusFor(deps: Pick<Deps, "config" | "provider">): AIStatus {
  return {
    enabled: !!deps.provider,
    provider: deps.provider?.name ?? "none",
    model: deps.provider ? deps.provider.model : null,
    requiresAuth: deps.config.requireAuth,
  };
}

async function readBody(req: Request): Promise<Record<string, unknown>> {
  const len = Number(req.headers.get("content-length") ?? 0);
  if (len > MAX_BODY) throw new AIError("too_large", "Request is too large.", 413);
  const text = await req.text();
  if (text.length > MAX_BODY) throw new AIError("too_large", "Request is too large.", 413);
  try {
    const body = JSON.parse(text);
    if (!body || typeof body !== "object" || Array.isArray(body)) throw new Error();
    return body as Record<string, unknown>;
  } catch {
    throw new AIError("bad_request", "Body must be a JSON object.", 400);
  }
}

/** Shared gate: enabled, authenticated, rate-limited. */
async function gate(deps: Deps): Promise<AIProvider> {
  if (!deps.provider) throw new AIError("disabled", "AI is not configured on this server.", 503);
  let key = `ip:${deps.clientKey}`;
  if (deps.config.requireAuth) {
    const uid = await deps.getUserId();
    if (!uid) throw new AIError("unauthenticated", "Sign in to use AI features.", 401);
    key = `user:${uid}`;
  }
  const wait = deps.limiter.take(key);
  if (wait > 0) {
    const e = new AIError("rate_limited", `AI limit reached. Try again in ${Math.ceil(wait / 60)} min.`, 429);
    (e as AIError & { retryAfter?: number }).retryAfter = wait;
    throw e;
  }
  return deps.provider;
}

function sanitizePrompt(v: unknown): string {
  if (typeof v !== "string") return "";
  // Strip control characters; keep newlines.
  return v.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "").trim().slice(0, AI_LIMITS.promptChars);
}

export function parseImage(v: unknown): ImageInput | null {
  if (v === undefined || v === null || v === "") return null;
  if (typeof v !== "string") throw new AIError("bad_request", "image must be a data URL.", 400);
  const m = v.match(/^data:(image\/(?:png|jpeg|webp|gif));base64,([A-Za-z0-9+/=\s]+)$/);
  if (!m) throw new AIError("bad_request", "image must be a PNG, JPEG, WebP or GIF data URL.", 400);
  const data = m[2].replace(/\s/g, "");
  if ((data.length * 3) / 4 > AI_LIMITS.imageBytes) throw new AIError("too_large", "Image is larger than 4 MB.", 413);
  return { mediaType: m[1] as ImageInput["mediaType"], data };
}

/* ───────────────────────── Suggest ───────────────────────── */

export function normalizeSuggestion(raw: unknown, columns: ColumnInfo[]): ChartSuggestion {
  if (!raw || typeof raw !== "object") throw new AIError("invalid_output", "The AI answer had an unexpected shape.", 502);
  const o = raw as Record<string, unknown>;
  const def = BUILTIN_CHARTS.find((c) => c.id === o.chartType);
  if (!def) throw new AIError("invalid_output", `The AI picked an unknown chart type (${String(o.chartType)}).`, 502);
  const names = new Set(columns.map((c) => c.name));
  const mapping: Mapping = {};
  const entries = Array.isArray(o.mapping) ? o.mapping : o.mapping && typeof o.mapping === "object" ? Object.entries(o.mapping).map(([field, columns]) => ({ field, columns })) : [];
  for (const e of entries as { field?: unknown; columns?: unknown }[]) {
    const field = def.fields.find((f) => f.key === e?.field);
    if (!field) continue;
    const cols = (Array.isArray(e.columns) ? e.columns : [e.columns]).map(String).filter((c) => names.has(c));
    if (!cols.length) continue;
    mapping[field.key] = field.multiple ? cols : cols[0];
  }
  const options: OptionValues = {};
  const optEntries = Array.isArray(o.options) ? o.options : o.options && typeof o.options === "object" ? Object.entries(o.options).map(([key, value]) => ({ key, value })) : [];
  for (const e of optEntries as { key?: unknown; value?: unknown }[]) {
    const opt = def.options?.find((x) => x.key === e?.key);
    if (!opt) continue;
    const v = e.value;
    if (opt.type === "boolean" && typeof v === "boolean") options[opt.key] = v;
    else if (opt.type === "number" && typeof v === "number" && Number.isFinite(v)) options[opt.key] = Math.min(opt.max, Math.max(opt.min, v));
    else if (opt.type === "select" && typeof v === "string" && opt.choices.some((c) => c.value === v)) options[opt.key] = v;
    else if (opt.type === "text" && typeof v === "string") options[opt.key] = v.slice(0, 80);
  }
  const str = (v: unknown, n: number) => (typeof v === "string" ? v.trim().slice(0, n) : "");
  return { chartType: def.id, mapping, options, title: str(o.title, 120), subtitle: str(o.subtitle, 160), reason: str(o.reason, 300) };
}

export async function handleSuggest(req: Request, deps: Deps): Promise<Response> {
  try {
    const provider = await gate(deps);
    const body = await readBody(req);
    const prompt = sanitizePrompt(body.prompt);
    const columns: ColumnInfo[] = Array.isArray(body.columns)
      ? (body.columns as unknown[])
          .filter((c): c is ColumnInfo => !!c && typeof (c as ColumnInfo).name === "string")
          .slice(0, AI_LIMITS.columns)
          .map((c) => ({ name: c.name.slice(0, 80), type: c.type === "number" || c.type === "date" ? c.type : "string" }))
      : [];
    if (!columns.length) throw new AIError("bad_request", "columns are required.", 400);
    const rows: DataRow[] = Array.isArray(body.rows) ? (body.rows as DataRow[]).filter((r) => r && typeof r === "object").slice(0, AI_LIMITS.sampleRows) : [];
    const locale = body.locale === "es" ? "es" : "en";
    const text = [
      `What the person wants to show: ${prompt || "(nothing specific — pick the most insightful chart)"}`,
      `Language for title/subtitle: ${locale === "es" ? "Spanish" : "English"}`,
      `Columns: ${JSON.stringify(columns)}`,
      `Sample rows (first ${rows.length}): ${JSON.stringify(rows).slice(0, 12_000)}`,
    ].join("\n");
    const raw = await provider.json({ system: SUGGEST_SYSTEM, text, schema: SUGGEST_SCHEMA as unknown as Record<string, unknown>, task: "suggest", meta: { prompt, columns, rows, locale } });
    return json(normalizeSuggestion(raw, columns));
  } catch (err) {
    return errorResponse(err);
  }
}

/* ───────────────────────── Chart type (PlotSpec) ───────────────────────── */

export async function handleSpec(req: Request, deps: Deps): Promise<Response> {
  try {
    const provider = await gate(deps);
    const body = await readBody(req);
    const prompt = sanitizePrompt(body.prompt);
    if (!prompt) throw new AIError("bad_request", "Describe the chart you want.", 400);
    const image = parseImage(body.image);
    let current: PlotSpec | null = null;
    if (body.current) {
      const v = validateSpec(body.current);
      current = v.spec;
    }
    const locale = body.locale === "es" ? "es" : "en";
    const lang = `Write names, labels and sample text in ${locale === "es" ? "Spanish" : "English"}.`;
    const text = current
      ? `Modify this existing PlotSpec according to the request. Keep what isn't mentioned.\nRequest: ${prompt}\n${lang}\nCurrent spec:\n${JSON.stringify(current)}`
      : `Design a new chart type.\nRequest: ${prompt}\n${lang}${image ? "\nA reference image of a chart the person likes is attached; match its structure, not its exact colors." : ""}`;
    const meta = { prompt, current, locale };

    let raw = await provider.json({ system: SPEC_SYSTEM, text, image, schema: SPEC_SCHEMA as unknown as Record<string, unknown>, task: "spec", meta });
    let { spec, notes } = aiOutputToSpec((raw ?? {}) as Record<string, unknown>);
    let v = validateSpec(spec);
    if (!v.spec) {
      // One repair round: send the errors back.
      const repair = `This PlotSpec failed validation. Fix every error and return the corrected spec.\nErrors:\n- ${v.errors.slice(0, 20).join("\n- ")}\nSpec:\n${JSON.stringify(spec).slice(0, 20_000)}\nOriginal request: ${prompt}`;
      raw = await provider.json({ system: SPEC_SYSTEM, text: repair, schema: SPEC_SCHEMA as unknown as Record<string, unknown>, task: "spec", meta: { ...meta, current: null } });
      ({ spec, notes } = aiOutputToSpec((raw ?? {}) as Record<string, unknown>));
      v = validateSpec(spec);
    }
    if (!v.spec) throw new AIError("invalid_output", `The AI draft wasn't a valid chart: ${v.errors[0] ?? "unknown error"}`, 502);
    const res: SpecResponse = { spec: v.spec, warnings: v.warnings, notes: notes.slice(0, 500) };
    return json(res);
  } catch (err) {
    return errorResponse(err);
  }
}

function errorResponse(err: unknown): Response {
  if (err instanceof AIError) {
    const retry = (err as AIError & { retryAfter?: number }).retryAfter;
    return fail(err, retry ? { "retry-after": String(retry) } : {});
  }
  console.error("[ai] unexpected error", err);
  return fail(new AIError("upstream", "Unexpected server error.", 500));
}

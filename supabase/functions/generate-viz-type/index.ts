// deno-lint-ignore-file no-explicit-any
/**
 * Edge function: generate-viz-type
 * Given a prompt (+ optional reference image URL), asks Claude Opus 4.7 for a viz-type
 * specification matching one of 12 base renderers, then inserts it as a user-owned
 * private viz_type and adds it to saved_types.
 *
 * Deploy: `supabase functions deploy generate-viz-type`
 * Secret: `supabase secrets set ANTHROPIC_API_KEY=sk-ant-...`
 */

import Anthropic from "npm:@anthropic-ai/sdk@0.90.0";
import { createClient } from "jsr:@supabase/supabase-js@2";

const MODEL = "claude-opus-4-7";

const BASE_RENDERERS = [
  "bar",
  "hbar",
  "line",
  "multiline",
  "area",
  "pie",
  "donut",
  "scatter",
  "heatmap",
  "radar",
  "kpi",
  "timeline",
] as const;

const CATEGORIES = [
  "Comparison",
  "Trends",
  "Composition",
  "Relationships",
  "Distribution",
  "Headline",
  "Planning",
  "Custom",
] as const;

const SYSTEM_PROMPT = `You are a data visualization design assistant for a tool called Plotpaper.

Given a user prompt (and optional reference image), choose the best fit from these 12 base renderers and design a chart schema.

Base renderers and their expected CSV column contracts:
- bar: { category: string, value: number } — vertical bars, one value per category.
- hbar: { label: string, score: number } — horizontal bars, auto-sorted by score.
- line: { date: string, value: number } — single series over an ordered axis.
- multiline: { date: string, seriesA: number, seriesB: number, [more numeric series...] } — multiple numeric series sharing one x.
- area: { month: string, users: number, [more numeric series...] } — same shape as line but filled.
- pie: { slice: string, amount: number } — parts-of-a-whole.
- donut: { segment: string, share: number } — donut variant of pie.
- scatter: { x: number, y: number, size: number } — dots with optional size.
- heatmap: { row: string, column: string, value: number } — rectangular grid of cells.
- radar: { axis: string, series1: number, series2: number, [more numeric series...] } — multivariate profile.
- kpi: { metric: string, value: number, change_pct: number } — up to 3 big headline numbers.
- timeline: { task: string, start: number, end: number } — horizontal gantt bars.

Return ONLY a single JSON object, no prose, no code fences, exactly matching:

{
  "baseRendererId": "one of the 12 ids above",
  "name": "short human name, max 30 chars",
  "desc": "one sentence description, max 80 chars",
  "category": "Comparison | Trends | Composition | Relationships | Distribution | Headline | Planning | Custom",
  "columns": [ { "name": "...", "type": "string" | "number" } ],
  "sample": [ { ... at least 4 rows matching the columns ... } ]
}

Constraints:
- "columns" MUST match the base renderer's expected contract.
- "sample" must have rows whose keys match "columns" exactly.
- Numbers in "sample" must be real numbers, not strings.
- Do not invent new base renderers.
- Output JSON only. No markdown.`;

type ReqBody = {
  prompt: string;
  referenceImageUrl?: string;
};

type GeneratedSpec = {
  baseRendererId: (typeof BASE_RENDERERS)[number];
  name: string;
  desc: string;
  category: (typeof CATEGORIES)[number];
  columns: { name: string; type: "string" | "number" }[];
  sample: Record<string, unknown>[];
};

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, "content-type": "application/json" },
  });
}

function slugFor(name: string): string {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 32) || "custom";
  return `custom-${base}-${crypto.randomUUID().slice(0, 7)}`;
}

function validateSpec(x: unknown): GeneratedSpec | null {
  if (!x || typeof x !== "object") return null;
  const s = x as any;
  if (!BASE_RENDERERS.includes(s.baseRendererId)) return null;
  if (typeof s.name !== "string" || !s.name) return null;
  if (typeof s.desc !== "string") s.desc = "";
  if (!CATEGORIES.includes(s.category)) s.category = "Custom";
  if (!Array.isArray(s.columns) || s.columns.length === 0) return null;
  for (const c of s.columns) {
    if (!c || typeof c.name !== "string") return null;
    if (c.type !== "string" && c.type !== "number") return null;
  }
  if (!Array.isArray(s.sample)) return null;
  return s as GeneratedSpec;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST")
    return jsonResponse({ error: "method not allowed" }, 405);

  const authHeader = req.headers.get("Authorization") ?? "";
  if (!authHeader.startsWith("Bearer ")) {
    return jsonResponse({ error: "unauthenticated" }, 401);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const anthropicKey = Deno.env.get("ANTHROPIC_API_KEY");
  if (!supabaseUrl || !supabaseAnonKey || !anthropicKey) {
    return jsonResponse({ error: "server not configured" }, 500);
  }

  // Resolve user from JWT via user-scoped Supabase client.
  const userClient = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false },
  });
  const {
    data: { user },
    error: userErr,
  } = await userClient.auth.getUser();
  if (userErr || !user) {
    return jsonResponse({ error: "unauthenticated" }, 401);
  }

  let body: ReqBody;
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: "invalid JSON body" }, 400);
  }

  const prompt = (body.prompt ?? "").trim();
  if (!prompt) return jsonResponse({ error: "prompt required" }, 400);
  const referenceImageUrl = body.referenceImageUrl;

  const anthropic = new Anthropic({ apiKey: anthropicKey });

  const userContent: Array<
    | { type: "text"; text: string }
    | { type: "image"; source: { type: "url"; url: string } }
  > = [{ type: "text", text: prompt }];
  if (referenceImageUrl) {
    userContent.push({
      type: "image",
      source: { type: "url", url: referenceImageUrl },
    });
  }

  let rawText: string;
  try {
    const response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 2000,
      system: [
        {
          type: "text",
          text: SYSTEM_PROMPT,
          cache_control: { type: "ephemeral" } as any,
        },
      ],
      messages: [{ role: "user", content: userContent as any }],
    });
    const blocks = response.content ?? [];
    rawText = blocks
      .filter((b: any) => b.type === "text")
      .map((b: any) => b.text)
      .join("")
      .trim();
  } catch (err) {
    return jsonResponse(
      { error: "anthropic error", detail: String(err) },
      502,
    );
  }

  // Strip accidental code fences, then parse.
  const cleaned = rawText
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
  let parsed: unknown;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    return jsonResponse(
      { error: "model returned non-JSON", raw: rawText.slice(0, 500) },
      502,
    );
  }

  const spec = validateSpec(parsed);
  if (!spec) {
    return jsonResponse(
      { error: "spec did not match schema", raw: parsed },
      502,
    );
  }

  // Service-role insert so we can bypass RLS for the dependent saved_types row write.
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const admin = serviceRoleKey
    ? createClient(supabaseUrl, serviceRoleKey, {
        auth: { persistSession: false },
      })
    : userClient;

  const slug = slugFor(spec.name);
  const { data: inserted, error: insertErr } = await admin
    .from("viz_types")
    .insert({
      slug,
      name: spec.name.slice(0, 60),
      description: spec.desc.slice(0, 200),
      category: spec.category,
      base_renderer_id: spec.baseRendererId,
      columns: spec.columns,
      sample: spec.sample,
      owner_id: user.id,
      is_public: false,
      source_prompt: prompt,
      source_ref_url: referenceImageUrl ?? null,
    })
    .select("*")
    .single();

  if (insertErr || !inserted) {
    return jsonResponse(
      { error: "db insert failed", detail: insertErr?.message },
      500,
    );
  }

  await admin
    .from("saved_types")
    .insert({ user_id: user.id, viz_type_id: (inserted as any).id })
    .select();

  return jsonResponse({ vizType: inserted });
});

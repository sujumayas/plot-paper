import Anthropic from "@anthropic-ai/sdk";
import { describe, expect, it, vi } from "vitest";
import { readAIConfig, type AIConfig } from "@/lib/ai/server/config";
import { handleSpec, handleSuggest, parseImage, statusFor, type Deps } from "@/lib/ai/server/handlers";
import { createMockProvider, heuristicSuggestion, mockSpec, specToAIOutput } from "@/lib/ai/server/mock";
import { SPEC_SYSTEM, SUGGEST_SYSTEM } from "@/lib/ai/server/prompts";
import { createAnthropicProvider, extractJSON, type AnthropicLike } from "@/lib/ai/server/provider";
import { RateLimiter } from "@/lib/ai/server/rateLimit";
import { SPEC_SCHEMA, SUGGEST_SCHEMA, aiOutputToSpec } from "@/lib/ai/server/schemas";
import { SPEC_TEMPLATES } from "@/lib/viz/spec/templates";
import { validateSpec } from "@/lib/viz/spec/validate";

const config = (over: Partial<AIConfig> = {}): AIConfig => ({ ...readAIConfig({ ANTHROPIC_API_KEY: "sk-test" }), ...over });

const columns = [
  { name: "month", type: "string" as const },
  { name: "revenue", type: "number" as const },
  { name: "cost", type: "number" as const },
];
const rows = [
  { month: "Jan", revenue: 10, cost: 7 },
  { month: "Feb", revenue: 12, cost: 8 },
];

function post(body: unknown, headers: Record<string, string> = {}) {
  return new Request("http://x/api", { method: "POST", body: typeof body === "string" ? body : JSON.stringify(body), headers: { "content-type": "application/json", ...headers } });
}

function deps(over: Partial<Deps> = {}): Deps {
  return {
    config: config({ requireAuth: false }),
    provider: createMockProvider(),
    getUserId: async () => null,
    limiter: new RateLimiter(100),
    clientKey: "1.2.3.4",
    ...over,
  };
}

/** A fake Anthropic client whose messages.create returns queued responses. */
function fakeClient(responses: (object | Error)[]) {
  const calls: Record<string, unknown>[] = [];
  const create = vi.fn(async (params: Record<string, unknown>) => {
    calls.push(params);
    const next = responses.shift();
    if (!next) throw new Error("no more fake responses");
    if (next instanceof Error) throw next;
    return next;
  });
  const client = { messages: { create }, beta: { messages: { create } } } as unknown as AnthropicLike;
  return { client, calls, create };
}

const textMsg = (text: string, stop_reason = "end_turn") => ({ content: [{ type: "text", text }], stop_reason, usage: {} });
const validSpecOutput = () => JSON.stringify(specToAIOutput(SPEC_TEMPLATES[0].spec, "Here you go"));
const headers = new Headers();
const apiError = (message: string) => ({ type: "error", error: { type: "invalid_request_error", message } });

describe("config", () => {
  it("is disabled without a key, anthropic with one, mock on demand", () => {
    expect(readAIConfig({}).provider).toBe("none");
    expect(readAIConfig({ ANTHROPIC_API_KEY: "k" }).provider).toBe("anthropic");
    expect(readAIConfig({ AI_PROVIDER: "mock" }).provider).toBe("mock");
    expect(readAIConfig({ ANTHROPIC_API_KEY: "k", AI_PROVIDER: "none" }).provider).toBe("none");
    expect(readAIConfig({ AI_PROVIDER: "anthropic" }).provider).toBe("none");
  });

  it("has sane defaults and validates values", () => {
    const c = readAIConfig({ ANTHROPIC_API_KEY: "k", AI_EFFORT: "ludicrous", AI_MAX_TOKENS: "9999999", AI_RATE_LIMIT_PER_HOUR: "-3" });
    expect(c.model).toBe("claude-opus-5-5");
    expect(c.effort).toBe("medium");
    expect(c.maxTokens).toBe(64000);
    expect(c.rateLimitPerHour).toBe(20);
    expect(c.fallback).toBe(true);
    expect(readAIConfig({ AI_REQUIRE_AUTH: "true" }).requireAuth).toBe(true);
  });

  it("status reflects the provider", () => {
    expect(statusFor({ config: config(), provider: null })).toMatchObject({ enabled: false, provider: "none" });
    expect(statusFor({ config: config(), provider: createMockProvider() })).toMatchObject({ enabled: true, provider: "mock" });
  });
});

describe("schemas & prompts", () => {
  const everyObjectClosed = (s: unknown): boolean => {
    if (!s || typeof s !== "object") return true;
    const o = s as Record<string, unknown>;
    if (o.type === "object" && o.additionalProperties !== false) return false;
    return Object.values(o).every(everyObjectClosed);
  };
  it("sets additionalProperties:false on every object (structured outputs requirement)", () => {
    expect(everyObjectClosed(SPEC_SCHEMA)).toBe(true);
    expect(everyObjectClosed(SUGGEST_SCHEMA)).toBe(true);
  });

  it("prompts are static (cache-friendly) and describe the grammar", () => {
    expect(SPEC_SYSTEM).toContain("PlotSpec");
    expect(SPEC_SYSTEM).not.toMatch(/\d{4}-\d{2}-\d{2}T/);
    expect(SUGGEST_SYSTEM).toContain("hbar");
  });

  it("converts schema-shaped output back into a valid spec", () => {
    for (const t of SPEC_TEMPLATES) {
      const out = specToAIOutput(t.spec, "n");
      const { spec, notes } = aiOutputToSpec(JSON.parse(JSON.stringify(out)));
      expect(notes).toBe("n");
      expect(validateSpec(spec).errors, t.id).toEqual([]);
    }
  });

  it("extracts JSON from fenced or chatty answers", () => {
    expect(extractJSON('```json\n{"a":1}\n```')).toEqual({ a: 1 });
    expect(extractJSON('Sure! {"a":2} Hope it helps')).toEqual({ a: 2 });
    expect(() => extractJSON("no json here")).toThrow(/isn't JSON/);
  });
});

describe("mock provider", () => {
  it("suggests sensible charts", () => {
    expect(heuristicSuggestion({ prompt: "revenue trend over time", columns, rows, locale: "en" }).chartType).toMatch(/line/);
    expect(heuristicSuggestion({ prompt: "top products", columns, rows, locale: "en" }).chartType).toBe("hbar");
    expect(heuristicSuggestion({ prompt: "correlation between revenue and cost", columns, rows, locale: "en" }).chartType).toBe("scatter");
    expect(heuristicSuggestion({ prompt: "", columns: [{ name: "x", type: "number" }], rows: [], locale: "es" }).chartType).toBe("histogram");
  });

  it("picks templates and applies refinements", () => {
    expect(mockSpec({ prompt: "diverging gains and losses", current: null, locale: "en" }).spec.layers[0].filter).toBeDefined();
    const refined = mockSpec({ prompt: "make it rounded and horizontal with labels", current: SPEC_TEMPLATES[0].spec, locale: "en" });
    expect(refined.notes).toMatch(/rounded/);
    expect(validateSpec(refined.spec).errors).toEqual([]);
  });
});

describe("handleSuggest", () => {
  it("returns a normalized suggestion", async () => {
    const res = await handleSuggest(post({ prompt: "trend over time", columns, rows, locale: "en" }), deps());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.chartType).toMatch(/line/);
    expect(body.mapping.x).toBe("month");
    expect(res.headers.get("cache-control")).toBe("no-store");
  });

  it("strips mappings to unknown columns and invalid options", async () => {
    const provider = { name: "mock" as const, model: "m", json: async () => ({ chartType: "bar", mapping: [{ field: "label", columns: ["ghost"] }, { field: "value", columns: ["revenue"] }, { field: "nope", columns: ["cost"] }], title: "T", subtitle: "", options: [{ key: "sort", value: "sideways" }, { key: "maxItems", value: 10000 }, { key: "highlight", value: "max" }], reason: "" }) };
    const body = await (await handleSuggest(post({ prompt: "", columns, rows }), deps({ provider }))).json();
    expect(body.mapping).toEqual({ value: "revenue" });
    expect(body.options).toEqual({ maxItems: 100, highlight: "max" });
  });

  it("rejects unknown chart types from the model", async () => {
    const provider = { name: "mock" as const, model: "m", json: async () => ({ chartType: "sankey", mapping: [], title: "", subtitle: "", options: [], reason: "" }) };
    const res = await handleSuggest(post({ prompt: "", columns, rows }), deps({ provider }));
    expect(res.status).toBe(502);
    expect((await res.json()).code).toBe("invalid_output");
  });

  it.each([
    ["disabled", deps({ provider: null }), post({ columns }), 503, "disabled"],
    ["no columns", deps(), post({ prompt: "x" }), 400, "bad_request"],
    ["not JSON", deps(), post("{oops"), 400, "bad_request"],
    ["array body", deps(), post("[1,2]"), 400, "bad_request"],
    ["too large", deps(), post({ columns }, { "content-length": String(50 * 1024 * 1024) }), 413, "too_large"],
    ["auth required", deps({ config: config({ requireAuth: true }) }), post({ columns }), 401, "unauthenticated"],
  ])("fails cleanly: %s", async (_name, d, req, status, code) => {
    const res = await handleSuggest(req as Request, d as Deps);
    expect(res.status).toBe(status);
    const body = await res.json();
    expect(body.code).toBe(code);
    expect(typeof body.error).toBe("string");
  });

  it("allows signed-in users when auth is required", async () => {
    const res = await handleSuggest(post({ columns, rows }), deps({ config: config({ requireAuth: true }), getUserId: async () => "user-1" }));
    expect(res.status).toBe(200);
  });

  it("rate limits per client with Retry-After", async () => {
    const d = deps({ limiter: new RateLimiter(2) });
    expect((await handleSuggest(post({ columns, rows }), d)).status).toBe(200);
    expect((await handleSuggest(post({ columns, rows }), d)).status).toBe(200);
    const res = await handleSuggest(post({ columns, rows }), d);
    expect(res.status).toBe(429);
    expect(Number(res.headers.get("retry-after"))).toBeGreaterThan(0);
    // Another client is unaffected.
    expect((await handleSuggest(post({ columns, rows }), { ...d, clientKey: "5.6.7.8" })).status).toBe(200);
  });
});

describe("handleSpec", () => {
  it("generates a validated spec with the mock provider", async () => {
    const res = await handleSpec(post({ prompt: "bullet chart vs target", locale: "en" }), deps());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(validateSpec(body.spec).errors).toEqual([]);
    expect(body.notes).toMatch(/Demo mode/);
  });

  it("refines the current spec", async () => {
    const res = await handleSpec(post({ prompt: "rounded", current: SPEC_TEMPLATES[0].spec }), deps());
    const body = await res.json();
    expect(body.spec.layers[0].style.radius).toBe(10);
  });

  it("repairs an invalid first draft once", async () => {
    const bad = specToAIOutput(SPEC_TEMPLATES[0].spec, "");
    (bad.layers as unknown[]) = [{ mark: "bar", encoding: { x: { field: "ghost" } } }];
    const good = specToAIOutput(SPEC_TEMPLATES[0].spec, "fixed");
    const json = vi.fn().mockResolvedValueOnce(bad).mockResolvedValueOnce(good);
    const res = await handleSpec(post({ prompt: "x" }), deps({ provider: { name: "mock", model: "m", json } }));
    expect(res.status).toBe(200);
    expect(json).toHaveBeenCalledTimes(2);
    expect(json.mock.calls[1][0].text).toMatch(/failed validation/);
    expect((await res.json()).notes).toBe("fixed");
  });

  it("gives up after one failed repair", async () => {
    const json = vi.fn().mockResolvedValue({ name: "", fields: [], layers: [] });
    const res = await handleSpec(post({ prompt: "x" }), deps({ provider: { name: "mock", model: "m", json } }));
    expect(res.status).toBe(502);
    expect(json).toHaveBeenCalledTimes(2);
  });

  it("validates prompts and images", async () => {
    expect((await handleSpec(post({ prompt: "   " }), deps())).status).toBe(400);
    expect((await handleSpec(post({ prompt: "x", image: "http://evil/x.png" }), deps())).status).toBe(400);
    expect((await handleSpec(post({ prompt: "x", image: "data:image/svg+xml;base64,PHN2Zz4=" }), deps())).status).toBe(400);
    const big = "data:image/png;base64," + "A".repeat(6 * 1024 * 1024);
    expect((await handleSpec(post({ prompt: "x", image: big }), deps())).status).toBe(413);
    expect(parseImage("data:image/png;base64,iVBORw0KGgo=")).toEqual({ mediaType: "image/png", data: "iVBORw0KGgo=" });
  });

  it("strips control characters and truncates long prompts", async () => {
    const json = vi.fn().mockResolvedValue(specToAIOutput(SPEC_TEMPLATES[0].spec, ""));
    await handleSpec(post({ prompt: "a\u0000b\u0007c" + "x".repeat(5000) }), deps({ provider: { name: "mock", model: "m", json } }));
    const text: string = json.mock.calls[0][0].text;
    expect(text).toContain("abc");
    expect(text).not.toMatch(/[\u0000\u0007]/);
    expect(text.length).toBeLessThan(2600);
  });
});

describe("anthropic provider (fake client)", () => {
  const req = { system: "sys", text: "hello", schema: { type: "object" }, task: "spec" as const };

  it("sends model, effort, structured output, prompt caching and the refusal fallback", async () => {
    const { client, calls } = fakeClient([textMsg('{"ok":true}')]);
    const p = createAnthropicProvider(config(), client);
    expect(await p.json(req)).toEqual({ ok: true });
    const c = calls[0];
    expect(c.model).toBe("claude-opus-5-5");
    expect(c.output_config).toEqual({ effort: "medium", format: { type: "json_schema", schema: { type: "object" } } });
    expect(c.fallbacks).toBe("default");
    expect(c.betas).toEqual(["server-side-fallback-2026-07-01"]);
    expect((c.system as { cache_control: unknown }[])[0].cache_control).toEqual({ type: "ephemeral" });
    expect(c).not.toHaveProperty("thinking");
  });

  it("uses the stable endpoint without fallback when disabled, and passes images", async () => {
    const { client, calls } = fakeClient([textMsg("{}")]);
    await createAnthropicProvider(config({ fallback: false, model: "claude-sonnet-5-5" }), client).json({ ...req, image: { mediaType: "image/png", data: "AAAA" } });
    expect(calls[0]).not.toHaveProperty("fallbacks");
    expect(calls[0].model).toBe("claude-sonnet-5-5");
    const content = (calls[0].messages as { content: { type: string }[] }[])[0].content;
    expect(content[0]).toMatchObject({ type: "image", source: { type: "base64", media_type: "image/png" } });
  });

  it("maps refusals, truncation, empty and non-JSON answers", async () => {
    for (const [msg, pattern] of [
      [textMsg("", "refusal"), /declined/],
      [textMsg('{"a":', "max_tokens"), /cut off/],
      [textMsg("   "), /empty/],
      [textMsg("I cannot do JSON today"), /isn't JSON/],
    ] as const) {
      const { client } = fakeClient([msg]);
      await expect(createAnthropicProvider(config(), client).json(req)).rejects.toThrow(pattern);
    }
  });

  it("maps SDK errors to friendly codes", async () => {
    const cases: [Error, string, number][] = [
      [new Anthropic.AuthenticationError(401, {}, "bad key", headers), "upstream", 502],
      [new Anthropic.RateLimitError(429, {}, "slow down", headers), "rate_limited", 429],
      [new Anthropic.InternalServerError(500, {}, "boom", headers), "upstream", 502],
      [new Anthropic.APIConnectionTimeoutError(), "upstream", 504],
    ];
    for (const [err, code, status] of cases) {
      const { client } = fakeClient([err]);
      await expect(createAnthropicProvider(config(), client).json(req)).rejects.toMatchObject({ code, status });
    }
  });

  it("retries in plain-JSON mode when structured output is rejected", async () => {
    const { client, calls } = fakeClient([new Anthropic.BadRequestError(400, apiError("output_config.format.schema: unsupported keyword"), undefined, headers), textMsg('{"ok":1}')]);
    expect(await createAnthropicProvider(config(), client).json(req)).toEqual({ ok: 1 });
    expect(calls).toHaveLength(2);
    expect(calls[1].output_config).toEqual({ effort: "medium" });
    expect(((calls[1].system as { text: string }[])[0]).text).toMatch(/JSON schema/);
  });

  it("does not retry other bad requests", async () => {
    const { client, calls } = fakeClient([new Anthropic.BadRequestError(400, apiError("prompt is too long"), undefined, headers)]);
    await expect(createAnthropicProvider(config(), client).json(req)).rejects.toMatchObject({ code: "bad_request", message: "Claude couldn't process the request: prompt is too long" });
    expect(calls).toHaveLength(1);
  });

  it("works end-to-end through the spec handler", async () => {
    const { client } = fakeClient([textMsg("```json\n" + validSpecOutput() + "\n```")]);
    const res = await handleSpec(post({ prompt: "bullet" }), deps({ provider: createAnthropicProvider(config(), client) }));
    expect(res.status).toBe(200);
    expect((await res.json()).spec.name).toBe("Bullet chart");
  });

  it("surfaces upstream errors through the handler", async () => {
    const { client } = fakeClient([new Anthropic.RateLimitError(429, {}, "slow", headers)]);
    const res = await handleSuggest(post({ columns, rows }), deps({ provider: createAnthropicProvider(config(), client) }));
    expect(res.status).toBe(429);
    expect((await res.json()).code).toBe("rate_limited");
  });
});

describe("rate limiter", () => {
  it("uses a sliding window", () => {
    const l = new RateLimiter(2, 1000);
    expect(l.take("a", 0)).toBe(0);
    expect(l.take("a", 10)).toBe(0);
    expect(l.take("a", 20)).toBeGreaterThan(0);
    expect(l.take("a", 1001)).toBe(0);
    expect(new RateLimiter(0).take("a")).toBe(0);
  });
});

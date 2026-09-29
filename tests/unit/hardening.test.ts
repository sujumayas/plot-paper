/**
 * Regression tests for the production-hardening review: hostile documents,
 * ambiguous numbers, reserved column names, oversized payloads, AI limits.
 */
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { readAIConfig } from "@/lib/ai/server/config";
import { handleSpec, handleSuggest, type Deps } from "@/lib/ai/server/handlers";
import { createMockProvider, specToAIOutput } from "@/lib/ai/server/mock";
import { toAIError } from "@/lib/ai/server/provider";
import { RateLimiter } from "@/lib/ai/server/rateLimit";
import { decodeDoc, encodeDoc } from "@/lib/share";
import { barChart } from "@/lib/viz/charts/bars";
import {
  MAX_ROWS,
  SINGLE_COLUMN,
  dedupeHeaders,
  detectDelimiter,
  inferType,
  parseDate,
  parseDelimited,
  parseJSONRows,
  parseNumber,
  parseTextToTable,
} from "@/lib/viz/data";
import { docFromSample, renderPoster, sanitizeDoc } from "@/lib/viz/engine";
import { specToDefinition } from "@/lib/viz/spec/render";
import { SPEC_TEMPLATES } from "@/lib/viz/spec/templates";
import { validateSpec } from "@/lib/viz/spec/validate";
import type { ChartDoc } from "@/lib/viz/types";

describe("sanitizeDoc", () => {
  it("drops everything that isn't the right shape", () => {
    const hostile = {
      chartType: { evil: true },
      title: ["x"],
      subtitle: 12,
      data: [null, 5, "row", [1, 2], { a: 1, b: { nested: true }, c: [1], d: true, e: Infinity, f: "ok" }],
      columns: [null, { name: 5 }, { name: "a", type: "number" }, { name: "a", type: "string" }, { name: "f", type: "wat" }, { name: "__proto__", type: "string" }],
      mapping: { label: "f", value: ["a", 5, null], bad: { x: 1 }, __proto__: "polluted" },
      options: { sort: "desc", n: 5, flag: true, obj: { a: 1 }, arr: [1], nan: NaN },
      style: {
        theme: { toString: 1 },
        palette: 42,
        accent: "x".repeat(500),
        legend: "sideways",
        titleAlign: "justify",
        grid: "yes",
        width: "wide",
        fontScale: 99,
        number: { decimals: "lots", prefix: { a: 1 }, suffix: "%".repeat(50), locale: "not a locale!!", compact: "no" },
      },
    } as unknown as ChartDoc;
    const d = sanitizeDoc(hostile);
    expect(d.chartType).toBe("bar");
    expect(d.title).toBe("");
    expect(d.subtitle).toBe("12");
    expect(d.data).toEqual([{ a: 1, b: null, c: null, d: "true", e: null, f: "ok" }]);
    expect(d.columns).toEqual([
      { name: "a", type: "number" },
      { name: "f", type: "string" },
    ]);
    expect(d.mapping).toEqual({ label: "f", value: ["a"] });
    expect(d.options).toEqual({ sort: "desc", n: 5, flag: true });
    expect(d.style.theme).toBe("clean");
    expect(d.style.palette).toBeNull();
    expect(d.style.accent).toBeNull();
    expect(d.style.legend).toBe("top");
    expect(d.style.titleAlign).toBe("left");
    expect(d.style.grid).toBe(true);
    expect(d.style.width).toBe(1200);
    expect(d.style.fontScale).toBe(1.6);
    expect(d.style.number).toEqual({ decimals: null, compact: true, prefix: "", suffix: "%".repeat(12), locale: "en-US" });
    expect(Object.getPrototypeOf(d.mapping)).toBe(Object.prototype);
    // Renders without throwing.
    expect(() => renderToStaticMarkup(renderPoster(d, barChart, { uid: "h" }).element)).not.toThrow();
  });

  it("survives non-objects and caps rows", () => {
    for (const bad of [null, undefined, 5, "doc", [], { data: "x" }]) {
      const d = sanitizeDoc(bad as unknown as ChartDoc);
      expect(d.data).toEqual([]);
      expect(d.style.width).toBeGreaterThanOrEqual(320);
    }
    const many = sanitizeDoc({ data: Array.from({ length: MAX_ROWS + 10 }, (_, i) => ({ i })) } as unknown as ChartDoc);
    expect(many.data).toHaveLength(MAX_ROWS);
  });

  it("keeps valid documents intact", () => {
    const doc = docFromSample(barChart, { theme: "midnight", legend: "bottom", titleAlign: "center" });
    expect(sanitizeDoc(doc)).toEqual(doc);
  });
});

describe("parseNumber edge cases", () => {
  it.each([
    ["USD 1,200", 1200],
    ["1,200 USD", 1200],
    ["1200PEN", 1200],
    ["S/. 1.200,50", 1200.5],
    ["-$1,200", -1200],
    ["EUR -5", -5],
    ["1.", 1],
    [".5", 0.5],
    ["1,5e3", 1500],
    ["2.5e3", 2500],
  ])("%s → %s", (input, expected) => {
    expect(parseNumber(input)).toBe(expected);
  });

  it.each(["12abc", "12ABC", "ABC 12", "1.2.3", "12,34,5", "1,23,4.5", "12.345.6", "1..2", "1,,2", ",", "."])("%s is not a number", (input) => {
    expect(parseNumber(input)).toBeNull();
  });

  it("a column's decimal separator wins, but contradicting values still parse", () => {
    expect(parseNumber("1.234", ",")).toBe(1234);
    expect(parseNumber("1.234", ".")).toBe(1.234);
    expect(parseNumber("1,234.5", ",")).toBe(1234.5);
  });
});

describe("delimiters, headers and dates", () => {
  it("keeps single-column data with commas in one column", () => {
    expect(detectDelimiter("amount\n1,234\n2,345")).toBe(SINGLE_COLUMN);
    const t = parseTextToTable("amount\n1,234\n2,345");
    expect(t.columns.map((c) => c.name)).toEqual(["amount"]);
    expect(t.rows.map((r) => r.amount)).toEqual([1234, 2345]);
  });

  it("dedupes headers without collisions and renames reserved keys", () => {
    expect(dedupeHeaders(["a", "a", "a_2"])).toEqual(["a", "a_2", "a_2_2"]);
    expect(dedupeHeaders(["", "", "column_1"])).toEqual(["column_1", "column_2", "column_1_2"]);
    expect(dedupeHeaders(["__proto__", "constructor", "prototype"])).toEqual(["__proto___col", "constructor_col", "prototype_col"]);
    const t = parseDelimited("__proto__,x\n1,2");
    expect(t.headers).toEqual(["__proto___col", "x"]);
  });

  it("never pollutes prototypes from JSON input", () => {
    const parsed = parseJSONRows('[{"__proto__": {"polluted": 1}, "constructor": "Ferrari", "v": 1}]');
    expect(parsed?.columns.map((c) => c.name)).toEqual(["__proto___col", "constructor_col", "v"]);
    expect(({} as Record<string, unknown>).polluted).toBeUndefined();
    const cols = parseJSONRows('{"columns": ["a", "a", "__proto__"], "rows": [[1, 2, 3]]}');
    expect(cols?.columns.map((c) => c.name)).toEqual(["a", "a_2", "__proto___col"]);
  });

  it("understands dotted and day-first dates", () => {
    expect(inferType(["31.12.2024", "01.01.2025", "15.06.2025"])).toBe("date");
    expect(parseDate("31.12.2024")).toBe(Date.UTC(2024, 11, 31));
    expect(parseDate("31/12/2024")).toBe(Date.UTC(2024, 11, 31));
    expect(parseDate("12/31/2024")).toBe(Date.UTC(2024, 11, 31));
    expect(parseDate("05.03.24")).toBe(Date.UTC(2024, 2, 5));
    expect(parseDate("40/40/2024")).toBeNull();
    // A dotted number isn't a date.
    expect(inferType(["1.234.567", "2.345.678"])).toBe("number");
  });
});

describe("share link limits", () => {
  it("rejects payloads that decompress beyond the cap (zip bombs)", async () => {
    const doc = docFromSample(barChart);
    const bomb = { ...doc, note: "a".repeat(11 * 1024 * 1024) };
    const token = await encodeDoc(bomb);
    expect(token.length).toBeLessThan(60_000); // highly compressible
    expect(await decodeDoc(token)).toBeNull();
  });
});

describe("PlotSpec size encoding performance", () => {
  it("renders 20k sized points quickly (size max computed once)", () => {
    const bubbleSpec = validateSpec({
      name: "Bubbles",
      fields: [
        { key: "x", label: "X", type: "number" },
        { key: "y", label: "Y", type: "number" },
        { key: "s", label: "Size", type: "number" },
      ],
      layers: [{ mark: "point", encoding: { x: { field: "x", type: "linear" }, y: { field: "y", type: "linear" }, size: { field: "s" } } }],
      sample: { rows: [{ x: 1, y: 2, s: 3 }] },
    });
    expect(bubbleSpec.errors).toEqual([]);
    const def = specToDefinition(bubbleSpec.spec!, "custom:bubbles");
    const data = Array.from({ length: 20_000 }, (_, i) => ({ x: i, y: (i * 7919) % 1000, s: (i % 50) + 1 }));
    const doc = { ...docFromSample(def), data, columns: [{ name: "x", type: "number" as const }, { name: "y", type: "number" as const }, { name: "s", type: "number" as const }], mapping: { x: "x", y: "y", s: "s" } };
    const t0 = performance.now();
    const { element, issues } = renderPoster(doc, def, { uid: "p" });
    expect(issues).toEqual([]);
    const html = renderToStaticMarkup(element);
    expect(performance.now() - t0).toBeLessThan(5000);
    expect((html.match(/<circle/g) ?? []).length).toBeGreaterThan(19_000);
  });
});

describe("AI hardening", () => {
  const post = (body: unknown, init: RequestInit = {}) =>
    new Request("http://x/api", { method: "POST", body: typeof body === "string" ? body : JSON.stringify(body), headers: { "content-type": "application/json" }, ...init });
  const deps = (over: Partial<Deps> = {}): Deps => ({
    config: { ...readAIConfig({ AI_PROVIDER: "mock" }), requireAuth: false },
    provider: createMockProvider(),
    getUserId: async () => null,
    limiter: new RateLimiter(100),
    clientKey: "1.2.3.4",
    ...over,
  });

  it("reads env values forgivingly", () => {
    for (const v of ["1", "yes", "on", "TRUE", " true "]) expect(readAIConfig({ AI_REQUIRE_AUTH: v }).requireAuth).toBe(true);
    for (const v of ["0", "no", "false"]) expect(readAIConfig({ AI_REQUIRE_AUTH: v }).requireAuth).toBe(false);
    const empty = readAIConfig({ AI_RATE_LIMIT_PER_HOUR: "", AI_MAX_TOKENS: " ", AI_TIMEOUT_MS: "" });
    expect(empty.rateLimitPerHour).toBe(20);
    expect(empty.maxTokens).toBe(16000);
    expect(empty.timeoutMs).toBe(120_000);
    expect(readAIConfig({ AI_TIMEOUT_MS: "10" }).timeoutMs).toBe(5000);
    expect(readAIConfig({ AI_RATE_LIMIT_PER_HOUR: "0" }).rateLimitPerHour).toBe(0);
    expect(readAIConfig({ AI_REFUSAL_FALLBACK: "off" }).fallback).toBe(false);
  });

  it("doesn't leak internal error messages", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const e = toAIError(new Error("ECONNREFUSED 10.0.0.12:5432 password=hunter2"));
    expect(e.message).not.toMatch(/hunter2|10\.0\.0/);
    expect(e.status).toBe(500);
    spy.mockRestore();
  });

  it("streams the body and stops at the size limit even without content-length", async () => {
    let pulled = 0;
    const chunk = new TextEncoder().encode("x".repeat(1024 * 1024));
    const body = new ReadableStream<Uint8Array>({
      pull(controller) {
        pulled++;
        if (pulled > 50) controller.close();
        else controller.enqueue(chunk);
      },
    });
    const req = new Request("http://x/api", { method: "POST", body, headers: { "content-type": "application/json" }, duplex: "half" } as RequestInit);
    const res = await handleSuggest(req, deps());
    expect(res.status).toBe(413);
    expect(pulled).toBeLessThan(12);
  });

  it("charges the repair round against the rate limit", async () => {
    const bad = specToAIOutput(SPEC_TEMPLATES[0].spec, "");
    (bad.layers as unknown[]) = [{ mark: "bar", encoding: { x: { field: "ghost" } } }];
    const json = vi.fn().mockResolvedValue(bad);
    // One token: the first call spends it, so no repair call is made.
    const res = await handleSpec(post({ prompt: "x" }), deps({ limiter: new RateLimiter(1), provider: { name: "mock", model: "m", json } }));
    expect(res.status).toBe(502);
    expect(json).toHaveBeenCalledTimes(1);
    // Two tokens: first call + repair.
    const json2 = vi.fn().mockResolvedValue(bad);
    const limiter = new RateLimiter(2);
    await handleSpec(post({ prompt: "x" }), deps({ limiter, provider: { name: "mock", model: "m", json: json2 } }));
    expect(json2).toHaveBeenCalledTimes(2);
    expect(limiter.take("ip:1.2.3.4")).toBeGreaterThan(0);
  });
});

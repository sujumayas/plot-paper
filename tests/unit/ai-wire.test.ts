import { createServer, type IncomingMessage, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import Anthropic from "@anthropic-ai/sdk";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { readAIConfig } from "@/lib/ai/server/config";
import { handleSpec, type Deps } from "@/lib/ai/server/handlers";
import { specToAIOutput } from "@/lib/ai/server/mock";
import { createAnthropicProvider } from "@/lib/ai/server/provider";
import { RateLimiter } from "@/lib/ai/server/rateLimit";
import { SPEC_TEMPLATES } from "@/lib/viz/spec/templates";

/**
 * Runs the real Anthropic SDK against a local HTTP server to verify what goes
 * over the wire (endpoint, headers, body) and how real HTTP errors are handled.
 */
type Captured = { url: string; headers: IncomingMessage["headers"]; body: Record<string, unknown> };
const captured: Captured[] = [];
let reply: (n: number) => { status: number; body: unknown } = () => ({ status: 500, body: {} });
let server: Server;
let baseURL = "";

beforeAll(async () => {
  server = createServer((req, res) => {
    let raw = "";
    req.on("data", (c) => (raw += c));
    req.on("end", () => {
      captured.push({ url: req.url ?? "", headers: req.headers, body: JSON.parse(raw || "{}") });
      const r = reply(captured.length);
      res.writeHead(r.status, { "content-type": "application/json", "request-id": "req_test" });
      res.end(JSON.stringify(r.body));
    });
  });
  await new Promise<void>((ok) => server.listen(0, "127.0.0.1", ok));
  baseURL = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});
afterAll(() => server.close());

const message = (text: string) => ({
  id: "msg_1",
  type: "message",
  role: "assistant",
  model: "claude-opus-5-5",
  content: [{ type: "text", text }],
  stop_reason: "end_turn",
  stop_sequence: null,
  usage: { input_tokens: 10, output_tokens: 20 },
});

function provider(maxRetries = 0) {
  const config = { ...readAIConfig({ ANTHROPIC_API_KEY: "sk-ant-test-key" }), requireAuth: false };
  const client = new Anthropic({ apiKey: "sk-ant-test-key", baseURL, maxRetries, timeout: 5000 });
  return { config, provider: createAnthropicProvider(config, client) };
}

const deps = (): Deps => {
  const { config, provider: p } = provider();
  return { config, provider: p, getUserId: async () => null, limiter: new RateLimiter(0), clientKey: "t" };
};

const post = (body: unknown) => new Request("http://x", { method: "POST", body: JSON.stringify(body) });

describe("Anthropic wire format", () => {
  it("sends a well-formed beta request and parses the answer", async () => {
    captured.length = 0;
    reply = () => ({ status: 200, body: message(JSON.stringify(specToAIOutput(SPEC_TEMPLATES[1].spec, "ok"))) });
    const res = await handleSpec(post({ prompt: "diverging bars", locale: "es" }), deps());
    expect(res.status).toBe(200);
    expect((await res.json()).spec.name).toBe("Diverging bars");

    const req = captured[0];
    expect(req.url).toMatch(/^\/v1\/messages/);
    expect(req.headers["x-api-key"]).toBe("sk-ant-test-key");
    expect(String(req.headers["anthropic-beta"])).toContain("server-side-fallback-2026-07-01");
    expect(req.headers["anthropic-version"]).toBeDefined();
    expect(req.body.model).toBe("claude-opus-5-5");
    expect(req.body.fallbacks).toBe("default");
    expect(req.body).not.toHaveProperty("betas");
    expect(req.body.output_config).toMatchObject({ effort: "medium", format: { type: "json_schema" } });
    expect(req.body.max_tokens).toBe(16000);
    const messages = req.body.messages as { role: string; content: { type: string; text?: string }[] }[];
    expect(messages).toHaveLength(1);
    expect(messages[0].content.at(-1)?.text).toContain("Spanish");
    // The key never appears in the body.
    expect(JSON.stringify(req.body)).not.toContain("sk-ant-test-key");
  });

  it("maps a real 401 to a friendly error without leaking the key", async () => {
    reply = () => ({ status: 401, body: { type: "error", error: { type: "authentication_error", message: "invalid x-api-key" } } });
    const res = await handleSpec(post({ prompt: "x" }), deps());
    const body = await res.json();
    expect(res.status).toBe(502);
    expect(body.error).toMatch(/API key was rejected/);
    expect(JSON.stringify(body)).not.toContain("sk-ant");
  });

  it("maps a real 429 to rate_limited", async () => {
    reply = () => ({ status: 429, body: { type: "error", error: { type: "rate_limit_error", message: "slow down" } } });
    const res = await handleSpec(post({ prompt: "x" }), deps());
    expect(res.status).toBe(429);
  });

  it("retries transient 529 overloads (SDK retries) and succeeds", async () => {
    captured.length = 0;
    reply = (n) =>
      n === 1
        ? { status: 529, body: { type: "error", error: { type: "overloaded_error", message: "overloaded" } } }
        : { status: 200, body: message('{"ok":true}') };
    const { provider: p } = provider(2);
    expect(await p.json({ system: "s", text: "t", schema: { type: "object" }, task: "spec" })).toEqual({ ok: true });
    expect(captured).toHaveLength(2);
  });

  it("falls back to plain JSON mode when the schema is rejected", async () => {
    captured.length = 0;
    reply = (n) =>
      n === 1
        ? { status: 400, body: { type: "error", error: { type: "invalid_request_error", message: "output_config.format.schema: too complex" } } }
        : { status: 200, body: message('{"ok":2}') };
    const { provider: p } = provider();
    expect(await p.json({ system: "s", text: "t", schema: { type: "object" }, task: "spec" })).toEqual({ ok: 2 });
    expect((captured[1].body.output_config as Record<string, unknown>).format).toBeUndefined();
  });
});

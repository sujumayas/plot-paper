import Anthropic from "@anthropic-ai/sdk";
import type { AIError as AIErrorBody } from "../protocol";
import type { AIConfig } from "./config";

export class AIError extends Error {
  constructor(
    public code: AIErrorBody["code"],
    message: string,
    public status: number,
  ) {
    super(message);
  }
}

export type ImageInput = { mediaType: "image/png" | "image/jpeg" | "image/webp" | "image/gif"; data: string };

export interface JSONRequest {
  system: string;
  text: string;
  image?: ImageInput | null;
  schema: Record<string, unknown>;
  /** Identifies the task for providers that route on it (the mock). */
  task: "suggest" | "spec";
  /** Structured request data (used by the mock provider; ignored by Claude). */
  meta?: unknown;
}

export interface AIProvider {
  name: "anthropic" | "mock";
  model: string;
  json(req: JSONRequest): Promise<unknown>;
}

/** Minimal surface of the Anthropic client we use (lets tests inject a fake). */
export type AnthropicLike = Pick<Anthropic, "messages" | "beta">;

export function extractJSON(text: string): unknown {
  const cleaned = text
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    // Last resort: the outermost {...} block.
    const a = cleaned.indexOf("{");
    const b = cleaned.lastIndexOf("}");
    if (a >= 0 && b > a) {
      try {
        return JSON.parse(cleaned.slice(a, b + 1));
      } catch {
        /* fall through */
      }
    }
    throw new AIError("invalid_output", "The model returned something that isn't JSON.", 502);
  }
}

export function createAnthropicProvider(config: AIConfig, injected?: AnthropicLike): AIProvider {
  const client: AnthropicLike =
    injected ?? new Anthropic({ apiKey: config.apiKey ?? undefined, timeout: config.timeoutMs, maxRetries: 2 });

  async function call(req: JSONRequest, structured: boolean) {
    const content: Anthropic.ContentBlockParam[] = [];
    if (req.image) content.push({ type: "image", source: { type: "base64", media_type: req.image.mediaType, data: req.image.data } });
    content.push({ type: "text", text: req.text });
    const system = structured
      ? req.system
      : `${req.system}\n\nRespond with a single JSON object matching this JSON schema, and nothing else:\n${JSON.stringify(req.schema)}`;
    const params = {
      model: config.model,
      max_tokens: config.maxTokens,
      system: [{ type: "text" as const, text: system, cache_control: { type: "ephemeral" as const } }],
      messages: [{ role: "user" as const, content }],
      output_config: {
        effort: config.effort,
        ...(structured ? { format: { type: "json_schema" as const, schema: req.schema } } : {}),
      },
    };
    const msg = config.fallback
      ? await client.beta.messages.create({ ...params, betas: ["server-side-fallback-2026-07-01"], fallbacks: "default" })
      : await client.messages.create(params);
    if (msg.stop_reason === "refusal") throw new AIError("invalid_output", "Claude declined this request. Try rephrasing it.", 422);
    if (msg.stop_reason === "max_tokens") throw new AIError("invalid_output", "The answer was too long and got cut off. Try a simpler request.", 502);
    const text = (msg.content as { type: string; text?: string }[])
      .filter((b) => b.type === "text")
      .map((b) => b.text ?? "")
      .join("");
    if (!text.trim()) throw new AIError("invalid_output", "The model returned an empty answer.", 502);
    return extractJSON(text);
  }

  return {
    name: "anthropic",
    model: config.model,
    async json(req) {
      try {
        try {
          return await call(req, true);
        } catch (err) {
          // Some models/proxies reject structured outputs: retry once in plain JSON mode.
          if (err instanceof Anthropic.BadRequestError && /output_config|json_schema|schema|format/i.test(apiMessage(err))) {
            return await call(req, false);
          }
          throw err;
        }
      } catch (err) {
        throw toAIError(err);
      }
    },
  };
}

/** The API's own error text ("output_config.format…"), falling back to the SDK message. */
function apiMessage(err: InstanceType<typeof Anthropic.APIError>): string {
  const body = err.error as { error?: { message?: unknown } } | undefined;
  return typeof body?.error?.message === "string" ? body.error.message : err.message;
}

export function toAIError(err: unknown): AIError {
  if (err instanceof AIError) return err;
  if (err instanceof Anthropic.AuthenticationError || err instanceof Anthropic.PermissionDeniedError)
    return new AIError("upstream", "The server's Anthropic API key was rejected. Check ANTHROPIC_API_KEY.", 502);
  if (err instanceof Anthropic.RateLimitError) return new AIError("rate_limited", "Claude is busy right now (rate limited). Try again in a minute.", 429);
  if (err instanceof Anthropic.BadRequestError) return new AIError("bad_request", `Claude couldn't process the request: ${apiMessage(err)}`, 400);
  if (err instanceof Anthropic.APIConnectionTimeoutError) return new AIError("upstream", "Claude took too long to answer. Try again.", 504);
  if (err instanceof Anthropic.APIConnectionError) return new AIError("upstream", "Couldn't reach the Anthropic API.", 502);
  if (err instanceof Anthropic.InternalServerError) return new AIError("upstream", "Claude is temporarily unavailable. Try again.", 502);
  if (err instanceof Anthropic.APIError) return new AIError("upstream", `Anthropic API error (${err.status ?? "?"}).`, 502);
  return new AIError("upstream", err instanceof Error ? err.message : "Unknown AI error", 500);
}
